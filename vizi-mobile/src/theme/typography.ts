import { Platform } from 'react-native';

export const fonts = {
  brand: 'Chunk',
  body: Platform.select({ ios: 'System', default: 'sans-serif' }) as string,
} as const;

export const typography = {
  brand: {
    fontFamily: fonts.brand,
    fontSize: 28,
    letterSpacing: 1,
  },
  title: {
    fontFamily: fonts.brand,
    fontSize: 22,
  },
  body: {
    fontFamily: fonts.body,
    fontSize: 17,
    lineHeight: 24,
  },
  button: {
    fontFamily: fonts.body,
    fontSize: 19,
    fontWeight: '600' as const,
  },
  caption: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
  },
} as const;
