import { CameraView as ExpoCameraView, useCameraPermissions } from 'expo-camera';
import { RefObject } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { CameraFrame } from '@/components/camera-frame';
import { RoundedButton } from '@/components/rounded-button';
import { t } from '@/lib/i18n';
import { colors, radius, spacing, typography } from '@/theme';

type CameraViewProps = {
  cameraRef?: RefObject<ExpoCameraView | null>;
};

export function CameraView({ cameraRef }: CameraViewProps) {
  const [permission, requestPermission] = useCameraPermissions();

  if (!permission) {
    return <CameraFrame />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionCard}>
        <Text style={styles.permissionText}>{t('cameraPermission')}</Text>
        <RoundedButton label={t('enableCamera')} onPress={requestPermission} />
      </View>
    );
  }

  return (
    <CameraFrame>
      <ExpoCameraView ref={cameraRef} style={styles.camera} facing="back" animateShutter={false} />
    </CameraFrame>
  );
}

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
