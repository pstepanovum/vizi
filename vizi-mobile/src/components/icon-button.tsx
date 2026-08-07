import { Image } from 'expo-image';
import { AccessibilityState, Pressable, StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';

import { svgToDataUri } from '@/components/icons';
import { usePressBounce } from '@/components/use-press-bounce';
import { colors, radius } from '@/theme';

type IconButtonProps = {
  svg: string;
  accessibilityLabel: string;
  accessibilityHint?: string;
  /** Extra state (e.g. expanded) merged over the selected state from `active`. */
  accessibilityState?: AccessibilityState;
  onPress: () => void;
  active?: boolean;
  size?: number;
};

export function IconButton({
  svg,
  accessibilityLabel,
  accessibilityHint,
  accessibilityState,
  onPress,
  active = false,
  size = 64,
}: IconButtonProps) {
  const iconSize = Math.round(size * 0.44);
  const { animatedStyle, onPressIn, onPressOut } = usePressBounce();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      // The "active" tint is the only visual cue that this control is engaged;
      // `selected` is its non-visual equivalent.
      accessibilityState={{ selected: active, ...accessibilityState }}
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
    >
      {({ pressed }) => (
        <Animated.View
          style={[
            styles.button,
            { width: size, height: size },
            active && styles.active,
            pressed && styles.pressed,
            animatedStyle,
          ]}
        >
          <Image
            source={{ uri: svgToDataUri(svg) }}
            style={{ width: iconSize, height: iconSize }}
            contentFit="contain"
            accessibilityElementsHidden
            importantForAccessibility="no"
          />
        </Animated.View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: radius.full,
    backgroundColor: colors.gray200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  active: {
    backgroundColor: colors.primary,
  },
  pressed: {
    opacity: 0.85,
  },
});
