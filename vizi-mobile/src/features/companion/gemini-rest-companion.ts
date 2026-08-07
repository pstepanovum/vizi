import { Platform } from 'react-native';

import { VIZI_SYSTEM_PROMPT } from '@/features/companion/prompts';
import { CompanionEvents, SessionToken, VisionCompanion } from '@/features/companion/types';
import { normalizeJpegBase64 } from '@/lib/normalize-jpeg-base64';

type GenerateContentResponse = {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
  }>;
  error?: { message?: string; status?: string };
};

/** Live/native-audio models cannot serve generateContent; use a multimodal text model. */
export const REST_MODEL = 'gemini-2.5-flash';

export function resolveRestModel(liveModel: string): string {
  const model = liveModel.trim();
  if (
    !model ||
    model.includes('native-audio') ||
    model.includes('live') ||
    model.startsWith('gemini-1.5') ||
    model.startsWith('gemini-2.0')
  ) {
    return REST_MODEL;
  }
  return model;
}

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

  const restModel = resolveRestModel(token.model);
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${restModel}:generateContent?key=${encodeURIComponent(token.apiKey)}`;

  return {
    /** Exposed for UI / debugging the web fallback model. */
    restModel,

    async prepare() {},

    async startSession() {
      events.onStatus('connecting');
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        console.info(`[vizi] web REST companion using model ${restModel}`);
      }
      ready = true;
      events.onStatus('listening');
    },

    pushFrame(jpegBase64: string) {
      const normalized = normalizeJpegBase64(jpegBase64);
      if (normalized) {
        lastFrame = normalized;
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
            throw new Error(
              payload.error?.message ??
                `Gemini HTTP ${response.status} (${restModel})`,
            );
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
          const next = error instanceof Error ? error : new Error(String(error));
          if (typeof __DEV__ !== 'undefined' && __DEV__) {
            console.error('[vizi] REST companion error', next.message);
          }
          events.onError(next);
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
