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

const MAX_HISTORY_TURNS = 12;

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
  const statusRef = useRef(status);
  const mutedRef = useRef(muted);
  statusRef.current = status;
  mutedRef.current = muted;

  const startListening = useCallback(async () => {
    if (mutedRef.current) {
      return;
    }
    try {
      const permission = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!permission.granted) {
        setStatus('needs_permission');
        return;
      }
      ExpoSpeechRecognitionModule.start({
        lang: 'en-US',
        interimResults: false,
        continuous: false,
      });
      setStatus('listening');
    } catch {
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
    try {
      const photo = await cameraRef.current?.takePictureAsync({
        base64: true,
        quality: 0.5,
        skipProcessing: true,
        shutterSound: false,
      });
      return photo?.base64 ?? undefined;
    } catch {
      return undefined;
    }
  }, [cameraRef]);

  const speakWithSystemVoice = useCallback(
    (text: string) => {
      Speech.speak(text, {
        language: 'en-US',
        onDone: () => {
          startListening();
        },
        onStopped: () => {
          startListening();
        },
        onError: () => {
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
      if (hasFishAudioKey()) {
        try {
          const uri = await synthesizeSpeech(text);
          const player = createAudioPlayer({ uri });
          playerRef.current = player;
          player.addListener('playbackStatusUpdate', (playbackStatus) => {
            if (playbackStatus.didJustFinish && playerRef.current === player) {
              playerRef.current = null;
              player.release();
              startListening();
            }
          });
          player.play();
          return;
        } catch (error) {
          console.warn('[vizi] Fish Audio TTS failed, falling back to OS voice:', error);
        }
      }
      speakWithSystemVoice(text);
    },
    [speakWithSystemVoice, startListening, stopPlayback],
  );

  const handleUtterance = useCallback(
    async (transcript: string) => {
      stopListening();
      setStatus('thinking');
      try {
        const frameBase64 = await captureFrame();
        const answer = await askGemini({
          question: transcript,
          frameBase64,
          history: historyRef.current,
        });
        const newTurns: ChatTurn[] = [
          { role: 'user', text: transcript },
          { role: 'model', text: answer },
        ];
        historyRef.current = [...historyRef.current, ...newTurns].slice(-MAX_HISTORY_TURNS);
        setLastAnswer(answer);
        await speak(answer);
      } catch (error) {
        console.warn('[vizi] voice turn failed:', error);
        setStatus('error');
        await speak('Sorry, I could not process that. Please try again.');
      }
    },
    [captureFrame, speak, stopListening],
  );

  useSpeechRecognitionEvent('result', (event) => {
    if (statusRef.current !== 'listening') {
      return;
    }
    const transcript = event.results?.[0]?.transcript?.trim();
    if (event.isFinal && transcript) {
      handleUtterance(transcript);
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
    if (statusRef.current === 'listening') {
      setStatus('error');
    }
  });

  // Session bootstrap: wait for camera permission, then open the mic.
  useEffect(() => {
    if (!cameraPermission) {
      return;
    }
    if (!cameraPermission.granted) {
      setStatus('needs_permission');
      return;
    }
    if (!hasGeminiKey()) {
      console.warn('[vizi] EXPO_PUBLIC_GEMINI_API_KEY is not set');
      setStatus('error');
      return;
    }
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
      stopListening();
      return;
    }
    if (statusRef.current === 'listening' || statusRef.current === 'connecting') {
      startListening();
    }
  }, [muted, startListening, stopListening]);

  const repeatLastAnswer = useCallback(() => {
    stopListening();
    if (!lastAnswer) {
      speak('I have not answered anything yet. Ask me a question.');
      return;
    }
    speak(lastAnswer);
  }, [lastAnswer, speak, stopListening]);

  const reconnect = useCallback(() => {
    stopPlayback();
    stopListening();
    historyRef.current = [];
    setStatus('connecting');
    startListening();
  }, [startListening, stopListening, stopPlayback]);

  return { status, lastAnswer, repeatLastAnswer, reconnect };
}
