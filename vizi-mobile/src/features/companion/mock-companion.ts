import { CompanionEvents, VisionCompanion } from '@/features/companion/types';

/**
 * Offline / no-API-key companion for simulator demos and unit tests.
 * Still exercises the same session contract as Gemini Live.
 */
export function createMockCompanion(events: CompanionEvents): VisionCompanion {
  let lastReply: string | null = null;
  let latestFrame: string | null = null;
  let active = false;
  let replyTimer: ReturnType<typeof setTimeout> | null = null;

  const clearTimer = () => {
    if (replyTimer) {
      clearTimeout(replyTimer);
      replyTimer = null;
    }
  };

  return {
    async prepare() {},

    async startSession() {
      active = true;
      events.onStatus('connecting');
      await new Promise((resolve) => setTimeout(resolve, 150));
      if (active) {
        events.onStatus('listening');
      }
    },

    pushFrame(jpegBase64: string) {
      if (!active) {
        return;
      }
      latestFrame = jpegBase64.slice(0, 32);
    },

    submitUtterance(text: string) {
      if (!active) {
        return;
      }
      const trimmed = text.trim();
      if (!trimmed) {
        return;
      }

      clearTimer();
      events.onStatus('thinking');

      replyTimer = setTimeout(() => {
        const hasFrame = Boolean(latestFrame);
        const reply = hasFrame
          ? `I can see your camera view. You asked: "${trimmed}". In mock mode I describe the scene without calling Gemini.`
          : `You asked: "${trimmed}". Point your camera so I can see, then ask again.`;
        lastReply = reply;
        events.onStatus('speaking');
        events.onPartialReply?.(reply);
        events.onFinalReply(reply);
        events.onStatus('listening');
      }, 400);
    },

    stopPlayback() {
      clearTimer();
      if (active) {
        events.onStatus('listening');
      }
    },

    async stopSession() {
      active = false;
      clearTimer();
      latestFrame = null;
    },

    getLastReply() {
      return lastReply;
    },
  };
}
