import { type CameraView } from 'expo-camera';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus, Platform } from 'react-native';

import { useLiveAudio } from '@/features/audio/use-live-audio';
import { useSpeechInput } from '@/features/audio/use-speech-input';
import { useSpeechOutput } from '@/features/audio/use-speech-output';
import { useFrameSampler } from '@/features/camera/use-frame-sampler';
import { createCompanion } from '@/features/companion/create-companion';
import { CompanionMode, VisionCompanion } from '@/features/companion/types';
import { SessionStatus } from '@/features/session/session-status';

export function useSessionController(cameraGranted: boolean) {
  const cameraRef = useRef<CameraView | null>(null);
  const companionRef = useRef<VisionCompanion | null>(null);
  const usesNativeAudioRef = useRef(false);
  const [status, setStatus] = useState<SessionStatus>('connecting');
  const [muted, setMuted] = useState(false);
  const [caption, setCaption] = useState<string | null>(null);
  const [mode, setMode] = useState<CompanionMode | null>(null);
  const [usesNativeAudio, setUsesNativeAudio] = useState(false);
  const [sessionKey, setSessionKey] = useState(0);
  const { speak, stop, repeatLast, remember } = useSpeechOutput();

  const stopPlaybackLocal = useRef<() => void>(() => undefined);
  const playModelPcmBase64Ref = useRef<(b64: string) => void>(() => undefined);

  const stopEverything = useCallback(async () => {
    stop();
    stopPlaybackLocal.current();
    await companionRef.current?.stopSession();
    companionRef.current = null;
    usesNativeAudioRef.current = false;
  }, [stop]);

  useEffect(() => {
    if (!cameraGranted) {
      setStatus('needs_permission');
      return;
    }

    let cancelled = false;

    async function boot() {
      setStatus('connecting');
      setCaption(null);
      setUsesNativeAudio(false);
      usesNativeAudioRef.current = false;

      try {
        const { companion, mode: resolvedMode } = await createCompanion({
          onStatus: (next) => {
            if (!cancelled) {
              setStatus(next);
            }
          },
          onPartialReply: (text) => {
            if (!cancelled) {
              setCaption(text);
            }
          },
          onFinalReply: (text) => {
            if (cancelled) {
              return;
            }
            setCaption(text);
            remember(text);
            // Native Live plays Gemini PCM; OS TTS only for text/REST/mock paths.
            if (!usesNativeAudioRef.current) {
              speak(text);
            }
          },
          onAudioChunk: (base64) => {
            if (!cancelled) {
              playModelPcmBase64Ref.current(base64);
            }
          },
          onInterrupted: () => {
            stop();
            stopPlaybackLocal.current();
          },
          onError: () => {
            if (!cancelled) {
              setStatus('error');
            }
          },
        });

        if (cancelled) {
          await companion.stopSession();
          return;
        }

        const native =
          Boolean(companion.usesNativeAudio) && Platform.OS !== 'web';
        usesNativeAudioRef.current = native;
        setUsesNativeAudio(native);
        companionRef.current = companion;
        setMode(resolvedMode);
        await companion.prepare();
        await companion.startSession();
      } catch {
        if (!cancelled) {
          setStatus('error');
        }
      }
    }

    void boot();

    return () => {
      cancelled = true;
      void stopEverything();
    };
  }, [cameraGranted, sessionKey, speak, remember, stop, stopEverything]);

  useEffect(() => {
    const onChange = (next: AppStateStatus) => {
      if (next !== 'active') {
        stop();
        stopPlaybackLocal.current();
        companionRef.current?.stopPlayback();
      }
    };
    const sub = AppState.addEventListener('change', onChange);
    return () => sub.remove();
  }, [stop]);

  const sessionActive =
    cameraGranted && status !== 'needs_permission' && status !== 'error';

  const liveAudio = useLiveAudio({
    enabled: sessionActive && usesNativeAudio && status !== 'connecting',
    muted,
    onMicPcm: (pcm) => companionRef.current?.pushAudio?.(pcm),
  });

  stopPlaybackLocal.current = liveAudio.stopPlayback;
  playModelPcmBase64Ref.current = liveAudio.playModelPcmBase64;

  useFrameSampler({
    enabled: sessionActive,
    cameraRef,
    onFrame: (base64) => companionRef.current?.pushFrame(base64),
  });

  // Web / REST / mock: OS speech recognition + TTS.
  useSpeechInput({
    enabled: sessionActive && !usesNativeAudio,
    muted,
    onSpeechStart: () => {
      stop();
      companionRef.current?.stopPlayback();
    },
    onFinalUtterance: (text) => {
      companionRef.current?.submitUtterance(text);
    },
  });

  const reconnect = useCallback(() => {
    void stopEverything().then(() => setSessionKey((value) => value + 1));
  }, [stopEverything]);

  const toggleMute = useCallback(() => {
    setMuted((value) => !value);
  }, []);

  const handleRepeatLast = useCallback(() => {
    // Always OS TTS for "repeat" — we don't buffer full model PCM turns.
    repeatLast();
  }, [repeatLast]);

  return {
    cameraRef,
    status,
    muted,
    caption,
    mode,
    usesNativeAudio,
    toggleMute,
    repeatLast: handleRepeatLast,
    reconnect,
  };
}
