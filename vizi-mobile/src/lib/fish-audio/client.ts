import { File, Paths } from 'expo-file-system';

const API_KEY = process.env.EXPO_PUBLIC_FISH_AUDIO_API_KEY;
const MODEL = process.env.EXPO_PUBLIC_FISH_AUDIO_MODEL ?? 's1';

export function hasFishAudioKey(): boolean {
  return Boolean(API_KEY);
}

// Synthesizes speech via Fish Audio and returns a local file URI ready for playback.
export async function synthesizeSpeech(text: string): Promise<string> {
  if (!API_KEY) {
    throw new Error('Missing EXPO_PUBLIC_FISH_AUDIO_API_KEY');
  }

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
      // "balanced" trades a little fidelity for noticeably lower time-to-first-byte.
      latency: 'balanced',
      normalize: true,
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Fish Audio TTS failed (${response.status}): ${detail.slice(0, 200)}`);
  }

  const bytes = new Uint8Array(await response.arrayBuffer());
  const file = new File(Paths.cache, `vizi-tts-${Date.now()}.mp3`);
  file.write(bytes);
  return file.uri;
}
