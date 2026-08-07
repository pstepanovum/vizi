import { VIZI_SYSTEM_PROMPT } from './prompts';

const API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
const MODEL = process.env.EXPO_PUBLIC_GEMINI_MODEL ?? 'gemini-2.5-flash';

export type ChatTurn = {
  role: 'user' | 'model';
  text: string;
};

function endpointUrl(): string {
  if (!API_KEY) {
    throw new Error('Missing EXPO_PUBLIC_GEMINI_API_KEY — copy .env.example to .env');
  }
  return `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;
}

export function hasGeminiKey(): boolean {
  return Boolean(API_KEY);
}

export async function askGemini({
  question,
  frameBase64,
  history,
}: {
  question: string;
  frameBase64?: string;
  history: ChatTurn[];
}): Promise<string> {
  const parts: object[] = [];
  if (frameBase64) {
    parts.push({ inlineData: { mimeType: 'image/jpeg', data: frameBase64 } });
  }
  parts.push({ text: question });

  const body = {
    systemInstruction: { parts: [{ text: VIZI_SYSTEM_PROMPT }] },
    contents: [
      ...history.map((turn) => ({ role: turn.role, parts: [{ text: turn.text }] })),
      { role: 'user', parts },
    ],
    generationConfig: {
      temperature: 0.4,
      maxOutputTokens: 512,
    },
  };

  const startedAt = Date.now();
  console.log(
    `[vizi:gemini] request → model=${MODEL} question="${question}" frame=${frameBase64 ? `${Math.round(frameBase64.length / 1024)}kb` : 'none'} history=${history.length} turns`,
  );

  const response = await fetch(endpointUrl(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const detail = await response.text();
    console.warn(`[vizi:gemini] HTTP ${response.status} after ${Date.now() - startedAt}ms: ${detail.slice(0, 300)}`);
    throw new Error(`Gemini request failed (${response.status}): ${detail.slice(0, 300)}`);
  }

  const json = (await response.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = json.candidates?.[0]?.content?.parts
    ?.map((part) => part.text ?? '')
    .join('')
    .trim();

  if (!text) {
    console.warn('[vizi:gemini] empty answer in response');
    throw new Error('Gemini returned an empty answer');
  }
  console.log(`[vizi:gemini] answer in ${Date.now() - startedAt}ms: "${text}"`);
  return text;
}
