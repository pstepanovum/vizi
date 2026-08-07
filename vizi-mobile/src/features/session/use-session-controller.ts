import { type CameraView } from 'expo-camera';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { useSpeechInput } from '@/features/audio/use-speech-input';
import { useSpeechOutput } from '@/features/audio/use-speech-output';
import { useFrameSampler } from '@/features/camera/use-frame-sampler';
import { createCompanion } from '@/features/companion/create-companion';
import { CompanionMode, VisionCompanion } from '@/features/companion/types';
import { SessionStatus } from '@/features/session/session-status';

export function useSessionController(cameraGranted: boolean) {
  const cameraRef = useRef<CameraView | null>(null);
  const companionRef = useRef<VisionCompanion | null>(null);
  const [status, setStatus] = useState<SessionStatus>('connecting');
  const [muted, setMuted] = useState(false);
  const [caption, setCaption] = useState<string | null>(null);
  const [mode, setMode] = useState<CompanionMode | null>(null);
  const [sessionKey, setSessionKey] = useState(0);
  const { speak, stop, repeatLast } = useSpeechOutput();

  const stopEverything = useCallback(async () => {
    stop();
    await companionRef.current?.stopSession();
    companionRef.current = null;
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
            speak(text);
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
  }, [cameraGranted, sessionKey, speak, stopEverything]);

  useEffect(() => {
    const onChange = (next: AppStateStatus) => {
      if (next !== 'active') {
        stop();
        companionRef.current?.stopPlayback();
      }
    };
    const sub = AppState.addEventListener('change', onChange);
    return () => sub.remove();
  }, [stop]);

  useFrameSampler({
    enabled: cameraGranted && status !== 'needs_permission' && status !== 'error',
    cameraRef,
    onFrame: (base64) => companionRef.current?.pushFrame(base64),
  });

  useSpeechInput({
    enabled: cameraGranted && status !== 'needs_permission' && status !== 'error',
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

  return {
    cameraRef,
    status,
    muted,
    caption,
    mode,
    toggleMute,
    repeatLast,
    reconnect,
  };
}
