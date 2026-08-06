import { CameraView as ExpoCameraView, useCameraPermissions, type CameraView } from 'expo-camera';
import { forwardRef, useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { CameraFrame } from '@/components/camera-frame';
import { RoundedButton } from '@/components/rounded-button';
import { colors, radius, spacing, typography } from '@/theme';

type Props = {
  onPermissionChange?: (granted: boolean) => void;
};

export const LiveCameraView = forwardRef<CameraView, Props>(function LiveCameraView(
  { onPermissionChange },
  ref,
) {
  const [permission, requestPermission] = useCameraPermissions();

  useEffect(() => {
    if (!permission) {
      return;
    }
    onPermissionChange?.(permission.granted);
  }, [permission, onPermissionChange]);

  if (!permission) {
    return <CameraFrame />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionCard}>
        <Text style={styles.permissionText}>
          Vizi needs the camera to see and describe the world around you.
        </Text>
        <RoundedButton label="Enable Camera" onPress={() => void requestPermission()} />
      </View>
    );
  }

  return (
    <CameraFrame>
      <ExpoCameraView
        ref={ref}
        style={styles.camera}
        facing="back"
        mode="picture"
        animateShutter={false}
      />
    </CameraFrame>
  );
});

const styles = StyleSheet.create({
  camera: {
    flex: 1,
  },
  permissionCard: {
    flex: 1,
    borderRadius: radius.xl,
    backgroundColor: colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.lg,
  },
  permissionText: {
    ...typography.body,
    color: colors.text,
    textAlign: 'center',
  },
});
