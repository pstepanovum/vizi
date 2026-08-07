import { createCompanion } from '@/features/companion/create-companion';

jest.mock('@/features/companion/gemini-live-companion', () => ({
  createGeminiLiveCompanion: jest.fn(() => ({
    prepare: jest.fn(),
    startSession: jest.fn(),
    pushFrame: jest.fn(),
    submitUtterance: jest.fn(),
    stopPlayback: jest.fn(),
    stopSession: jest.fn(),
    getLastReply: jest.fn(() => null),
  })),
}));

jest.mock('@/lib/api/token', () => ({
  fetchSessionToken: jest.fn(),
}));

import { createGeminiLiveCompanion } from '@/features/companion/gemini-live-companion';
import { fetchSessionToken } from '@/lib/api/token';

const events = {
  onStatus: jest.fn(),
  onFinalReply: jest.fn(),
  onError: jest.fn(),
};

describe('createCompanion', () => {
  const originalCompanion = process.env.EXPO_PUBLIC_COMPANION;

  afterEach(() => {
    process.env.EXPO_PUBLIC_COMPANION = originalCompanion;
    jest.clearAllMocks();
  });

  it('uses mock when EXPO_PUBLIC_COMPANION=mock', async () => {
    process.env.EXPO_PUBLIC_COMPANION = 'mock';
    const result = await createCompanion(events);
    expect(result.mode).toBe('mock');
    expect(fetchSessionToken).not.toHaveBeenCalled();
  });

  it('uses direct Gemini Live when a session token is available', async () => {
    process.env.EXPO_PUBLIC_COMPANION = 'auto';
    (fetchSessionToken as jest.Mock).mockResolvedValue({
      sessionId: 's1',
      apiKey: 'key',
      model: 'gemini-test',
      wsUrl: 'wss://example/ws?key=key',
      mock: false,
    });

    const result = await createCompanion(events);
    expect(result.mode).toBe('live');
    expect(createGeminiLiveCompanion).toHaveBeenCalled();
  });

  it('falls back to mock when no API key / token is mock', async () => {
    process.env.EXPO_PUBLIC_COMPANION = 'websocket';
    (fetchSessionToken as jest.Mock).mockResolvedValue({
      sessionId: 'mock',
      apiKey: '',
      model: 'gemini-test',
      wsUrl: '',
      mock: true,
    });

    const result = await createCompanion(events);
    expect(result.mode).toBe('mock');
  });
});
