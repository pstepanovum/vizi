import { ReactNode } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';

import { colors, radius } from '@/theme';

type CameraFrameProps = {
  children?: ReactNode;
  style?: ViewStyle;
};

export function CameraFrame({ children, style }: CameraFrameProps) {
  return <View style={[styles.frame, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  frame: {
    flex: 1,
    borderRadius: radius.xl,
    overflow: 'hidden',
    backgroundColor: colors.gray900,
  },
});
