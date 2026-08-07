import { Buffer } from 'buffer';

/** Encode raw bytes to base64 for Gemini Live realtimeInput.audio. */
export function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  // Prefer global btoa when available (Hermes / browser).
  if (typeof btoa === 'function') {
    return btoa(binary);
  }
  return Buffer.from(bytes).toString('base64');
}

export function base64ToBytes(base64: string): Uint8Array {
  if (typeof atob === 'function') {
    const binary = atob(base64);
    const out = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      out[i] = binary.charCodeAt(i);
    }
    return out;
  }
  return new Uint8Array(Buffer.from(base64, 'base64'));
}

/**
 * Linear resample signed 16-bit little-endian PCM mono from 24 kHz → 16 kHz
 * for playback engines that only accept 16 kHz (e.g. expo-two-way-audio).
 */
export function resamplePcm16le24kTo16k(input: Uint8Array): Uint8Array {
  const inSamples = Math.floor(input.length / 2);
  if (inSamples === 0) {
    return new Uint8Array(0);
  }

  const outSamples = Math.floor((inSamples * 2) / 3);
  const out = new Uint8Array(outSamples * 2);
  const viewIn = new DataView(input.buffer, input.byteOffset, input.byteLength);
  const viewOut = new DataView(out.buffer);

  for (let i = 0; i < outSamples; i += 1) {
    const src = (i * 3) / 2;
    const i0 = Math.floor(src);
    const i1 = Math.min(i0 + 1, inSamples - 1);
    const frac = src - i0;
    const s0 = viewIn.getInt16(i0 * 2, true);
    const s1 = viewIn.getInt16(i1 * 2, true);
    const mixed = Math.round(s0 + (s1 - s0) * frac);
    viewOut.setInt16(i * 2, mixed, true);
  }

  return out;
}
