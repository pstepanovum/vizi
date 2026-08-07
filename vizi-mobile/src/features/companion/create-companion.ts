import { createGeminiLiveCompanion } from '@/features/companion/gemini-live-companion';
import {
  createGeminiRestCompanion,
  shouldUseRestCompanion,
} from '@/features/companion/gemini-rest-companion';
import { createMockCompanion } from '@/features/companion/mock-companion';
import { CompanionEvents, CompanionMode, VisionCompanion } from '@/features/companion/types';
import { fetchSessionToken } from '@/lib/api/token';

function requestedMode(): 'auto' | 'websocket' | 'mock' {
  const value = (process.env.EXPO_PUBLIC_COMPANION ?? 'auto').toLowerCase();
  if (value === 'websocket' || value === 'mock' || value === 'api-key' || value === 'firebase') {
    if (value === 'mock') {
      return 'mock';
    }
    return 'websocket';
  }
  return 'auto';
}

/**
 * Direct Gemini via EXPO_PUBLIC_GEMINI_API_KEY.
 * Native/Simulator: Live WebSocket. Web preview: REST generateContent fallback.
 */
export async function createCompanion(events: CompanionEvents): Promise<{
  companion: VisionCompanion;
  mode: CompanionMode;
}> {
  const mode = requestedMode();

  if (mode === 'mock') {
    return { companion: createMockCompanion(events), mode: 'mock' };
  }

  const token = await fetchSessionToken();
  if (token.mock) {
    return { companion: createMockCompanion(events), mode: 'mock' };
  }

  if (shouldUseRestCompanion()) {
    return {
      companion: createGeminiRestCompanion(token, events),
      mode: 'live',
    };
  }

  return {
    companion: createGeminiLiveCompanion(token, events),
    mode: 'live',
  };
}
