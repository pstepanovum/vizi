import { Platform } from 'react-native';

import { VIZI_SYSTEM_PROMPT } from '@/features/companion/prompts';
import { CompanionEvents, SessionToken, VisionCompanion } from '@/features/companion/types';

type GenerateContentResponse = {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
  }>;
  error?: { message?: string };
};

/**
 * Turn-based Gemini companion for platforms where Live WebSockets are unreliable
 * (notably some browser / preview environments). Uses generateContent with the
 * latest camera frame + utterance.
 */
export function createGeminiRestCompanion(
  token: SessionToken,
  events: CompanionEvents,
): VisionCompanion {
  let lastFrame: string | null = null;
  let lastReply: string | null = null;
  let ready = false;
  let abort: AbortController | null = null;

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${token.model.includes('native-audio') || token.model.includes('live') ? 'gemini-2.5-flash' : token.model}:generateContent?key=${encodeURIComponent(token.apiKey)}`;

  return {
    async prepare() {},

    async startSession() {
      events.onStatus('connecting');
      ready = true;
      events.onStatus('listening');
    },

    pushFrame(jpegBase64: string) {
      if (jpegBase64) {
        lastFrame = jpegBase64;
      }
    },

    submitUtterance(text: string) {
      const trimmed = text.trim();
      if (!ready || !trimmed) {
        return;
      }

      abort?.abort();
      abort = new AbortController();
      events.onStatus('thinking');

      void (async () => {
        try {
          const parts: Array<Record<string, unknown>> = [{ text: trimmed }];
          if (lastFrame) {
            parts.unshift({
              inline_data: {
                mime_type: 'image/jpeg',
                data: lastFrame,
              },
            });
          }

          const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: abort.signal,
            body: JSON.stringify({
              system_instruction: { parts: [{ text: VIZI_SYSTEM_PROMPT }] },
              contents: [{ role: 'user', parts }],
            }),
          });

          const payload = (await response.json()) as GenerateContentResponse;
          if (!response.ok) {
            throw new Error(payload.error?.message ?? `Gemini HTTP ${response.status}`);
          }

          const reply =
            payload.candidates?.[0]?.content?.parts
              ?.map((part) => part.text)
              .filter(Boolean)
              .join('')
              .trim() ?? '';

          if (!reply) {
            throw new Error('Gemini returned an empty reply');
          }

          lastReply = reply;
          events.onStatus('speaking');
          events.onFinalReply(reply);
          events.onStatus('listening');
        } catch (error) {
          if ((error as { name?: string }).name === 'AbortError') {
            return;
          }
          events.onError(error instanceof Error ? error : new Error(String(error)));
          events.onStatus('error');
        }
      })();
    },

    stopPlayback() {
      abort?.abort();
      if (ready) {
        events.onStatus('listening');
      }
    },

    async stopSession() {
      ready = false;
      abort?.abort();
      abort = null;
    },

    getLastReply() {
      return lastReply;
    },
  };
}

export function shouldUseRestCompanion(): boolean {
  return Platform.OS === 'web';
}
