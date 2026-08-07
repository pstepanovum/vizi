import * as Speech from 'expo-speech';
import { useCallback, useRef } from 'react';
import { Platform } from 'react-native';

export type SpeakOptions = {
  onDone?: () => void;
  onStopped?: () => void;
  onError?: (error: Error) => void;
};

export function useSpeechOutput() {
  const lastReplyRef = useRef<string | null>(null);
  const speakTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const remember = useCallback((text: string) => {
    const trimmed = text.trim();
    if (trimmed) {
      lastReplyRef.current = trimmed;
    }
  }, []);

  const clearSpeakTimer = useCallback(() => {
    if (speakTimerRef.current) {
      clearTimeout(speakTimerRef.current);
      speakTimerRef.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    clearSpeakTimer();
    Speech.stop();
  }, [clearSpeakTimer]);

  const speak = useCallback(
    (text: string, options?: SpeakOptions) => {
      const trimmed = text.trim();
      if (!trimmed) {
        options?.onDone?.();
        return;
      }
      lastReplyRef.current = trimmed;
      clearSpeakTimer();
      Speech.stop();

      const start = () => {
        // Chrome often needs a fresh cancel + speak after mic/STT releases audio.
        if (Platform.OS === 'web' && typeof window !== 'undefined' && window.speechSynthesis) {
          window.speechSynthesis.cancel();
        }
        Speech.speak(trimmed, {
          language: 'en-US',
          rate: 0.95,
          onDone: options?.onDone,
          onStopped: options?.onStopped,
          onError: options?.onError,
        });
      };

      // Give STT a moment to stop before TTS (web SpeechRecognition + synthesis conflict).
      if (Platform.OS === 'web') {
        speakTimerRef.current = setTimeout(start, 200);
      } else {
        start();
      }
    },
    [clearSpeakTimer],
  );

  const repeatLast = useCallback(
    (options?: SpeakOptions) => {
      if (lastReplyRef.current) {
        speak(lastReplyRef.current, options);
      } else {
        options?.onDone?.();
      }
    },
    [speak],
  );

  return {
    speak,
    stop,
    remember,
    repeatLast,
    getLastReply: () => lastReplyRef.current,
  };
}
