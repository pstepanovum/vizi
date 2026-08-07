// Renders every slide at the exact pixel size App Store Connect wants and
// writes the PNGs to vizi-assets/screenshots/<device>/.
//
//   npm run export
//   npm run export -- --device iphone-6.9
//   npm run export -- --slide 3
//
// It boots the Vite dev server in-process, so the dashboard's saved config,
// the local fonts and the scene photos are all served exactly as in dev.
import { mkdir, readFile, readdir, stat } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from '@playwright/test';
import { createServer } from 'vite';

const here = dirname(fileURLToPath(import.meta.url));
const studioRoot = resolve(here, '..');
const outRoot = resolve(studioRoot, '..', 'screenshots');
const configPath = join(studioRoot, 'config', 'slides.config.json');

// Kept in step with src/devices.ts — see the comment there for why these are
// the only two sizes App Store Connect needs in 2026.
const DEVICES = [
  { id: 'iphone-6.9', width: 1290, height: 2796, exportScale: 2 },
  { id: 'iphone-6.9-xl', width: 1320, height: 2868, exportScale: 2 },
  { id: 'ipad-13', width: 2064, height: 2752, exportScale: 2 },
];

function parseArgs(argv) {
  const args = { devices: null, slide: null };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--device' && argv[i + 1]) {
      args.devices = argv[i + 1].split(',');
      i += 1;
    } else if (argv[i] === '--slide' && argv[i + 1]) {
      args.slide = Number(argv[i + 1]) - 1;
      i += 1;
    }
  }
  return args;
}

/**
 * config/slides.config.json is the source of truth for both the page and the
 * filenames — the dashboard's Save button writes it, and it ships with the
 * repo seeded from DEFAULT_CONFIG in src/config.ts.
 */
async function loadSlides() {
  const parsed = JSON.parse(await readFile(configPath, 'utf8')).slides;
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error(`${configPath} has no slides.`);
  }
  return parsed;
}

/** A missing Chunk file would silently export in a fallback font. */
async function assertAssets() {
  const missing = [];
  for (const file of ['public/fonts/Chunk.woff2', 'public/fonts/Poppins-400.woff2']) {
    try {
      await stat(join(studioRoot, file));
    } catch {
      missing.push(file);
    }
  }
  if (missing.length > 0) {
    throw new Error(
      `Missing font file(s): ${missing.join(', ')}. Run "npm run fonts" ` +
        '(Chunk lives in vizi-assets/font/chunk-font and is not in git).',
    );
  }
  const scenes = await readdir(join(studioRoot, 'public', 'scenes')).catch(() => []);
  if (!scenes.some((f) => f.endsWith('.jpg'))) {
    throw new Error('No scene photos in public/scenes. Run "npm run scenes".');
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  await assertAssets();
  const devices = args.devices
    ? DEVICES.filter((d) => args.devices.includes(d.id))
    : DEVICES;
  if (devices.length === 0) {
    throw new Error(`No matching device. Known: ${DEVICES.map((d) => d.id).join(', ')}`);
  }

  const slides = await loadSlides();
  const indexes =
    args.slide === null ? slides.map((_, i) => i) : [args.slide].filter((i) => slides[i]);
  if (indexes.length === 0) {
    throw new Error(`No slide ${args.slide + 1} (config has ${slides.length}).`);
  }

  const server = await createServer({
    root: studioRoot,
    configFile: join(studioRoot, 'vite.config.ts'),
    server: { port: 0, strictPort: false },
    logLevel: 'warn',
  });
  await server.listen();
  const base = server.resolvedUrls.local[0].replace(/\/$/, '');

  const browser = await chromium.launch();
  const written = [];

  try {
    for (const device of devices) {
      const dir = join(outRoot, device.id);
      await mkdir(dir, { recursive: true });

      const context = await browser.newContext({
        viewport: {
          width: device.width / device.exportScale,
          height: device.height / device.exportScale,
        },
        deviceScaleFactor: device.exportScale,
        // Deterministic rendering: no scrollbars, no reduced-motion surprises.
        reducedMotion: 'reduce',
        colorScheme: 'light',
      });
      const page = await context.newPage();

      for (const index of indexes) {
        const slide = slides[index];
        const url = `${base}/?render=1&device=${device.id}&slide=${index}`;
        await page.goto(url, { waitUntil: 'load' });
        await page.waitForSelector('html[data-ready="1"]', { timeout: 30_000 });

        const name = `${String(index + 1).padStart(2, '0')}-${slide.slug}.png`;
        const file = join(dir, name);
        await page.screenshot({ path: file, type: 'png' });
        written.push({ device: device.id, file, expected: [device.width, device.height] });
      }

      await context.close();
    }
  } finally {
    await browser.close();
    await server.close();
  }

  // Verify the PNG headers rather than trusting the viewport maths.
  console.log('');
  let bad = 0;
  for (const item of written) {
    const buf = await readFile(item.file);
    const width = buf.readUInt32BE(16);
    const height = buf.readUInt32BE(20);
    const ok = width === item.expected[0] && height === item.expected[1];
    if (!ok) bad += 1;
    const size = (await stat(item.file)).size;
    console.log(
      `${ok ? 'ok  ' : 'BAD '} ${width}x${height}  ${(size / 1024).toFixed(0).padStart(5)} KB  ` +
        `${item.file.replace(`${resolve(studioRoot, '..', '..')}/`, '')}` +
        (ok ? '' : `  (expected ${item.expected[0]}x${item.expected[1]})`),
    );
  }
  console.log(`\n${written.length} PNG(s) -> ${outRoot}`);
  for (const device of devices) {
    const dir = join(outRoot, device.id);
    const files = await readdir(dir).catch(() => []);
    console.log(`  ${device.id}: ${files.length} file(s) at ${device.width}x${device.height}`);
  }
  if (bad > 0) {
    throw new Error(`${bad} screenshot(s) came out at the wrong size.`);
  }
}

main().catch((err) => {
  console.error(`\nexport failed: ${err.message}`);
  process.exit(1);
});
