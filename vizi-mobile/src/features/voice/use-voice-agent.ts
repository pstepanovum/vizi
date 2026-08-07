import { AudioPlayer, createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { CameraView as ExpoCameraView, useCameraPermissions } from 'expo-camera';
import * as Speech from 'expo-speech';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';
import { RefObject, useCallback, useEffect, useRef, useState } from 'react';

import { SessionStatus } from '@/features/session/session-status';
import { hasFishAudioKey, synthesizeSpeech } from '@/lib/fish-audio/client';
import { askGemini, ChatTurn, hasGeminiKey } from '@/lib/gemini/client';
import { DESCRIBE_SCENE_PROMPT } from '@/lib/gemini/prompts';

const MAX_HISTORY_TURNS = 12;
// Ambient narration: describe the scene shortly after start, then again
// whenever the session sits idle in "listening" for this long.
const FIRST_DESCRIBE_DELAY_MS = 1500;
const AUTO_DESCRIBE_INTERVAL_MS = 12000;
// Don't start an ambient description if the user spoke this recently —
// they are probably mid-question.
const RECENT_SPEECH_WINDOW_MS = 4000;

function log(...parts: unknown[]) {
  console.log('[vizi:agent]', ...parts);
}

type VoiceAgentOptions = {
  cameraRef: RefObject<ExpoCameraView | null>;
  muted: boolean;
};

export function useVoiceAgent({ cameraRef, muted }: VoiceAgentOptions) {
  const [cameraPermission] = useCameraPermissions();
  const [status, setStatus] = useState<SessionStatus>('connecting');
  const [lastAnswer, setLastAnswer] = useState<string | null>(null);

  const historyRef = useRef<ChatTurn[]>([]);
  const playerRef = useRef<AudioPlayer | null>(null);
  const describeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSpeechAtRef = useRef(0);
  const hasDescribedRef = useRef(false);
  const statusRef = useRef(status);
  const mutedRef = useRef(muted);
  statusRef.current = status;
  mutedRef.current = muted;

  const startListening = useCallback(async () => {
    if (mutedRef.current) {
      log('startListening skipped — microphone muted');
      return;
    }
    try {
      const permission = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!permission.granted) {
        log('speech recognition permission denied');
        setStatus('needs_permission');
        return;
      }
      ExpoSpeechRecognitionModule.start({
        lang: 'en-US',
        interimResults: true,
        continuous: false,
        // Keep output on the loudspeaker while the mic session is active —
        // without defaultToSpeaker, iOS routes playback to the earpiece.
        iosCategory: {
          category: 'playAndRecord',
          categoryOptions: ['defaultToSpeaker', 'allowBluetooth'],
          mode: 'default',
        },
      });
      log('listening started');
      setStatus('listening');
    } catch (error) {
      log('failed to start listening:', error);
      setStatus('error');
    }
  }, []);

  const stopListening = useCallback(() => {
    try {
      ExpoSpeechRecognitionModule.stop();
    } catch {
      // Recognizer may already be stopped — nothing to do.
    }
  }, []);

  const stopPlayback = useCallback(() => {
    Speech.stop();
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
      Speech.speak(text, {
        language: 'en-US',
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
  const speak = useCallback(
    async (text: string) => {
      stopPlayback();
      setStatus('speaking');
      // Recognition has stopped by now; switch the session to pure playback so
      // iOS uses the loudspeaker at full volume.
      await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false }).catch(() => {});
      if (hasFishAudioKey()) {
        try {
          const uri = await synthesizeSpeech(text);
          const player = createAudioPlayer({ uri });
          playerRef.current = player;
          player.addListener('playbackStatusUpdate', (playbackStatus) => {
            if (playbackStatus.didJustFinish && playerRef.current === player) {
              log('Fish Audio playback finished');
              playerRef.current = null;
              player.release();
              startListening();
            }
          });
          player.play();
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
      log(`turn started (${ambient ? 'ambient description' : 'user question'}): "${question}"`);
      const turnStartedAt = Date.now();
      try {
        const frameBase64 = await captureFrame();
        const answer = await askGemini({
          question,
          frameBase64,
          history: historyRef.current,
        });
        const newTurns: ChatTurn[] = [
          { role: 'user', text: question },
          { role: 'model', text: answer },
        ];
        historyRef.current = [...historyRef.current, ...newTurns].slice(-MAX_HISTORY_TURNS);
        setLastAnswer(answer);
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
        await speak('Sorry, I could not process that. Please try again.');
      }
    },
    [captureFrame, speak, startListening, stopListening],
  );

  useSpeechRecognitionEvent('result', (event) => {
    if (statusRef.current !== 'listening') {
      return;
    }
    lastSpeechAtRef.current = Date.now();
    const transcript = event.results?.[0]?.transcript?.trim();
    if (event.isFinal && transcript) {
      log(`heard: "${transcript}"`);
      runTurn(transcript);
    }
  });

  useSpeechRecognitionEvent('end', () => {
    // The OS recognizer times out on silence; keep the session alive.
    if (statusRef.current === 'listening') {
      startListening();
    }
  });

  useSpeechRecognitionEvent('error', (event) => {
    if (event.error === 'no-speech' && statusRef.current === 'listening') {
      startListening();
      return;
    }
    log('speech recognition error:', event.error, event.message);
    if (statusRef.current === 'listening') {
      setStatus('error');
    }
  });

  // Ambient narration loop: whenever the session is idle in "listening",
  // schedule a scene description so the agent proactively guides the user.
  useEffect(() => {
    if (describeTimerRef.current) {
      clearTimeout(describeTimerRef.current);
      describeTimerRef.current = null;
    }
    if (status !== 'listening' || muted) {
      return;
    }
    const delay = hasDescribedRef.current ? AUTO_DESCRIBE_INTERVAL_MS : FIRST_DESCRIBE_DELAY_MS;
    log(`ambient description scheduled in ${delay}ms`);
    describeTimerRef.current = setTimeout(() => {
      if (statusRef.current !== 'listening' || mutedRef.current) {
        return;
      }
      if (Date.now() - lastSpeechAtRef.current < RECENT_SPEECH_WINDOW_MS) {
        log('ambient description deferred — user spoke recently');
        // Re-arm by nudging the effect through a fresh listening cycle.
        describeTimerRef.current = setTimeout(() => {
          if (statusRef.current === 'listening' && !mutedRef.current) {
            hasDescribedRef.current = true;
            runTurn(DESCRIBE_SCENE_PROMPT, { ambient: true });
          }
        }, RECENT_SPEECH_WINDOW_MS);
        return;
      }
      hasDescribedRef.current = true;
      runTurn(DESCRIBE_SCENE_PROMPT, { ambient: true });
    }, delay);
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
      speak('I have not answered anything yet. Ask me a question.');
      return;
    }
    speak(lastAnswer);
  }, [lastAnswer, speak, stopListening]);

  const reconnect = useCallback(() => {
    log('reconnect requested — resetting session');
    stopPlayback();
    stopListening();
    historyRef.current = [];
    hasDescribedRef.current = false;
    setStatus('connecting');
    startListening();
  }, [startListening, stopListening, stopPlayback]);

  return { status, lastAnswer, repeatLastAnswer, reconnect };
}
