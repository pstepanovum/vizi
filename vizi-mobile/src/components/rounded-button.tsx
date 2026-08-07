import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, ViewStyle } from 'react-native';

import { svgToDataUri } from '@/components/icons';
import { colors, radius, spacing, typography } from '@/theme';

type RoundedButtonProps = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'neutral';
  style?: ViewStyle;
  iconSvg?: string;
};

export function RoundedButton({
  label,
  onPress,
  variant = 'primary',
  style,
  iconSvg,
}: RoundedButtonProps) {
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
      {iconSvg && (
        <Image source={{ uri: svgToDataUri(iconSvg) }} style={styles.icon} contentFit="contain" />
      )}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  icon: {
    width: 22,
    height: 22,
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
