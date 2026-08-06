import Constants from 'expo-constants';

import { SessionToken } from '@/features/companion/types';

const DEFAULT_MODEL = 'gemini-2.5-flash-native-audio-preview-12-2025';
const LIVE_WS_PATH =
  'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent';

function resolveModel(): string {
  const extra = Constants.expoConfig?.extra as { geminiModel?: string } | undefined;
  return process.env.EXPO_PUBLIC_GEMINI_MODEL ?? extra?.geminiModel ?? DEFAULT_MODEL;
}

/**
 * Mint session credentials for Gemini Live.
 * Hackathon/local: uses EXPO_PUBLIC_GEMINI_API_KEY when set.
 * Production should replace this with a server that returns ephemeral tokens only.
 */
export async function fetchSessionToken(): Promise<SessionToken> {
  const tokenUrl = process.env.EXPO_PUBLIC_SESSION_TOKEN_URL;
  if (tokenUrl) {
    const response = await fetch(tokenUrl, { method: 'POST' });
    if (!response.ok) {
      throw new Error(`Token service failed (${response.status})`);
    }
    const payload = (await response.json()) as Partial<SessionToken>;
    if (!payload.apiKey || !payload.wsUrl || !payload.model) {
      throw new Error('Token service returned an incomplete payload');
    }
    return {
      sessionId: payload.sessionId ?? `session-${Date.now()}`,
      apiKey: payload.apiKey,
      model: payload.model,
      wsUrl: payload.wsUrl,
      mock: false,
    };
  }

  const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
  const model = resolveModel();

  if (!apiKey) {
    return {
      sessionId: `mock-${Date.now()}`,
      apiKey: '',
      model,
      wsUrl: '',
      mock: true,
    };
  }

  return {
    sessionId: `local-${Date.now()}`,
    apiKey,
    model,
    wsUrl: `${LIVE_WS_PATH}?key=${apiKey}`,
    mock: false,
  };
}
