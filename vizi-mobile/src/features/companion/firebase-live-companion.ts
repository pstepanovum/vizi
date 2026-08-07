import {
  GoogleAIBackend,
  ResponseModality,
  getAI,
  getLiveGenerativeModel,
  type LiveSession,
} from '@react-native-firebase/ai';
import { getApp } from '@react-native-firebase/app';
import Constants from 'expo-constants';

import { VIZI_SYSTEM_PROMPT } from '@/features/companion/prompts';
import { CompanionEvents, VisionCompanion } from '@/features/companion/types';
import { ensureAppCheck } from '@/lib/firebase-app-check';

const DEFAULT_MODEL = 'gemini-2.5-flash-native-audio-preview-12-2025';

function resolveModel(): string {
  const extra = Constants.expoConfig?.extra as { geminiModel?: string } | undefined;
  return process.env.EXPO_PUBLIC_GEMINI_MODEL ?? extra?.geminiModel ?? DEFAULT_MODEL;
}

/**
 * Gemini Live via Firebase AI Logic (Google AI backend).
 * Uses the Firebase app config from GoogleService-Info.plist — no client Gemini API key.
 */
export function createFirebaseLiveCompanion(events: CompanionEvents): VisionCompanion {
  let session: LiveSession | null = null;
  let receiveLoop: Promise<void> | null = null;
  let lastReply = '';
  let transcriptBuffer = '';
  let ready = false;
  let closed = false;

  const handleServerMessage = (message: {
    type?: string;
    modelTurn?: { parts?: Array<{ text?: string }> };
    turnComplete?: boolean;
    interrupted?: boolean;
    outputTranscription?: { text?: string };
  }) => {
    if (message.type !== 'serverContent') {
      return;
    }

    if (message.interrupted) {
      events.onStatus('listening');
      return;
    }

    const chunk = message.outputTranscription?.text;
    if (chunk) {
      transcriptBuffer += chunk;
      events.onStatus('speaking');
      events.onPartialReply?.(transcriptBuffer);
    }

    const textParts = message.modelTurn?.parts
      ?.map((part) => part.text)
      .filter(Boolean)
      .join('');
    if (textParts) {
      transcriptBuffer += textParts;
      events.onStatus('speaking');
      events.onPartialReply?.(transcriptBuffer);
    }

    if (message.turnComplete) {
      const finalText = transcriptBuffer.trim();
      transcriptBuffer = '';
      if (finalText) {
        lastReply = finalText;
        events.onFinalReply(finalText);
      }
      events.onStatus('listening');
    }
  };

  return {
    async prepare() {
      // Native Firebase + App Check for com.vizi.mobile.app (not web).
      getApp();
      await ensureAppCheck();
    },

    async startSession() {
      closed = false;
      events.onStatus('connecting');

      const appCheck = await ensureAppCheck();
      const ai = getAI(getApp(), {
        backend: new GoogleAIBackend(),
        appCheck,
      });
      const liveModel = getLiveGenerativeModel(ai, {
        model: resolveModel(),
        systemInstruction: VIZI_SYSTEM_PROMPT,
        generationConfig: {
          responseModalities: [ResponseModality.AUDIO],
          inputAudioTranscription: {},
          outputAudioTranscription: {},
        },
      });

      session = await liveModel.connect();
      ready = true;
      events.onStatus('listening');

      receiveLoop = (async () => {
        try {
          for await (const message of session!.receive()) {
            if (closed) {
              break;
            }
            handleServerMessage(message);
          }
        } catch (error) {
          if (!closed) {
            events.onError(error instanceof Error ? error : new Error(String(error)));
            events.onStatus('error');
          }
        } finally {
          ready = false;
        }
      })();
    },

    pushFrame(jpegBase64: string) {
      if (!ready || !session || !jpegBase64) {
        return;
      }
      void session.sendVideoRealtime({
        mimeType: 'image/jpeg',
        data: jpegBase64,
      });
    },

    submitUtterance(text: string) {
      const trimmed = text.trim();
      if (!ready || !session || !trimmed) {
        return;
      }
      events.onStatus('thinking');
      void session.sendTextRealtime(trimmed);
    },

    stopPlayback() {
      if (ready) {
        events.onStatus('listening');
      }
    },

    async stopSession() {
      closed = true;
      ready = false;
      const active = session;
      session = null;
      try {
        await active?.close();
      } catch {
        // Session may already be closed.
      }
      if (receiveLoop) {
        await receiveLoop.catch(() => undefined);
        receiveLoop = null;
      }
    },

    getLastReply() {
      return lastReply || null;
    },
  };
}

export function isFirebaseLiveAvailable(): boolean {
  try {
    getApp();
    return true;
  } catch {
    return false;
  }
}
