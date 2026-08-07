import { VIZI_SYSTEM_PROMPT } from '@/features/companion/prompts';
import {
  CompanionEvents,
  SessionToken,
  VisionCompanion,
} from '@/features/companion/types';

type ServerMessage = {
  setupComplete?: object;
  serverContent?: {
    interrupted?: boolean;
    turnComplete?: boolean;
    outputTranscription?: { text?: string };
    modelTurn?: {
      parts?: Array<{ text?: string; inlineData?: { data?: string; mimeType?: string } }>;
    };
  };
};

export function createGeminiLiveCompanion(
  token: SessionToken,
  events: CompanionEvents,
): VisionCompanion {
  let ws: WebSocket | null = null;
  let lastReply = '';
  let transcriptBuffer = '';
  let ready = false;
  let closed = false;

  const send = (payload: unknown) => {
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(payload));
    }
  };

  return {
    async prepare() {
      // Token already minted by caller.
    },

    async startSession() {
      closed = false;
      events.onStatus('connecting');

      await new Promise<void>((resolve, reject) => {
        const socket = new WebSocket(token.wsUrl);
        ws = socket;
        let settled = false;

        const settle = (fn: () => void) => {
          if (settled) {
            return;
          }
          settled = true;
          fn();
        };

        const timeout = setTimeout(() => {
          settle(() => {
            reject(new Error('Timed out connecting to Gemini Live'));
            socket.close();
          });
        }, 15000);

        socket.onopen = () => {
          send({
            setup: {
              model: `models/${token.model}`,
              generationConfig: {
                responseModalities: ['AUDIO'],
              },
              systemInstruction: {
                parts: [{ text: VIZI_SYSTEM_PROMPT }],
              },
              inputAudioTranscription: {},
              outputAudioTranscription: {},
            },
          });
        };

        socket.onmessage = (event) => {
          try {
            const message = JSON.parse(String(event.data)) as ServerMessage;

            if (message.setupComplete) {
              clearTimeout(timeout);
              ready = true;
              events.onStatus('listening');
              settle(() => resolve());
              return;
            }

            const content = message.serverContent;
            if (!content) {
              return;
            }

            if (content.interrupted) {
              events.onStatus('listening');
              return;
            }

            const chunk = content.outputTranscription?.text;
            if (chunk) {
              transcriptBuffer += chunk;
              events.onStatus('speaking');
              events.onPartialReply?.(transcriptBuffer);
            }

            const textParts = content.modelTurn?.parts
              ?.filter((part) => part.text && !(part as { thought?: boolean }).thought)
              ?.map((part) => part.text)
              .filter(Boolean)
              .join('');
            if (textParts) {
              transcriptBuffer += textParts;
              events.onPartialReply?.(transcriptBuffer);
            }

            if (content.turnComplete) {
              const finalText = transcriptBuffer.trim();
              transcriptBuffer = '';
              if (finalText) {
                lastReply = finalText;
                events.onFinalReply(finalText);
              }
              events.onStatus('listening');
            }
          } catch (error) {
            events.onError(error instanceof Error ? error : new Error(String(error)));
          }
        };

        socket.onerror = () => {
          clearTimeout(timeout);
          const error = new Error('Gemini Live WebSocket error');
          events.onError(error);
          settle(() => reject(error));
        };

        socket.onclose = (event) => {
          ready = false;
          if (!closed && !settled) {
            clearTimeout(timeout);
            const reason = event.reason || `code ${event.code}`;
            const error = new Error(`Gemini Live closed: ${reason}`);
            events.onError(error);
            settle(() => reject(error));
            events.onStatus('error');
          } else if (!closed && settled && !ready) {
            events.onStatus('error');
          }
        };
      });
    },

    pushFrame(jpegBase64: string) {
      if (!ready || !jpegBase64) {
        return;
      }
      send({
        realtimeInput: {
          video: {
            mimeType: 'image/jpeg',
            data: jpegBase64,
          },
        },
      });
    },

    submitUtterance(text: string) {
      const trimmed = text.trim();
      if (!ready || !trimmed) {
        return;
      }
      events.onStatus('thinking');
      send({
        clientContent: {
          turns: [
            {
              role: 'user',
              parts: [{ text: trimmed }],
            },
          ],
          turnComplete: true,
        },
      });
    },

    stopPlayback() {
      // Barge-in: mark listening; audio queue is flushed by the session hook.
      if (ready) {
        events.onStatus('listening');
      }
    },

    async stopSession() {
      closed = true;
      ready = false;
      ws?.close();
      ws = null;
    },

    getLastReply() {
      return lastReply || null;
    },
  };
}
