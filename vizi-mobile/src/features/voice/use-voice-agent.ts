import { AudioPlayer, createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { CameraView as ExpoCameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import * as Speech from 'expo-speech';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';
import { RefObject, useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { useFocusEffect } from 'expo-router';

import { SessionStatus } from '@/features/session/session-status';
import { matchVoiceCommand } from '@/features/voice/voice-commands';
import { isPlus, useCustomerInfo } from '@/lib/purchases';
import { getSettings } from '@/lib/settings';
import { recordQuestion, remainingFreeQuestions } from '@/lib/usage';
import { hasFishAudioKey, synthesizeSpeech } from '@/lib/fish-audio/client';
import { askGemini, askGeminiStream, ChatTurn, hasGeminiKey } from '@/lib/gemini/client';
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
// Recognition lags playback — Vizi's own words can be transcribed up to this
// long after its audio stopped. Anything echo-like inside the window is
// discarded.
const ECHO_TAIL_MS = 2000;
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

// Instant "heard you" acknowledgment: a light haptic tap the moment a turn
// starts — silent (no earcon that could read as a system recording sound),
// but still sub-150ms feedback while the model thinks.
function playAck() {
  if (!getSettings().haptics) {
    return;
  }
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

// Fish Audio pacing tags like (break)/(breath) are for the voice only —
// strip them from transcript display and conversation history.
function stripAudioTags(text: string): string {
  return text.replace(/\((?:break|long-break|breath)\)\s?/gi, '').trim();
}

function normalizeSpeech(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Echo guard: hardware AEC reduces how much of Vizi's own voice reaches the
// mic, but fragments leak through (and full sentences can arrive with a ~1s
// recognition delay, after playback already ended). Treat any transcript that
// is a piece of what Vizi recently said as echo.
function looksLikeEcho(transcript: string, spokenText: string | null): boolean {
  if (!spokenText) {
    return false;
  }
  const heard = normalizeSpeech(transcript);
  if (heard.length < 4) {
    return true;
  }
  return normalizeSpeech(spokenText).includes(heard);
}

// New words in `full` beyond the already-consumed `base`, compared on
// normalized words so iOS punctuation/casing revisions don't break alignment.
function transcriptDelta(base: string, full: string): string {
  if (!base) {
    return full.trim();
  }
  const baseWords = normalizeSpeech(base).split(' ').filter(Boolean);
  const fullNorm = normalizeSpeech(full).split(' ').filter(Boolean);
  const fullRaw = full.split(/\s+/).filter(Boolean);
  if (fullNorm.length >= baseWords.length) {
    // Slice by consumed word count. Even when iOS revises an earlier word
    // (breaking exact prefix match), the count of already-consumed words is
    // stable — never replay the full transcript, that loops old speech.
    return fullRaw.slice(baseWords.length).join(' ').trim();
  }
  // Transcript got shorter than what was consumed — treat it all as new.
  return full.trim();
}

// Echo often rides on the END of a real utterance (the recognizer appends
// Vizi's first words to the user's sentence). Trim any suffix of `text` that
// matches a leading chunk of what Vizi said.
function trimEchoSuffix(text: string, spokenText: string): string {
  const rawWords = text.split(/\s+/).filter(Boolean);
  const textNorm = normalizeSpeech(text).split(' ').filter(Boolean);
  const spokenNorm = normalizeSpeech(spokenText).split(' ').filter(Boolean);
  const maxK = Math.min(textNorm.length, spokenNorm.length);
  for (let k = maxK; k >= 2; k--) {
    const suffix = textNorm.slice(textNorm.length - k);
    const prefix = spokenNorm.slice(0, k);
    if (suffix.every((word, i) => word === prefix[i])) {
      return rawWords.slice(0, rawWords.length - k).join(' ').trim();
    }
  }
  return text;
}

type VoiceAgentOptions = {
  cameraRef: RefObject<ExpoCameraView | null>;
  muted: boolean;
};

// Sentence-pipelined playback for streamed answers: sentence N plays while
// sentence N+1 synthesizes and the model still generates N+2.
type StreamQueue = {
  turnId: number;
  sentences: string[];
  uris: (string | 'failed' | null)[];
  nextPlay: number;
  nextSynth: number;
  synthBusy: boolean;
  streamDone: boolean;
  spoken: string;
};

export type TranscriptEntry = {
  id: number;
  speaker: 'user' | 'vizi';
  text: string;
};

export function useVoiceAgent({ cameraRef, muted }: VoiceAgentOptions) {
  const [cameraPermission] = useCameraPermissions();
  const [focused, setFocused] = useState(true);
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, []),
  );
  const customerInfo = useCustomerInfo();
  const plusRef = useRef(false);
  plusRef.current = isPlus(customerInfo);
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
  const lastSpokenRef = useRef<{ text: string; expiresAt: number } | null>(null);
  const prevUtteranceBaseRef = useRef('');
  const lastAnswerRef = useRef<string | null>(null);
  const narrationPausedRef = useRef(false);
  const lastDescribedFrameSizeRef = useRef<number | null>(null);
  const appActiveRef = useRef(AppState.currentState === 'active');
  const focusedRef = useRef(true);
  // Monotonic turn id — bumping it cancels any in-flight turn (its async
  // stages check staleness before acting), OpenAI-response-cancel style.
  const turnIdRef = useRef(0);
  // The recognizer runs continuously and its transcript accumulates across a
  // session; consumed utterances are tracked as a prefix so each turn only
  // sees the new words.
  const utteranceBaseRef = useRef('');
  const latestTranscriptRef = useRef('');
  const recognitionRunningRef = useRef(false);
  const recognitionErrorsRef = useRef(0);
  const lastSpeechAtRef = useRef(0);
  const hasDescribedRef = useRef(false);
  const statusRef = useRef(status);
  const mutedRef = useRef(muted);
  statusRef.current = status;
  mutedRef.current = muted;

  const startListening = useCallback(async ({ forBargeIn = false } = {}) => {
    if (!appActiveRef.current || !focusedRef.current) {
      log('startListening skipped — app in background or screen unfocused');
      return;
    }
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

  const streamQueueRef = useRef<StreamQueue | null>(null);
  const streamPlayNextRef = useRef<() => void>(() => {});
  const streamSynthNextRef = useRef<() => void>(() => {});

  const stopPlayback = useCallback(() => {
    Speech.stop();
    streamQueueRef.current = null;
    if (speakingTextRef.current) {
      // Echo of what was already played may still arrive from the recognizer.
      lastSpokenRef.current = {
        text: speakingTextRef.current,
        expiresAt: Date.now() + ECHO_TAIL_MS,
      };
    }
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
      // Store the tag-stripped version — echo comparisons run against what is
      // actually audible, and the (break)/(breath) tags are not spoken.
      speakingTextRef.current = stripAudioTags(text);
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
              if (speakingTextRef.current) {
                lastSpokenRef.current = {
                  text: speakingTextRef.current,
                  expiresAt: Date.now() + ECHO_TAIL_MS,
                };
              }
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

  // --- Streamed-sentence playback workers (self-referencing via refs) ---

  streamPlayNextRef.current = () => {
    const q = streamQueueRef.current;
    if (!q) {
      return;
    }
    if (turnIdRef.current !== q.turnId) {
      streamQueueRef.current = null;
      return;
    }
    if (playerRef.current) {
      return;
    }
    if (q.nextPlay >= q.sentences.length) {
      if (q.streamDone && !q.synthBusy && q.nextSynth >= q.sentences.length) {
        streamQueueRef.current = null;
        if (q.spoken) {
          lastSpokenRef.current = { text: q.spoken, expiresAt: Date.now() + ECHO_TAIL_MS };
        }
        speakingTextRef.current = null;
        log('streamed playback finished');
        startListening();
      }
      return;
    }
    const uri = q.uris[q.nextPlay];
    if (uri === 'failed') {
      q.nextPlay += 1;
      streamPlayNextRef.current();
      return;
    }
    if (!uri) {
      return; // synthesis will call back when ready
    }
    const sentence = q.sentences[q.nextPlay];
    q.nextPlay += 1;
    q.spoken = `${q.spoken} ${stripAudioTags(sentence)}`.trim();
    speakingTextRef.current = q.spoken;
    const player = createAudioPlayer({ uri });
    player.volume = 1.0;
    playerRef.current = player;
    player.addListener('playbackStatusUpdate', (playbackStatus) => {
      if (playbackStatus.didJustFinish && playerRef.current === player) {
        playerRef.current = null;
        player.release();
        streamPlayNextRef.current();
      }
    });
    player.play();
  };

  streamSynthNextRef.current = async () => {
    const q = streamQueueRef.current;
    if (!q || q.synthBusy || turnIdRef.current !== q.turnId) {
      return;
    }
    const index = q.nextSynth;
    if (index >= q.sentences.length) {
      streamPlayNextRef.current();
      return;
    }
    q.synthBusy = true;
    try {
      const uri = await synthesizeSpeech(q.sentences[index]);
      if (streamQueueRef.current === q) {
        q.uris[index] = uri;
      }
    } catch (error) {
      console.warn('[vizi:agent] sentence synthesis failed:', error);
      if (streamQueueRef.current === q) {
        q.uris[index] = 'failed';
      }
    } finally {
      if (streamQueueRef.current === q) {
        q.nextSynth = index + 1;
        q.synthBusy = false;
      }
    }
    streamPlayNextRef.current();
    streamSynthNextRef.current();
  };

  const streamEnqueue = useCallback(
    (turnId: number, sentence: string) => {
      let q = streamQueueRef.current;
      if (!q || q.turnId !== turnId) {
        q = {
          turnId,
          sentences: [],
          uris: [],
          nextPlay: 0,
          nextSynth: 0,
          synthBusy: false,
          streamDone: false,
          spoken: '',
        };
        streamQueueRef.current = q;
        setStatus('speaking');
        startListening({ forBargeIn: true });
      }
      q.sentences.push(sentence);
      q.uris.push(null);
      streamSynthNextRef.current();
    },
    [startListening],
  );

  const runTurn = useCallback(
    async (question: string, { ambient = false } = {}) => {
      // Recognition keeps running through the whole turn — no stop/start
      // clicks, and the user can interrupt at any stage. If they do, the turn
      // id moves on and this turn quietly discards itself.
      // Free-plan daily cap: questions beyond the limit get a spoken upgrade
      // notice instead of a Gemini call. Voice commands stay free; Plus is
      // unlimited.
      if (!ambient && !plusRef.current) {
        if (remainingFreeQuestions() <= 0) {
          log('free daily limit reached — question blocked');
          speak(t('freeLimitReached'));
          return;
        }
        recordQuestion();
      }
      const turnId = ++turnIdRef.current;
      const isStale = () => turnIdRef.current !== turnId;
      clearEagerEndpoint();
      stopPlayback();
      setStatus('thinking');
      if (!ambient) {
        // Instant "heard you" feedback while the model works.
        playAck();
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
        if (isStale()) {
          log('turn canceled during frame stage');
          return;
        }
        if (ambient && frameBase64) {
          lastDescribedFrameSizeRef.current = frameBase64.length;
        }
        // User questions stream: first sentence starts speaking while the
        // rest of the answer is still generating. Ambient descriptions stay
        // non-streaming (SAME_SCENE gate needs the full text first).
        const streaming = !ambient && hasFishAudioKey();
        let sentencesEmitted = 0;
        let answer: string;
        if (streaming) {
          try {
            answer = await askGeminiStream({
              question,
              frameBase64,
              history: historyRef.current,
              isCanceled: isStale,
              onSentence: (sentence) => {
                if (!isStale()) {
                  sentencesEmitted += 1;
                  streamEnqueue(turnId, sentence);
                }
              },
            });
          } catch (error) {
            if (isStale()) {
              return;
            }
            if (sentencesEmitted > 0) {
              throw error;
            }
            log('streaming failed, falling back to non-streaming:', error);
            answer = await askGemini({ question, frameBase64, history: historyRef.current });
          }
        } else {
          answer = await askGemini({ question, frameBase64, history: historyRef.current });
        }
        if (isStale()) {
          log('turn canceled — user spoke while thinking, answer discarded');
          return;
        }
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
        if (streaming && sentencesEmitted > 0) {
          // Playback already running via the sentence queue — just mark the
          // stream complete so it can finish and hand back to listening.
          const q = streamQueueRef.current;
          if (q && q.turnId === turnId) {
            q.streamDone = true;
            streamPlayNextRef.current();
          }
        } else {
          await speak(answer);
        }
      } catch (error) {
        if (isStale()) {
          return;
        }
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
    [appendTranscript, captureFrame, clearEagerEndpoint, speak, startListening, stopPlayback],
  );

  // Consume the new words since the last consumed utterance and run a turn —
  // the recognizer itself is never stopped, so there are no session
  // start/stop sounds and no dead time between turns.
  const consumeUtterance = useCallback(
    (fullTranscript: string) => {
      let effective = transcriptDelta(utteranceBaseRef.current, fullTranscript);
      // Same echo defenses as the interim path — the consumed utterance must
      // never contain Vizi's own words.
      const tail = lastSpokenRef.current;
      const echoSource =
        speakingTextRef.current ?? (tail && Date.now() < tail.expiresAt ? tail.text : null);
      if (echoSource && effective) {
        if (looksLikeEcho(effective, echoSource)) {
          utteranceBaseRef.current = fullTranscript;
          log(`ignored own-voice echo at consume: "${effective.slice(0, 60)}"`);
          return;
        }
        effective = trimEchoSuffix(effective, echoSource);
      }
      // Remember the pre-consume base: if the user keeps talking while this
      // turn is thinking, the turn is canceled and the base rolls back so the
      // next consume includes the whole utterance, not just the tail fragment.
      prevUtteranceBaseRef.current = utteranceBaseRef.current;
      utteranceBaseRef.current = fullTranscript;
      if (!effective) {
        return;
      }
      // Local command intents — handled instantly, nothing sent to the model.
      const command = matchVoiceCommand(effective);
      if (command === 'stop') {
        log(`voice command: stop ("${effective}") — pausing ambient narration`);
        narrationPausedRef.current = true;
        turnIdRef.current += 1;
        stopPlayback();
        setStatus('listening');
        return;
      }
      if (command === 'repeat') {
        log(`voice command: repeat ("${effective}")`);
        speak(lastAnswerRef.current ?? t('noAnswerYet'));
        return;
      }
      log(`heard: "${effective}"`);
      runTurn(effective);
    },
    [runTurn, speak, stopPlayback],
  );

  useSpeechRecognitionEvent('result', (event) => {
    const full = event.results?.[0]?.transcript ?? '';
    let effective = transcriptDelta(utteranceBaseRef.current, full);
    if (!effective) {
      return;
    }

    // Echo rejection, in every state. While speaking, compare against the
    // current answer; afterwards, against the recently finished one (its
    // transcription arrives with up to ~1-2s delay). Echo words are consumed
    // into the base so they can never accumulate into future utterances.
    const tail = lastSpokenRef.current;
    const echoSource =
      speakingTextRef.current ?? (tail && Date.now() < tail.expiresAt ? tail.text : null);
    if (echoSource) {
      if (looksLikeEcho(effective, echoSource)) {
        utteranceBaseRef.current = full;
        log(`ignored own-voice echo: "${effective.slice(0, 60)}"`);
        return;
      }
      // Mixed case: user's words with Vizi's echo appended at the end.
      const trimmed = trimEchoSuffix(effective, echoSource);
      if (trimmed !== effective) {
        log(`trimmed echo suffix: "${effective.slice(0, 60)}" -> "${trimmed.slice(0, 60)}"`);
        effective = trimmed;
        if (!effective) {
          utteranceBaseRef.current = full;
          return;
        }
      }
    }

    if (statusRef.current === 'speaking') {
      // Barge-in: the user talked over Vizi. Cut playback, note the
      // interruption in history so the model knows its answer was cut short.
      log(`barge-in: "${effective}"`);
      turnIdRef.current += 1;
      stopPlayback();
      const lastEntry = historyRef.current[historyRef.current.length - 1];
      if (lastEntry?.role === 'model' && !lastEntry.text.endsWith('[user interrupted]')) {
        historyRef.current = [
          ...historyRef.current.slice(0, -1),
          { role: 'model', text: `${lastEntry.text} [user interrupted]` },
        ];
      }
      setStatus('listening');
    } else if (statusRef.current === 'thinking') {
      // The user spoke again before the answer arrived — cancel the in-flight
      // turn, roll the consume back, and let the utterance rebuild whole.
      log('user spoke while thinking — canceling in-flight turn');
      turnIdRef.current += 1;
      utteranceBaseRef.current = prevUtteranceBaseRef.current;
      setStatus('listening');
    } else if (statusRef.current !== 'listening') {
      return;
    }

    lastSpeechAtRef.current = Date.now();
    recognitionErrorsRef.current = 0;
    latestTranscriptRef.current = full;

    if (event.isFinal) {
      clearEagerEndpoint();
      consumeUtterance(full);
      return;
    }
    if (effective) {
      // User is talking — grab a frame now so it's ready by the time they
      // finish the question.
      if (!pendingFrameRef.current) {
        log('pre-capturing frame while user speaks');
        pendingFrameRef.current = captureFrame();
      }
      // Eager endpointing: when the interim transcript stops changing for
      // EAGER_ENDPOINT_MS, consume it directly — no recognizer stop, so no
      // stop sound and recognition simply continues for the next utterance.
      clearEagerEndpoint();
      eagerEndpointTimerRef.current = setTimeout(() => {
        eagerEndpointTimerRef.current = null;
        if (statusRef.current === 'listening') {
          log('eager endpoint — consuming utterance');
          consumeUtterance(latestTranscriptRef.current);
        }
      }, EAGER_ENDPOINT_MS);
    }
  });

  useSpeechRecognitionEvent('start', () => {
    recognitionRunningRef.current = true;
    // Fresh session — its transcript starts from scratch.
    utteranceBaseRef.current = '';
    latestTranscriptRef.current = '';
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
        // Ambient narration is a Plus feature — it is the biggest continuous
        // API cost, so the free plan keeps only on-demand questions.
        if (narrationPausedRef.current || !getSettings().ambientNarration || !plusRef.current) {
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

  // Screen focus: pause the session while another screen (e.g. the Vizi+
  // settings sheet) covers this one — no camera sampling, no Gemini calls,
  // no narration under a modal. Resume when the screen regains focus.
  useEffect(() => {
    focusedRef.current = focused;
    if (!focused) {
      log('screen unfocused — pausing session');
      turnIdRef.current += 1;
      stopPlayback();
      stopListening();
      clearEagerEndpoint();
      pendingFrameRef.current = null;
      setStatus('connecting');
      return;
    }
    log('screen focused — resuming session');
    if (appActiveRef.current && !mutedRef.current) {
      startListening();
    }
  }, [focused, clearEagerEndpoint, startListening, stopListening, stopPlayback]);

  // Lifecycle: pause the whole session in the background (camera and mic are
  // unavailable there — retrying just spins), resume on foreground.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      const active = state === 'active';
      if (active === appActiveRef.current) {
        return;
      }
      appActiveRef.current = active;
      if (!active) {
        log('app backgrounded — pausing session');
        stopPlayback();
        stopListening();
        clearEagerEndpoint();
        pendingFrameRef.current = null;
        setStatus('connecting');
        return;
      }
      log('app foregrounded — resuming session');
      if (!mutedRef.current) {
        startListening();
      }
    });
    return () => {
      subscription.remove();
    };
  }, [clearEagerEndpoint, startListening, stopListening, stopPlayback]);

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
    speak(lastAnswer ?? t('noAnswerYet'));
  }, [lastAnswer, speak]);

  // Re-run the last question against whatever the camera sees right now.
  const askAgain = useCallback(() => {
    log('ask-again requested');
    stopPlayback();
    if (!lastQuestion) {
      speak(t('noQuestionYet'));
      return;
    }
    runTurn(lastQuestion);
  }, [lastQuestion, runTurn, speak, stopPlayback]);

  return { status, lastAnswer, repeatLastAnswer, askAgain, transcript };
}
