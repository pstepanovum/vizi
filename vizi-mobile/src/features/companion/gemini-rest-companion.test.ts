import { resolveRestModel, REST_MODEL } from '@/features/companion/gemini-rest-companion';

describe('resolveRestModel', () => {
  it('maps Live/native-audio models to gemini-2.5-flash', () => {
    expect(resolveRestModel('gemini-2.5-flash-native-audio-preview-12-2025')).toBe(REST_MODEL);
    expect(resolveRestModel('gemini-2.0-flash-live-001')).toBe(REST_MODEL);
  });

  it('maps retired 1.5 / 2.0 ids away from generateContent', () => {
    expect(resolveRestModel('gemini-1.5-flash')).toBe(REST_MODEL);
    expect(resolveRestModel('gemini-2.0-flash')).toBe(REST_MODEL);
  });

  it('keeps a normal flash model', () => {
    expect(resolveRestModel('gemini-2.5-flash')).toBe('gemini-2.5-flash');
  });
});
