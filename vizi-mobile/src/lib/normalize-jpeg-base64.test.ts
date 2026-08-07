import { normalizeJpegBase64 } from '@/lib/normalize-jpeg-base64';

describe('normalizeJpegBase64', () => {
  it('strips data URL prefix used by expo-camera on web', () => {
    const raw = '/9j/abc+/=';
    expect(normalizeJpegBase64(`data:image/jpeg;base64,${raw}`)).toBe(raw);
    expect(normalizeJpegBase64(`data:image/jpg;base64,${raw}`)).toBe(raw);
  });

  it('leaves raw base64 unchanged', () => {
    expect(normalizeJpegBase64(' /9j/abc+/=\n ')).toBe('/9j/abc+/=');
  });

  it('returns empty for blank input', () => {
    expect(normalizeJpegBase64('')).toBe('');
    expect(normalizeJpegBase64('   ')).toBe('');
  });
});
