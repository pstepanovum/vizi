import { DEFAULT_CONFIG, cloneConfig, normalizeConfig, type StudioConfig } from './config';

/** Reads config/slides.config.json through the dev-server API. */
export async function loadConfig(): Promise<StudioConfig> {
  try {
    const res = await fetch('/__config');
    if (!res.ok) {
      return cloneConfig(DEFAULT_CONFIG);
    }
    return normalizeConfig(await res.json());
  } catch {
    return cloneConfig(DEFAULT_CONFIG);
  }
}

export async function saveConfig(config: StudioConfig): Promise<void> {
  const res = await fetch('/__config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  });
  if (!res.ok) {
    throw new Error(`Save failed (${res.status})`);
  }
}

/**
 * Resolves once every font and image inside `root` has actually painted, then
 * flips the flag Playwright waits on. Screenshotting before this point is how
 * you get fallback-font PNGs.
 */
export async function markReadyWhenPainted(root: HTMLElement): Promise<void> {
  await Promise.all([
    document.fonts.load('400 54px Chunk'),
    document.fonts.load('400 16px Poppins'),
    document.fonts.load('500 16px Poppins'),
    document.fonts.load('600 16px Poppins'),
  ]).catch(() => undefined);
  await document.fonts.ready;

  const images = Array.from(root.querySelectorAll('img'));
  await Promise.all(
    images.map((img) =>
      img.complete && img.naturalWidth > 0
        ? img.decode().catch(() => undefined)
        : new Promise<void>((resolve) => {
            img.addEventListener('load', () => resolve(), { once: true });
            img.addEventListener('error', () => resolve(), { once: true });
          }),
    ),
  );

  // Two frames: one for layout after decode, one for the paint itself.
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  document.documentElement.setAttribute('data-ready', '1');
}
