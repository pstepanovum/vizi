import { fetch as expoFetch } from 'expo/fetch';

import { VIZI_SYSTEM_PROMPT } from './prompts';

const API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
const MODEL = process.env.EXPO_PUBLIC_GEMINI_MODEL ?? 'gemini-2.5-flash';

export type ChatTurn = {
  role: 'user' | 'model';
  text: string;
};

function endpointUrl(method: 'generateContent' | 'streamGenerateContent'): string {
  if (!API_KEY) {
    throw new Error('Missing EXPO_PUBLIC_GEMINI_API_KEY — copy .env.example to .env');
  }
  const suffix = method === 'streamGenerateContent' ? '&alt=sse' : '';
  return `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:${method}?key=${API_KEY}${suffix}`;
}

// Minimum sentence length before a boundary is honored — avoids chopping at
// abbreviations and after tiny interjections ("Okay." merges forward).
const MIN_SENTENCE_CHARS = 20;
const SENTENCE_ENDINGS = '.!?…。！？';

function extractSentences(text: string, final: boolean): { sentences: string[]; rest: string } {
  const sentences: string[] = [];
  let start = 0;
  for (let i = 0; i < text.length; i++) {
    if (!SENTENCE_ENDINGS.includes(text[i])) {
      continue;
    }
    const next = text[i + 1];
    const boundary = next === undefined || next === ' ' || next === '\n';
    if (boundary && i + 1 - start >= MIN_SENTENCE_CHARS) {
      sentences.push(text.slice(start, i + 1).trim());
      start = i + 1;
    }
  }
  let rest = text.slice(start);
  if (final && rest.trim()) {
    sentences.push(rest.trim());
    rest = '';
  }
  return { sentences, rest };
}

export function hasGeminiKey(): boolean {
  return Boolean(API_KEY);
}

function buildRequestBody(question: string, frameBase64: string | undefined, history: ChatTurn[]) {
  const parts: object[] = [];
  if (frameBase64) {
    parts.push({ inlineData: { mimeType: 'image/jpeg', data: frameBase64 } });
  }
  parts.push({ text: question });
  return {
    systemInstruction: { parts: [{ text: VIZI_SYSTEM_PROMPT }] },
    contents: [
      ...history.map((turn) => ({ role: turn.role, parts: [{ text: turn.text }] })),
      { role: 'user', parts },
    ],
    generationConfig: {
      temperature: 0.4,
      maxOutputTokens: 512,
      // Skip the model's internal "thinking" phase — roughly halves latency
      // for short conversational answers on 2.5 Flash.
      thinkingConfig: { thinkingBudget: 0 },
    },
  };
}

function logRequest(question: string, frameBase64: string | undefined, history: ChatTurn[]) {
  console.log(
    `[vizi:gemini] request → model=${MODEL} question="${question.slice(0, 120)}" frame=${frameBase64 ? `${Math.round(frameBase64.length / 1024)}kb` : 'none'} history=${history.length} turns`,
  );
}

// Streams the answer via SSE and emits complete sentences as they form, so
// TTS can start on sentence one while the rest is still generating. Returns
// the full answer text.
export async function askGeminiStream({
  question,
  frameBase64,
  history,
  onSentence,
  isCanceled,
}: {
  question: string;
  frameBase64?: string;
  history: ChatTurn[];
  onSentence: (sentence: string) => void;
  isCanceled: () => boolean;
}): Promise<string> {
  if (typeof TextDecoder === 'undefined') {
    throw new Error('Streaming unsupported on this runtime');
  }
  const body = buildRequestBody(question, frameBase64, history);
  const startedAt = Date.now();
  logRequest(question, frameBase64, history);

  const response = await expoFetch(endpointUrl('streamGenerateContent'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok || !response.body) {
    const detail = await response.text();
    console.warn(`[vizi:gemini] stream HTTP ${response.status}: ${detail.slice(0, 300)}`);
    throw new Error(`Gemini stream failed (${response.status}): ${detail.slice(0, 200)}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let lineBuffer = '';
  let pending = '';
  let full = '';
  let firstSentence = true;

  const emit = (final: boolean) => {
    const { sentences, rest } = extractSentences(pending, final);
    pending = rest;
    for (const sentence of sentences) {
      if (isCanceled()) {
        return;
      }
      if (firstSentence) {
        firstSentence = false;
        console.log(`[vizi:gemini] first sentence in ${Date.now() - startedAt}ms: "${sentence}"`);
      }
      onSentence(sentence);
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    if (isCanceled()) {
      reader.cancel().catch(() => {});
      break;
    }
    lineBuffer += decoder.decode(value, { stream: true });
    let newlineIndex = lineBuffer.indexOf('\n');
    while (newlineIndex >= 0) {
      const line = lineBuffer.slice(0, newlineIndex).trim();
      lineBuffer = lineBuffer.slice(newlineIndex + 1);
      newlineIndex = lineBuffer.indexOf('\n');
      if (!line.startsWith('data:')) {
        continue;
      }
      const payload = line.slice(5).trim();
      if (!payload || payload === '[DONE]') {
        continue;
      }
      try {
        const chunk = JSON.parse(payload) as {
          candidates?: { content?: { parts?: { text?: string }[] } }[];
        };
        const text =
          chunk.candidates?.[0]?.content?.parts?.map((part) => part.text ?? '').join('') ?? '';
        if (text) {
          full += text;
          pending += text;
          emit(false);
        }
      } catch {
        // Partial/non-JSON keepalive line — ignore.
      }
    }
  }
  emit(true);

  if (!full.trim()) {
    throw new Error('Gemini stream returned an empty answer');
  }
  console.log(`[vizi:gemini] stream complete in ${Date.now() - startedAt}ms: "${full.trim().slice(0, 120)}"`);
  return full.trim();
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
  const body = buildRequestBody(question, frameBase64, history);

  const startedAt = Date.now();
  logRequest(question, frameBase64, history);

  const response = await fetch(endpointUrl('generateContent'), {
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
    usageMetadata?: { promptTokenCount?: number; cachedContentTokenCount?: number };
  };
  const usage = json.usageMetadata;
  if (usage?.promptTokenCount) {
    // Implicit context caching kicks in automatically once the stable prefix
    // (system prompt + early history) passes the model's minimum; cached
    // tokens are billed at a fraction and skip re-processing.
    console.log(
      `[vizi:gemini] tokens: prompt=${usage.promptTokenCount} cached=${usage.cachedContentTokenCount ?? 0}`,
    );
  }
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
