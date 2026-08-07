import { bytesToBase64, base64ToBytes, resamplePcm16le24kTo16k } from '@/features/audio/pcm';

describe('pcm helpers', () => {
  it('round-trips base64', () => {
    const original = new Uint8Array([0, 1, 2, 255, 128, 64]);
    expect(Array.from(base64ToBytes(bytesToBase64(original)))).toEqual(Array.from(original));
  });

  it('resamples 24 kHz PCM to 16 kHz at 2/3 length', () => {
    // 6 samples @ 24 kHz → 4 samples @ 16 kHz
    const samples = [1000, 2000, 3000, 4000, 5000, 6000];
    const input = new Uint8Array(samples.length * 2);
    const view = new DataView(input.buffer);
    samples.forEach((s, i) => view.setInt16(i * 2, s, true));

    const out = resamplePcm16le24kTo16k(input);
    expect(out.length).toBe(8); // 4 samples * 2 bytes
  });

  it('returns empty for empty input', () => {
    expect(resamplePcm16le24kTo16k(new Uint8Array(0)).length).toBe(0);
  });
});
