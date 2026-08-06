import { CameraView } from 'expo-camera';
import { useEffect, useRef } from 'react';

const SAMPLE_INTERVAL_MS = 1000;

type Options = {
  enabled: boolean;
  cameraRef: React.RefObject<CameraView | null>;
  onFrame: (jpegBase64: string) => void;
};

/**
 * Auto-sample JPEG frames from the live camera preview.
 * Users never tap shutter — this runs on a timer while the session is active.
 */
export function useFrameSampler({ enabled, cameraRef, onFrame }: Options) {
  const onFrameRef = useRef(onFrame);
  onFrameRef.current = onFrame;

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let cancelled = false;
    let inFlight = false;

    const tick = async () => {
      if (cancelled || inFlight) {
        return;
      }
      const camera = cameraRef.current;
      if (!camera) {
        return;
      }

      inFlight = true;
      try {
        const photo = await camera.takePictureAsync({
          quality: 0.65,
          base64: true,
          shutterSound: false,
          skipProcessing: true,
        });
        if (!cancelled && photo?.base64) {
          onFrameRef.current(photo.base64);
        }
      } catch {
        // Simulator / denied camera often fails — companion still works via speech.
      } finally {
        inFlight = false;
      }
    };

    const id = setInterval(() => {
      void tick();
    }, SAMPLE_INTERVAL_MS);
    void tick();

    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [enabled, cameraRef]);
}

export function shouldSampleFrame(nowMs: number, lastSentMs: number, intervalMs = SAMPLE_INTERVAL_MS) {
  return nowMs - lastSentMs >= intervalMs;
}
