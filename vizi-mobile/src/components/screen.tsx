import { ReactNode } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, spacing } from '@/theme';

type ScreenProps = {
  children?: ReactNode;
  style?: ViewStyle;
  /**
   * Presented over another screen — traps VoiceOver inside this view so swiping
   * never wanders onto the covered screen underneath.
   */
  isModal?: boolean;
};

export function Screen({ children, style, isModal = false }: ScreenProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      accessibilityViewIsModal={isModal}
      style={[
        styles.container,
        { paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, spacing.md) },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
  },
});
