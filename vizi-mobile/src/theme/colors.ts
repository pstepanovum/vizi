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
  overlay: 'rgba(255, 255, 255, 0.55)',
  text: grayscale.gray900,
  textMuted: grayscale.gray500,
  textOnPrimary: grayscale.gray900,
} as const;
