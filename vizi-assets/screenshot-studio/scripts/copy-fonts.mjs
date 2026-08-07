// Copies the licensed Chunk font into public/fonts so the browser can load it.
//
// vizi-assets/font/ is gitignored (licensed asset), and so is the copy this
// script makes — the studio needs a local original to work from.
import { copyFile, mkdir, access } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const source = resolve(here, '..', '..', 'font', 'chunk-font');
const target = resolve(here, '..', 'public', 'fonts');

const FILES = ['Chunk.woff2', 'Chunk.otf'];

async function main() {
  await mkdir(target, { recursive: true });
  let copied = 0;
  for (const file of FILES) {
    try {
      await access(join(source, file));
    } catch {
      continue;
    }
    await copyFile(join(source, file), join(target, file));
    console.log(`copied ${file}`);
    copied += 1;
  }
  if (copied === 0) {
    console.error(
      `No Chunk font found in ${source}.\n` +
        'Chunk is a licensed asset and is not in git — get it from the design ' +
        'drive and drop Chunk.woff2 (or Chunk.otf) into that folder.',
    );
    process.exit(1);
  }
}

main();
