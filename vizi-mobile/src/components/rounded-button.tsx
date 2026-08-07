import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';

import { svgToDataUri } from '@/components/icons';
import { usePressBounce } from '@/components/use-press-bounce';
import { colors, radius, spacing, typography } from '@/theme';

type RoundedButtonProps = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'neutral';
  style?: ViewStyle;
  iconSvg?: string;
  /** Extra context for screen readers when the label alone is ambiguous. */
  accessibilityLabel?: string;
  accessibilityHint?: string;
  /** Work in progress (purchase, restore, sign-in) — announced as "busy". */
  busy?: boolean;
  disabled?: boolean;
};

export function RoundedButton({
  label,
  onPress,
  variant = 'primary',
  style,
  iconSvg,
  accessibilityLabel,
  accessibilityHint,
  busy = false,
  disabled = false,
}: RoundedButtonProps) {
  const { animatedStyle, onPressIn, onPressOut } = usePressBounce();
  const inactive = disabled || busy;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: inactive, busy }}
      disabled={inactive}
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
    >
      {({ pressed }) => (
        <Animated.View
          style={[
            styles.button,
            variant === 'neutral' && styles.neutral,
            pressed && styles.pressed,
            style,
            animatedStyle,
          ]}
        >
          {iconSvg && (
            <Image
              source={{ uri: svgToDataUri(iconSvg) }}
              style={styles.icon}
              contentFit="contain"
              accessibilityElementsHidden
              importantForAccessibility="no"
            />
          )}
          {/* No numberOfLines / adjustsFontSizeToFit: at large Dynamic Type
              sizes those shrank or clipped the label. Wrapping keeps the whole
              meaning visible for low-vision users. */}
          <Text style={styles.label}>{label}</Text>
        </Animated.View>
      )}
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
    opacity: 0.85,
  },
  label: {
    ...typography.button,
    color: colors.textOnPrimary,
    textAlign: 'center',
    flexShrink: 1,
  },
});
