import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';
import { useEffect, useRef } from 'react';

type Options = {
  enabled: boolean;
  muted: boolean;
  onFinalUtterance: (text: string) => void;
  onSpeechStart?: () => void;
};

export function useSpeechInput({ enabled, muted, onFinalUtterance, onSpeechStart }: Options) {
  const onFinalRef = useRef(onFinalUtterance);
  const onSpeechStartRef = useRef(onSpeechStart);
  onFinalRef.current = onFinalUtterance;
  onSpeechStartRef.current = onSpeechStart;

  useSpeechRecognitionEvent('start', () => {
    onSpeechStartRef.current?.();
  });

  useSpeechRecognitionEvent('result', (event) => {
    if (!event.isFinal) {
      return;
    }
    const text = event.results?.[0]?.transcript?.trim();
    if (text) {
      onFinalRef.current(text);
    }
  });

  useSpeechRecognitionEvent('end', () => {
    if (enabled && !muted) {
      void startListening();
    }
  });

  useSpeechRecognitionEvent('error', () => {
    if (enabled && !muted) {
      setTimeout(() => {
        void startListening();
      }, 750);
    }
  });

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!enabled || muted) {
        ExpoSpeechRecognitionModule.stop();
        return;
      }

      const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (cancelled || !result.granted) {
        return;
      }
      await startListening();
    }

    void run();

    return () => {
      cancelled = true;
      ExpoSpeechRecognitionModule.stop();
    };
  }, [enabled, muted]);
}

async function startListening() {
  try {
    ExpoSpeechRecognitionModule.start({
      lang: 'en-US',
      interimResults: true,
      continuous: true,
    });
  } catch {
    // Permission or platform limitations — session continues without mic.
  }
}
