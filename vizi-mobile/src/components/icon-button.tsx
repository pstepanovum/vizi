import { Image } from 'expo-image';
import { Pressable, StyleSheet } from 'react-native';

import { svgToDataUri } from '@/components/icons';
import { colors, radius } from '@/theme';

type IconButtonProps = {
  svg: string;
  accessibilityLabel: string;
  onPress: () => void;
  active?: boolean;
};

export function IconButton({ svg, accessibilityLabel, onPress, active = false }: IconButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [styles.button, active && styles.active, pressed && styles.pressed]}
    >
      <Image source={{ uri: svgToDataUri(svg) }} style={styles.icon} contentFit="contain" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 64,
    height: 64,
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
  icon: {
    width: 28,
    height: 28,
  },
});
