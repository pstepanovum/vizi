// Downloads the demo camera photos used inside the mocked device screens.
//
// The JPEGs are NOT committed (see .gitignore) — run `npm run scenes` once
// after cloning. Every image is Unsplash License (free for commercial use,
// no attribution required); see public/scenes/CREDITS.md for the full list.
import { mkdir, writeFile, access } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, '..', 'public', 'scenes');

// Portrait crops: the camera frame in the app is roughly 2:3.
const PARAMS = 'w=1000&h=1500&fit=crop&crop=entropy&q=80&fm=jpg';

export const SCENES = [
  {
    file: 'street.jpg',
    id: 'photo-1663232041381-1dc25ccfc0ad',
    label: 'Street crossing',
    description: 'People crossing a city street in the rain',
    credit: 'Andréa Villiers / Unsplash',
  },
  {
    file: 'kitchen.jpg',
    id: 'photo-1556911220-bff31c812dba',
    label: 'Kitchen',
    description: 'Modern white kitchen with a marble island',
    credit: 'Jason Briscoe / Unsplash',
  },
  {
    file: 'menu.jpg',
    id: 'photo-1777372403658-34d3d7644485',
    label: 'Menu board',
    description: 'Coffee shop menu board with drink names and prices',
    credit: 'Haberdoedas / Unsplash',
  },
  {
    file: 'clothes.jpg',
    id: 'photo-1775740397180-e8f9a540135d',
    label: 'Colorful clothes',
    description: 'Colorful patterned clothes hanging on a rack',
    credit: 'Haberdoedas / Unsplash',
  },
  {
    file: 'clothes-rack.jpg',
    id: 'photo-1729864210127-0c0dc835dd78',
    label: 'Clothes rack',
    description: 'A rack with a bunch of clothes hanging on it',
    credit: 'Bennie Bates / Unsplash',
  },
];

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const force = process.argv.includes('--force');
  await mkdir(outDir, { recursive: true });
  for (const scene of SCENES) {
    const target = join(outDir, scene.file);
    if (!force && (await exists(target))) {
      console.log(`skip  ${scene.file} (already downloaded)`);
      continue;
    }
    const url = `https://images.unsplash.com/${scene.id}?${PARAMS}`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Failed to download ${scene.file}: ${res.status} ${res.statusText}`);
    }
    const bytes = Buffer.from(await res.arrayBuffer());
    await writeFile(target, bytes);
    console.log(`saved ${scene.file}  ${(bytes.length / 1024).toFixed(0)} KB`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}
