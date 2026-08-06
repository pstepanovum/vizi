import { fetchSessionToken } from '@/lib/api/token';

describe('fetchSessionToken', () => {
  const originalKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
  const originalUrl = process.env.EXPO_PUBLIC_SESSION_TOKEN_URL;

  afterEach(() => {
    process.env.EXPO_PUBLIC_GEMINI_API_KEY = originalKey;
    process.env.EXPO_PUBLIC_SESSION_TOKEN_URL = originalUrl;
  });

  it('returns mock credentials when no API key is configured', async () => {
    delete process.env.EXPO_PUBLIC_GEMINI_API_KEY;
    delete process.env.EXPO_PUBLIC_SESSION_TOKEN_URL;

    const token = await fetchSessionToken();
    expect(token.mock).toBe(true);
    expect(token.apiKey).toBe('');
  });

  it('returns live credentials when an API key is present', async () => {
    delete process.env.EXPO_PUBLIC_SESSION_TOKEN_URL;
    process.env.EXPO_PUBLIC_GEMINI_API_KEY = 'test-key';

    const token = await fetchSessionToken();
    expect(token.mock).toBe(false);
    expect(token.apiKey).toBe('test-key');
    expect(token.wsUrl).toContain('BidiGenerateContent');
    expect(token.wsUrl).toContain('test-key');
  });
});
