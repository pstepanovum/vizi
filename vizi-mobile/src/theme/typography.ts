export const fonts = {
  brand: 'Chunk',
  regular: 'Poppins_400Regular',
  medium: 'Poppins_500Medium',
  semibold: 'Poppins_600SemiBold',
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
    fontFamily: fonts.regular,
    fontSize: 16,
    lineHeight: 24,
  },
  button: {
    fontFamily: fonts.semibold,
    fontSize: 16,
  },
  caption: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 20,
  },
} as const;
