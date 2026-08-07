import { File, Paths } from 'expo-file-system';

const API_KEY = process.env.EXPO_PUBLIC_FISH_AUDIO_API_KEY;
const MODEL = process.env.EXPO_PUBLIC_FISH_AUDIO_MODEL ?? 's1';
// Pinned voice so Vizi always sounds the same. Default: "Sarah" — calm,
// clear English. Override with EXPO_PUBLIC_FISH_AUDIO_VOICE_ID.
const VOICE_ID =
  process.env.EXPO_PUBLIC_FISH_AUDIO_VOICE_ID ?? '933563129e564b19a115bedd57b7406a';

export function hasFishAudioKey(): boolean {
  return Boolean(API_KEY);
}

// Synthesizes speech via Fish Audio and returns a local file URI ready for playback.
export async function synthesizeSpeech(text: string): Promise<string> {
  if (!API_KEY) {
    throw new Error('Missing EXPO_PUBLIC_FISH_AUDIO_API_KEY');
  }

  const startedAt = Date.now();
  console.log(`[vizi:fish] tts request → model=${MODEL} chars=${text.length}`);

  const response = await fetch('https://api.fish.audio/v1/tts', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
      model: MODEL,
    },
    body: JSON.stringify({
      text,
      format: 'mp3',
      reference_id: VOICE_ID,
      // "balanced" trades a little fidelity for noticeably lower time-to-first-byte.
      latency: 'balanced',
      normalize: true,
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    console.warn(`[vizi:fish] HTTP ${response.status} after ${Date.now() - startedAt}ms: ${detail.slice(0, 200)}`);
    throw new Error(`Fish Audio TTS failed (${response.status}): ${detail.slice(0, 200)}`);
  }

  const bytes = new Uint8Array(await response.arrayBuffer());
  const file = new File(Paths.cache, `vizi-tts-${Date.now()}.mp3`);
  file.write(bytes);
  console.log(`[vizi:fish] audio ready in ${Date.now() - startedAt}ms (${Math.round(bytes.length / 1024)}kb)`);
  return file.uri;
}
