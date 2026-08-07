import { useCallback } from 'react';

type Options = {
  enabled: boolean;
  muted: boolean;
  onMicPcm: (pcm: Uint8Array) => void;
};

/** Web stub — Gemini Live native PCM is iOS/Android only. */
export function useLiveAudio(_options: Options) {
  const playModelPcmBase64 = useCallback((_base64Pcm24k: string) => {}, []);
  const stopPlayback = useCallback(() => {}, []);

  return {
    playModelPcmBase64,
    stopPlayback,
    nativeAudioSupported: false,
  };
}
