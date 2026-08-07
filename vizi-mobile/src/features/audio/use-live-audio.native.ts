import {
  initialize,
  playPCMData,
  requestMicrophonePermissionsAsync,
  restart,
  tearDown,
  toggleRecording,
  useExpoTwoWayAudioEventListener,
} from '@speechmatics/expo-two-way-audio';
import { useCallback, useEffect, useRef } from 'react';
import { Platform } from 'react-native';

import { base64ToBytes, resamplePcm16le24kTo16k } from '@/features/audio/pcm';

type Options = {
  enabled: boolean;
  muted: boolean;
  /** Called with raw 16 kHz s16le mono mic PCM. */
  onMicPcm: (pcm: Uint8Array) => void;
};

/**
 * Native bidirectional PCM for Gemini Live.
 * Mic: 16 kHz s16le mono. Playback: Gemini 24 kHz chunks resampled to 16 kHz.
 */
export function useLiveAudio({ enabled, muted, onMicPcm }: Options) {
  const onMicRef = useRef(onMicPcm);
  onMicRef.current = onMicPcm;
  const mutedRef = useRef(muted);
  mutedRef.current = muted;
  const readyRef = useRef(false);

  const onMicData = useCallback((event: { data?: Uint8Array }) => {
    if (!readyRef.current || mutedRef.current) {
      return;
    }
    const data = event.data;
    if (data?.length) {
      onMicRef.current(data);
    }
  }, []);

  useExpoTwoWayAudioEventListener('onMicrophoneData', onMicData);

  useEffect(() => {
    if (Platform.OS === 'web') {
      return;
    }

    let cancelled = false;

    async function boot() {
      if (!enabled) {
        if (readyRef.current) {
          toggleRecording(false);
          tearDown();
          readyRef.current = false;
        }
        return;
      }

      const permission = await requestMicrophonePermissionsAsync();
      if (cancelled || !permission.granted) {
        return;
      }

      await initialize();
      if (cancelled) {
        tearDown();
        return;
      }
      readyRef.current = true;
      toggleRecording(!muted);
    }

    void boot();

    return () => {
      cancelled = true;
      if (readyRef.current) {
        toggleRecording(false);
        tearDown();
        readyRef.current = false;
      }
    };
  }, [enabled]);

  useEffect(() => {
    if (!readyRef.current || Platform.OS === 'web') {
      return;
    }
    toggleRecording(enabled && !muted);
  }, [enabled, muted]);

  const playModelPcmBase64 = useCallback((base64Pcm24k: string) => {
    if (!readyRef.current || Platform.OS === 'web' || !base64Pcm24k) {
      return;
    }
    const pcm24 = base64ToBytes(base64Pcm24k);
    const pcm16 = resamplePcm16le24kTo16k(pcm24);
    if (pcm16.length > 0) {
      playPCMData(pcm16);
    }
  }, []);

  const stopPlayback = useCallback(() => {
    if (Platform.OS === 'web' || !readyRef.current) {
      return;
    }
    // No clear-queue API; restart flushes scheduled buffers.
    restart();
    toggleRecording(enabled && !muted);
  }, [enabled, muted]);

  return {
    playModelPcmBase64,
    stopPlayback,
    nativeAudioSupported: Platform.OS !== 'web',
  };
}
