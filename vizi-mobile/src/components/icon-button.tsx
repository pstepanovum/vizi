import { Image } from 'expo-image';
import { Pressable, StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';

import { svgToDataUri } from '@/components/icons';
import { usePressBounce } from '@/components/use-press-bounce';
import { colors, radius } from '@/theme';

type IconButtonProps = {
  svg: string;
  accessibilityLabel: string;
  onPress: () => void;
  active?: boolean;
  size?: number;
};

export function IconButton({
  svg,
  accessibilityLabel,
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
