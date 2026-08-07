/**
 * Expo Camera on web returns canvas.toDataURL() for `base64` (a full data URI).
 * Gemini generateContent expects raw base64 bytes only.
 */
export function normalizeJpegBase64(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }
  const dataUrl = /^data:image\/[a-z0-9.+-]+;base64,(.+)$/i.exec(trimmed);
  if (dataUrl?.[1]) {
    return dataUrl[1].replace(/\s/g, '');
  }
  // Some web paths may still include a bare data: prefix without a clean match.
  const comma = trimmed.indexOf(',');
  if (trimmed.startsWith('data:') && comma !== -1) {
    return trimmed.slice(comma + 1).replace(/\s/g, '');
  }
  return trimmed.replace(/\s/g, '');
}
