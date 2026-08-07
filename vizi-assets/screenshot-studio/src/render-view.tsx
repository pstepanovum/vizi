// Export mode (`?render=1`): a single slide, at its natural canvas size, with
// no dashboard chrome around it. Playwright screenshots the whole viewport.
import { useEffect, useRef, useState } from 'react';

import { loadConfig, markReadyWhenPainted } from './config-io';
import { deviceById } from './devices';
import { SlideCanvas } from './slide';
import type { StudioConfig } from './config';

export function RenderView({ deviceId, slideIndex }: { deviceId: string; slideIndex: number }) {
  const [config, setConfig] = useState<StudioConfig | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadConfig().then(setConfig);
  }, []);

  useEffect(() => {
    if (config && ref.current) {
      void markReadyWhenPainted(ref.current);
    }
  }, [config]);

  if (!config) {
    return null;
  }

  const device = deviceById(deviceId);
  const slide = config.slides[slideIndex];
  if (!slide) {
    throw new Error(`No slide at index ${slideIndex} (have ${config.slides.length}).`);
  }

  return (
    <div ref={ref}>
      <SlideCanvas device={device} slide={slide} paywall={config.paywall} />
    </div>
  );
}
