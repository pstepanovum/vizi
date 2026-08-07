import * as Speech from 'expo-speech';
import { useCallback, useRef } from 'react';

export function useSpeechOutput() {
  const lastReplyRef = useRef<string | null>(null);

  const remember = useCallback((text: string) => {
    const trimmed = text.trim();
    if (trimmed) {
      lastReplyRef.current = trimmed;
    }
  }, []);

  const speak = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed) {
      return;
    }
    lastReplyRef.current = trimmed;
    Speech.stop();
    Speech.speak(trimmed, {
      language: 'en-US',
      rate: 0.95,
    });
  }, []);

  const stop = useCallback(() => {
    Speech.stop();
  }, []);

  const repeatLast = useCallback(() => {
    if (lastReplyRef.current) {
      speak(lastReplyRef.current);
    }
  }, [speak]);

  return {
    speak,
    stop,
    remember,
    repeatLast,
    getLastReply: () => lastReplyRef.current,
  };
}
