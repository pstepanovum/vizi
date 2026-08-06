import { createGeminiLiveCompanion } from '@/features/companion/gemini-live-companion';
import { createMockCompanion } from '@/features/companion/mock-companion';
import { CompanionEvents, VisionCompanion } from '@/features/companion/types';
import { fetchSessionToken } from '@/lib/api/token';

export async function createCompanion(events: CompanionEvents): Promise<{
  companion: VisionCompanion;
  mode: 'live' | 'mock';
}> {
  const forceMock = process.env.EXPO_PUBLIC_COMPANION === 'mock';
  const token = await fetchSessionToken();

  if (forceMock || token.mock) {
    return { companion: createMockCompanion(events), mode: 'mock' };
  }

  return {
    companion: createGeminiLiveCompanion(token, events),
    mode: 'live',
  };
}
