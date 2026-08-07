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
  const heardModelAudioRef = useRef(false);
  const [status, setStatus] = useState<SessionStatus>('connecting');
  const [muted, setMuted] = useState(false);
  const [caption, setCaption] = useState<string | null>(null);
  const [mode, setMode] = useState<CompanionMode | null>(null);
  const [usesNativeAudio, setUsesNativeAudio] = useState(false);
  const [restModel, setRestModel] = useState<string | null>(null);
  const [sessionKey, setSessionKey] = useState(0);
  /** Pause STT while TTS speaks — required on web browsers. */
  const [holdingMicForTts, setHoldingMicForTts] = useState(false);
  const { speak, stop, repeatLast, remember } = useSpeechOutput();

  const stopPlaybackLocal = useRef<() => void>(() => undefined);
  const playModelPcmBase64Ref = useRef<(b64: string) => void>(() => undefined);

  const releaseMicAfterTts = useCallback(() => {
    setHoldingMicForTts(false);
  }, []);

  const speakReply = useCallback(
    (text: string) => {
      setHoldingMicForTts(true);
      const release = () => setHoldingMicForTts(false);
      // Fallback if the browser never fires speech onDone/onError.
      const failsafeMs = Math.min(60000, Math.max(4000, text.trim().length * 80));
      const failsafe = setTimeout(release, failsafeMs);
      const wrap = (fn?: () => void) => () => {
        clearTimeout(failsafe);
        fn?.();
        release();
      };
      speak(text, {
        onDone: wrap(),
        onStopped: wrap(),
        onError: wrap(),
      });
    },
    [speak],
  );

  const stopEverything = useCallback(async () => {
    stop();
    setHoldingMicForTts(false);
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
      setRestModel(null);
      setHoldingMicForTts(false);
      usesNativeAudioRef.current = false;
      heardModelAudioRef.current = false;

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
            // REST / mock: always OS TTS.
            // Native Live: OS TTS only if no model PCM arrived this turn.
            if (!usesNativeAudioRef.current || !heardModelAudioRef.current) {
              speakReply(text);
            }
            heardModelAudioRef.current = false;
          },
          onAudioChunk: (base64) => {
            if (cancelled) {
              return;
            }
            heardModelAudioRef.current = true;
            playModelPcmBase64Ref.current(base64);
          },
          onInterrupted: () => {
            stop();
            setHoldingMicForTts(false);
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
        setRestModel(companion.restModel ?? null);
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
  }, [cameraGranted, sessionKey, speakReply, remember, stop, stopEverything]);

  useEffect(() => {
    const onChange = (next: AppStateStatus) => {
      if (next !== 'active') {
        stop();
        setHoldingMicForTts(false);
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
  // Disable mic while TTS plays — browsers can't synthesize while recognizing.
  useSpeechInput({
    enabled: sessionActive && !usesNativeAudio && !holdingMicForTts,
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
    setHoldingMicForTts(true);
    repeatLast({
      onDone: releaseMicAfterTts,
      onStopped: releaseMicAfterTts,
      onError: releaseMicAfterTts,
    });
  }, [repeatLast, releaseMicAfterTts]);

  return {
    cameraRef,
    status,
    muted,
    caption,
    mode,
    usesNativeAudio,
    restModel,
    toggleMute,
    repeatLast: handleRepeatLast,
    reconnect,
  };
}
