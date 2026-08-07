import { Pressable, StyleSheet, Text, ViewStyle } from 'react-native';

import { colors, radius, spacing, typography } from '@/theme';

type RoundedButtonProps = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'neutral';
  style?: ViewStyle;
};

export function RoundedButton({ label, onPress, variant = 'primary', style }: RoundedButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        variant === 'neutral' && styles.neutral,
        pressed && styles.pressed,
        style,
      ]}
    >
      <Text style={styles.label} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 64,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  neutral: {
    backgroundColor: colors.gray200,
  },
  pressed: {
    opacity: 0.7,
  },
  label: {
    ...typography.button,
    color: colors.textOnPrimary,
  },
});
