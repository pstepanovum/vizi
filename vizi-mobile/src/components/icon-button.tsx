import { Image } from 'expo-image';
import { Pressable, StyleSheet } from 'react-native';

import { svgToDataUri } from '@/components/icons';
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
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { width: size, height: size },
        active && styles.active,
        pressed && styles.pressed,
      ]}
    >
      <Image
        source={{ uri: svgToDataUri(svg) }}
        style={{ width: iconSize, height: iconSize }}
        contentFit="contain"
      />
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
    opacity: 0.7,
  },
});
