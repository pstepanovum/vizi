import { AudioPlayer, createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { CameraView as ExpoCameraView, useCameraPermissions } from 'expo-camera';
import * as Speech from 'expo-speech';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';
import { RefObject, useCallback, useEffect, useRef, useState } from 'react';

import { SessionStatus } from '@/features/session/session-status';
import { matchVoiceCommand } from '@/features/voice/voice-commands';
import { hasFishAudioKey, synthesizeSpeech } from '@/lib/fish-audio/client';
import { askGemini, ChatTurn, hasGeminiKey } from '@/lib/gemini/client';
import { DESCRIBE_SCENE_PROMPT } from '@/lib/gemini/prompts';
import { languageTag, t } from '@/lib/i18n';

const MAX_HISTORY_TURNS = 12;
// Speech recognition language. Unset = the device's language, so the agent
// listens in whatever language the user's phone speaks. Override with e.g.
// EXPO_PUBLIC_SPEECH_LANG=es-ES for a fixed language.
const SPEECH_LANG = process.env.EXPO_PUBLIC_SPEECH_LANG;
// Ambient narration: describe the scene shortly after start, then again
// whenever the session sits idle in "listening" for this long.
const FIRST_DESCRIBE_DELAY_MS = 1500;
const AUTO_DESCRIBE_INTERVAL_MS = 12000;
// Don't start an ambient description if the user spoke this recently —
// they are probably mid-question.
const RECENT_SPEECH_WINDOW_MS = 4000;
// Continuous frame sampling while idle: a fresh frame is always ready, so a
// turn never waits on the camera.
const FRAME_SAMPLE_INTERVAL_MS = 2500;
const FRAME_FRESHNESS_MS = 5000;
// Ambient narration is skipped when the sampled JPEG size is within this
// ratio of the last-described frame — same scene produces near-identical
// sizes, a new scene shifts them well beyond it.
const SCENE_CHANGE_SIZE_RATIO = 0.05;
// The iOS recognizer throws transient errors (busy restarts, brief network
// blips to the dictation service). Only surface "error" after this many in a
// row — isolated ones just restart quietly.
const MAX_CONSECUTIVE_RECOGNITION_ERRORS = 3;
// Eager endpointing: Apple waits 800-1500ms of silence before finalizing a
// transcript. If interim results stop changing for this long, force
// finalization ourselves — OpenAI's realtime default silence window is 500ms.
const EAGER_ENDPOINT_MS = 650;
// How long to wait for an in-flight pre-captured frame before falling back to
// the rolling sampled frame.
const PENDING_FRAME_GRACE_MS = 120;

function log(...parts: unknown[]) {
  console.log('[vizi:agent]', ...parts);
}

// Preloaded "heard you" earcon — fires the instant a turn starts so the user
// gets sub-150ms acknowledgment even while the model thinks. For blind users
// the visual "Thinking…" pill is no feedback at all; this is the accessibility
// pattern Siri/Alexa use.
const ackPlayer = createAudioPlayer(require('../../../assets/sounds/ack.wav'));

function playAck() {
  try {
    ackPlayer.seekTo(0);
    ackPlayer.play();
  } catch {
    // Earcon is best-effort — never let it break a turn.
  }
}

// Fish Audio pacing tags like (break)/(breath) are for the voice only —
// strip them from transcript display and conversation history.
function stripAudioTags(text: string): string {
  return text.replace(/\((?:break|long-break|breath)\)\s?/gi, '').trim();
}

// Echo guard for barge-in: with hardware AEC the mic should not hear Vizi,
// but if fragments leak through, ignore transcripts that are just pieces of
// what Vizi is currently saying.
function looksLikeEcho(transcript: string, speakingText: string | null): boolean {
  if (!speakingText) {
    return false;
  }
  const normalize = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, '').trim();
  const heard = normalize(transcript);
  if (heard.length < 4) {
    return true;
  }
  return normalize(speakingText).includes(heard);
}

type VoiceAgentOptions = {
  cameraRef: RefObject<ExpoCameraView | null>;
  muted: boolean;
};

export type TranscriptEntry = {
  id: number;
  speaker: 'user' | 'vizi';
  text: string;
};

export function useVoiceAgent({ cameraRef, muted }: VoiceAgentOptions) {
  const [cameraPermission] = useCameraPermissions();
  const [status, setStatus] = useState<SessionStatus>('connecting');
  const [lastAnswer, setLastAnswer] = useState<string | null>(null);
  const [lastQuestion, setLastQuestion] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);

  const appendTranscript = useCallback((speaker: 'user' | 'vizi', text: string) => {
    // Derive the id from current state so ids stay unique even across
    // fast-refresh reloads (a module counter would reset and collide).
    setTranscript((entries) => [
      ...entries,
      { id: (entries[entries.length - 1]?.id ?? 0) + 1, speaker, text },
    ]);
  }, []);

  const historyRef = useRef<ChatTurn[]>([]);
  const playerRef = useRef<AudioPlayer | null>(null);
  const pendingFrameRef = useRef<Promise<string | undefined> | null>(null);
  const latestFrameRef = useRef<{ base64: string; capturedAt: number } | null>(null);
  const describeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startingRef = useRef(false);
  const eagerEndpointTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const speakingTextRef = useRef<string | null>(null);
  const lastAnswerRef = useRef<string | null>(null);
  const narrationPausedRef = useRef(false);
  const lastDescribedFrameSizeRef = useRef<number | null>(null);
  const recognitionRunningRef = useRef(false);
  const recognitionErrorsRef = useRef(0);
  const lastSpeechAtRef = useRef(0);
  const hasDescribedRef = useRef(false);
  const statusRef = useRef(status);
  const mutedRef = useRef(muted);
  statusRef.current = status;
  mutedRef.current = muted;

  const startListening = useCallback(async ({ forBargeIn = false } = {}) => {
    if (mutedRef.current) {
      log('startListening skipped — microphone muted');
      return;
    }
    if (recognitionRunningRef.current || startingRef.current) {
      if (!forBargeIn && statusRef.current !== 'listening') {
        setStatus('listening');
      }
      return;
    }
    startingRef.current = true;
    try {
      const permission = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!permission.granted) {
        log('speech recognition permission denied');
        setStatus('needs_permission');
        return;
      }
      // One constant audio session for the whole conversation — same category,
      // same voice processing, every start. This is how realtime agents keep a
      // steady output level: iOS never reconfigures the session, so the volume
      // never shifts when the mic engages. (Voice processing = hardware echo
      // cancellation, so the barge-in listener never hears Vizi itself.)
      ExpoSpeechRecognitionModule.start({
        ...(SPEECH_LANG ? { lang: SPEECH_LANG } : {}),
        interimResults: true,
        continuous: true,
        iosCategory: {
          category: 'playAndRecord',
          categoryOptions: ['defaultToSpeaker', 'allowBluetooth'],
          mode: 'default',
        },
        iosVoiceProcessingEnabled: true,
      });
      recognitionRunningRef.current = true;
      log(forBargeIn ? 'barge-in listener started' : 'listening started');
      if (!forBargeIn) {
        setStatus('listening');
      }
    } catch (error) {
      log('failed to start listening:', error);
      if (!forBargeIn) {
        setStatus('error');
      }
    } finally {
      startingRef.current = false;
    }
  }, []);

  const clearEagerEndpoint = useCallback(() => {
    if (eagerEndpointTimerRef.current) {
      clearTimeout(eagerEndpointTimerRef.current);
      eagerEndpointTimerRef.current = null;
    }
  }, []);

  const stopListening = useCallback(() => {
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
    clearEagerEndpoint();
    try {
      ExpoSpeechRecognitionModule.stop();
    } catch {
      // Recognizer may already be stopped — nothing to do.
    }
  }, [clearEagerEndpoint]);

  // Single funnel for restarting recognition — prevents the "end" and error
  // handlers from double-starting the recognizer (which itself errors).
  const scheduleRestart = useCallback(
    (delayMs = 250) => {
      if (restartTimerRef.current) {
        return;
      }
      restartTimerRef.current = setTimeout(() => {
        restartTimerRef.current = null;
        if (mutedRef.current) {
          return;
        }
        if (statusRef.current === 'listening') {
          startListening();
        } else if (statusRef.current === 'speaking') {
          startListening({ forBargeIn: true });
        }
      }, delayMs);
    },
    [startListening],
  );

  const stopPlayback = useCallback(() => {
    Speech.stop();
    speakingTextRef.current = null;
    const player = playerRef.current;
    playerRef.current = null;
    if (player) {
      try {
        player.pause();
        player.release();
      } catch {
        // Player already released.
      }
    }
  }, []);

  const captureFrame = useCallback(async (): Promise<string | undefined> => {
    const startedAt = Date.now();
    try {
      const photo = await cameraRef.current?.takePictureAsync({
        base64: true,
        quality: 0.5,
        skipProcessing: true,
        shutterSound: false,
      });
      if (photo?.base64) {
        log(`frame captured in ${Date.now() - startedAt}ms (${Math.round(photo.base64.length / 1024)}kb)`);
        return photo.base64;
      }
      log('frame capture returned no data');
      return undefined;
    } catch (error) {
      log('frame capture failed:', error);
      return undefined;
    }
  }, [cameraRef]);

  const speakWithSystemVoice = useCallback(
    (text: string) => {
      log('speaking with OS voice');
      const english = (SPEECH_LANG ?? languageTag).startsWith('en');
      Speech.speak(text, {
        // Pin one English voice for consistency; for other languages let iOS
        // pick the correct voice for the text.
        ...(english
          ? { language: 'en-US', voice: 'com.apple.voice.compact.en-US.Samantha' }
          : {}),
        onDone: () => {
          log('OS voice playback finished');
          startListening();
        },
        onStopped: () => {
          startListening();
        },
        onError: (error) => {
          log('OS voice playback error:', error);
          startListening();
        },
      });
    },
    [startListening],
  );

  // Prefer Fish Audio for natural low-latency speech; fall back to the OS voice.
  // The recognizer keeps running during playback (with echo cancellation) so
  // the user can interrupt — playback stays in the recognizer's
  // playAndRecord + defaultToSpeaker session; no mode switch needed.
  const speak = useCallback(
    async (text: string) => {
      stopPlayback();
      setStatus('speaking');
      speakingTextRef.current = text;
      if (hasFishAudioKey()) {
        try {
          const uri = await synthesizeSpeech(text);
          const player = createAudioPlayer({ uri });
          player.volume = 1.0;
          playerRef.current = player;
          player.addListener('playbackStatusUpdate', (playbackStatus) => {
            if (playbackStatus.didJustFinish && playerRef.current === player) {
              log('Fish Audio playback finished');
              playerRef.current = null;
              speakingTextRef.current = null;
              player.release();
              startListening();
            }
          });
          player.play();
          // Barge-in: listen while speaking.
          startListening({ forBargeIn: true });
          return;
        } catch (error) {
          console.warn('[vizi:agent] Fish Audio TTS failed, falling back to OS voice:', error);
        }
      }
      speakWithSystemVoice(text);
    },
    [speakWithSystemVoice, startListening, stopPlayback],
  );

  const runTurn = useCallback(
    async (question: string, { ambient = false } = {}) => {
      stopListening();
      setStatus('thinking');
      if (!ambient) {
        // Instant "heard you" feedback while the model works.
        playAck();
      }
      if (!ambient) {
        // A real question re-engages the companion — resume ambient narration.
        narrationPausedRef.current = false;
      }
      log(`turn started (${ambient ? 'ambient description' : 'user question'}): "${question}"`);
      const turnStartedAt = Date.now();
      try {
        // Frame priority: one pre-captured while the user was speaking (raced
        // against a short grace window so a slow capture can't stall the turn),
        // else the continuously-sampled latest frame if fresh, else capture now.
        const pendingFrame = pendingFrameRef.current;
        pendingFrameRef.current = null;
        const sampled = latestFrameRef.current;
        const sampledFresh =
          sampled && Date.now() - sampled.capturedAt < FRAME_FRESHNESS_MS
            ? sampled.base64
            : undefined;
        const racedPending = pendingFrame
          ? await Promise.race([
              pendingFrame,
              new Promise<undefined>((resolve) =>
                setTimeout(() => resolve(undefined), sampledFresh ? PENDING_FRAME_GRACE_MS : 5000),
              ),
            ])
          : undefined;
        const frameBase64 = racedPending ?? sampledFresh ?? (await captureFrame());
        if (ambient && frameBase64) {
          lastDescribedFrameSizeRef.current = frameBase64.length;
        }
        const answer = await askGemini({
          question,
          frameBase64,
          history: historyRef.current,
        });
        if (ambient && answer.trim().toUpperCase().includes('SAME_SCENE')) {
          // Model confirms nothing meaningfully changed — stay quiet.
          log('ambient: scene unchanged (model)');
          startListening();
          return;
        }
        const displayAnswer = stripAudioTags(answer);
        const newTurns: ChatTurn[] = [
          { role: 'user', text: question },
          { role: 'model', text: displayAnswer },
        ];
        historyRef.current = [...historyRef.current, ...newTurns].slice(-MAX_HISTORY_TURNS);
        setLastAnswer(answer);
        lastAnswerRef.current = answer;
        if (!ambient) {
          setLastQuestion(question);
          appendTranscript('user', question);
        }
        appendTranscript('vizi', displayAnswer);
        log(`turn answered in ${Date.now() - turnStartedAt}ms`);
        await speak(answer);
      } catch (error) {
        console.warn('[vizi:agent] turn failed:', error);
        if (ambient) {
          // Ambient narration failing should not interrupt the session loop.
          startListening();
          return;
        }
        setStatus('error');
        await speak(t('agentError'));
      }
    },
    [appendTranscript, captureFrame, speak, startListening, stopListening],
  );

  useSpeechRecognitionEvent('result', (event) => {
    // Barge-in: the user talked over Vizi. Cut playback and treat the rest of
    // the utterance as a normal question.
    if (statusRef.current === 'speaking') {
      const heard = event.results?.[0]?.transcript?.trim();
      if (!heard || looksLikeEcho(heard, speakingTextRef.current)) {
        return;
      }
      log(`barge-in: "${heard}"`);
      stopPlayback();
      setStatus('listening');
      // Fall through to normal listening handling below.
    } else if (statusRef.current !== 'listening') {
      return;
    }
    lastSpeechAtRef.current = Date.now();
    recognitionErrorsRef.current = 0;
    const transcript = event.results?.[0]?.transcript?.trim();
    if (event.isFinal && transcript) {
      clearEagerEndpoint();
      // Local command intents — handled instantly, nothing sent to the model.
      const command = matchVoiceCommand(transcript);
      if (command === 'stop') {
        log(`voice command: stop ("${transcript}") — pausing ambient narration`);
        narrationPausedRef.current = true;
        stopPlayback();
        startListening();
        return;
      }
      if (command === 'repeat') {
        log(`voice command: repeat ("${transcript}")`);
        stopListening();
        speak(lastAnswerRef.current ?? t('noAnswerYet'));
        return;
      }
      log(`heard: "${transcript}"`);
      runTurn(transcript);
      return;
    }
    if (transcript) {
      // User is talking — grab a frame now so it's ready by the time they
      // finish the question.
      if (!pendingFrameRef.current) {
        log('pre-capturing frame while user speaks');
        pendingFrameRef.current = captureFrame();
      }
      // Eager endpointing: if the interim transcript stops changing for
      // EAGER_ENDPOINT_MS, force finalization instead of waiting out Apple's
      // longer built-in silence window. stop() makes isFinal fire promptly.
      clearEagerEndpoint();
      eagerEndpointTimerRef.current = setTimeout(() => {
        eagerEndpointTimerRef.current = null;
        if (statusRef.current === 'listening') {
          log('eager endpoint — forcing finalization');
          try {
            ExpoSpeechRecognitionModule.stop();
          } catch {
            // Recognizer already stopping.
          }
        }
      }, EAGER_ENDPOINT_MS);
    }
  });

  useSpeechRecognitionEvent('start', () => {
    recognitionRunningRef.current = true;
  });

  useSpeechRecognitionEvent('end', () => {
    recognitionRunningRef.current = false;
    // The OS recognizer times out on silence; keep the session (and the
    // barge-in listener while speaking) alive. Restart lazily while speaking —
    // each session (re)start briefly dips playback volume, so fewer restarts
    // means steadier audio.
    if (statusRef.current === 'listening') {
      scheduleRestart();
    } else if (statusRef.current === 'speaking') {
      scheduleRestart(1200);
    }
  });

  useSpeechRecognitionEvent('error', (event) => {
    recognitionRunningRef.current = false;
    if (statusRef.current === 'speaking') {
      // Keep the barge-in listener alive through recognizer hiccups — lazily,
      // to avoid audible session-restart dips in the playback.
      scheduleRestart(1200);
      return;
    }
    if (statusRef.current !== 'listening') {
      return;
    }
    if (event.error === 'no-speech') {
      scheduleRestart();
      return;
    }
    recognitionErrorsRef.current += 1;
    log(
      `speech recognition error (${recognitionErrorsRef.current}/${MAX_CONSECUTIVE_RECOGNITION_ERRORS}):`,
      event.error,
      event.message,
    );
    if (recognitionErrorsRef.current >= MAX_CONSECUTIVE_RECOGNITION_ERRORS) {
      setStatus('error');
      return;
    }
    // Transient (busy restart, brief dictation-service blip) — retry quietly.
    scheduleRestart(500);
  });

  // Continuous frame sampler: while listening, keep the latest frame warm so
  // answers never wait on the camera.
  useEffect(() => {
    if (status !== 'listening') {
      return;
    }
    const interval = setInterval(async () => {
      if (statusRef.current !== 'listening') {
        return;
      }
      const base64 = await captureFrame();
      if (base64) {
        latestFrameRef.current = { base64, capturedAt: Date.now() };
      }
    }, FRAME_SAMPLE_INTERVAL_MS);
    return () => {
      clearInterval(interval);
    };
  }, [status, captureFrame]);

  // Ambient narration loop: whenever the session is idle in "listening",
  // periodically consider describing the scene. "Consider" — it self-re-arms
  // and skips silently when the user said stop, spoke recently, or the camera
  // is still looking at the same thing (frame-size gate: JPEG size is a cheap
  // stable proxy for scene content — unchanged scenes vary <2%).
  useEffect(() => {
    const armAmbient = (delay: number) => {
      if (describeTimerRef.current) {
        clearTimeout(describeTimerRef.current);
      }
      describeTimerRef.current = setTimeout(() => {
        describeTimerRef.current = null;
        if (statusRef.current !== 'listening' || mutedRef.current) {
          return;
        }
        if (narrationPausedRef.current) {
          armAmbient(AUTO_DESCRIBE_INTERVAL_MS);
          return;
        }
        if (Date.now() - lastSpeechAtRef.current < RECENT_SPEECH_WINDOW_MS) {
          log('ambient deferred — user spoke recently');
          armAmbient(RECENT_SPEECH_WINDOW_MS);
          return;
        }
        const currentSize = latestFrameRef.current?.base64.length ?? null;
        const lastSize = lastDescribedFrameSizeRef.current;
        if (
          currentSize !== null &&
          lastSize !== null &&
          Math.abs(currentSize - lastSize) / lastSize < SCENE_CHANGE_SIZE_RATIO
        ) {
          log('ambient skipped — scene unchanged (frame size)');
          armAmbient(AUTO_DESCRIBE_INTERVAL_MS);
          return;
        }
        hasDescribedRef.current = true;
        runTurn(`${DESCRIBE_SCENE_PROMPT} (Device language: ${languageTag})`, { ambient: true });
      }, delay);
    };

    if (describeTimerRef.current) {
      clearTimeout(describeTimerRef.current);
      describeTimerRef.current = null;
    }
    if (status !== 'listening' || muted) {
      return;
    }
    const delay = hasDescribedRef.current ? AUTO_DESCRIBE_INTERVAL_MS : FIRST_DESCRIBE_DELAY_MS;
    log(`ambient description scheduled in ${delay}ms`);
    armAmbient(delay);
    return () => {
      if (describeTimerRef.current) {
        clearTimeout(describeTimerRef.current);
        describeTimerRef.current = null;
      }
    };
  }, [status, muted, runTurn]);

  // Session bootstrap: wait for camera permission, then open the mic.
  useEffect(() => {
    if (!cameraPermission) {
      return;
    }
    if (!cameraPermission.granted) {
      log('camera permission not granted yet');
      setStatus('needs_permission');
      return;
    }
    if (!hasGeminiKey()) {
      console.warn('[vizi:agent] EXPO_PUBLIC_GEMINI_API_KEY is not set');
      setStatus('error');
      return;
    }
    log(`session starting (fish audio: ${hasFishAudioKey() ? 'enabled' : 'disabled, using OS voice'})`);
    setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});
    startListening();
    return () => {
      stopPlayback();
      stopListening();
    };
  }, [cameraPermission, startListening, stopListening, stopPlayback]);

  // The error state self-recovers: after a short pause, reset and listen again.
  useEffect(() => {
    if (status !== 'error') {
      return;
    }
    const timer = setTimeout(() => {
      if (statusRef.current !== 'error' || mutedRef.current) {
        return;
      }
      log('auto-recovering from error state');
      recognitionErrorsRef.current = 0;
      setStatus('connecting');
      startListening();
    }, 4000);
    return () => {
      clearTimeout(timer);
    };
  }, [status, startListening]);

  // Mute / unmute the microphone without tearing the session down.
  useEffect(() => {
    if (muted) {
      log('microphone muted');
      stopListening();
      return;
    }
    if (statusRef.current === 'listening' || statusRef.current === 'connecting') {
      log('microphone unmuted');
      startListening();
    }
  }, [muted, startListening, stopListening]);

  const repeatLastAnswer = useCallback(() => {
    log('repeat last answer requested');
    stopListening();
    if (!lastAnswer) {
      speak(t('noAnswerYet'));
      return;
    }
    speak(lastAnswer);
  }, [lastAnswer, speak, stopListening]);

  // Re-run the last question against whatever the camera sees right now.
  const askAgain = useCallback(() => {
    log('ask-again requested');
    stopPlayback();
    if (!lastQuestion) {
      stopListening();
      speak(t('noQuestionYet'));
      return;
    }
    runTurn(lastQuestion);
  }, [lastQuestion, runTurn, speak, stopListening, stopPlayback]);

  return { status, lastAnswer, repeatLastAnswer, askAgain, transcript };
}
