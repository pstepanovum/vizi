// Ported 1:1 from vizi-mobile/src/theme/*. Values are in points, exactly as the
// app uses them — the device screen is rendered at point size and then scaled,
// so every number here means the same thing it does on device.

export const palette = {
  cream: '#F2EAE0',
  primary: '#B4D3D9',
  lilac: '#BDA6CE',
  purple: '#9B8EC7',
} as const;

export const grayscale = {
  white: '#FFFFFF',
  gray50: '#FAFAFA',
  gray100: '#F5F5F5',
  gray200: '#E5E5E5',
  gray300: '#D4D4D4',
  gray400: '#A3A3A3',
  gray500: '#737373',
  gray600: '#525252',
  gray700: '#404040',
  gray800: '#262626',
  gray900: '#171717',
  black: '#000000',
} as const;

export const colors = {
  ...palette,
  ...grayscale,
  background: palette.cream,
  overlay: 'rgba(255, 255, 255, 0.75)',
  text: grayscale.gray900,
  textMuted: grayscale.gray600,
  textOnPrimary: grayscale.gray900,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radius = {
  sm: 12,
  md: 20,
  lg: 32,
  xl: 40,
  full: 999,
} as const;

export const fonts = {
  brand: 'Chunk',
  // React Native loads Poppins as three separate families; on the web it is one
  // family with three weights.
  body: 'Poppins',
} as const;

export const weight = {
  regular: 400,
  medium: 500,
  semibold: 600,
} as const;

/** Matches vizi-mobile/src/theme/typography.ts. */
export const typography = {
  brand: { fontFamily: fonts.brand, fontSize: 28, letterSpacing: 1 },
  title: { fontFamily: fonts.brand, fontSize: 22 },
  body: { fontFamily: fonts.body, fontWeight: weight.regular, fontSize: 16, lineHeight: '24px' },
  button: { fontFamily: fonts.body, fontWeight: weight.semibold, fontSize: 16 },
  caption: { fontFamily: fonts.body, fontWeight: weight.regular, fontSize: 13, lineHeight: '20px' },
} as const;

/** `svgToDataUri` from vizi-mobile/src/components/icons.ts. */
export function svgToDataUri(svg: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
