import { CameraView as ExpoCameraView, useCameraPermissions } from 'expo-camera';
import { RefObject } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { CameraFrame } from '@/components/camera-frame';
import { RoundedButton } from '@/components/rounded-button';
import { t } from '@/lib/i18n';
import { useSettings } from '@/lib/settings';
import { colors, radius, spacing, typography } from '@/theme';

const LARGE_TEXT_SCALE = 1.35;

type CameraViewProps = {
  cameraRef?: RefObject<ExpoCameraView | null>;
};

export function CameraView({ cameraRef }: CameraViewProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const { largeText } = useSettings();

  if (!permission) {
    return <CameraFrame />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionCard}>
        <Text
          accessibilityRole="text"
          style={[
            styles.permissionText,
            largeText && {
              fontSize: typography.body.fontSize * LARGE_TEXT_SCALE,
              lineHeight: typography.body.lineHeight * LARGE_TEXT_SCALE,
            },
          ]}
        >
          {t('cameraPermission')}
        </Text>
        <RoundedButton label={t('enableCamera')} onPress={requestPermission} />
      </View>
    );
  }

  return (
    <CameraFrame>
      {/* The live preview means nothing to a VoiceOver user (and with the
          screen curtain on it is not even rendered). Everything it would
          convey reaches them through the status bar and Vizi's speech, so keep
          it out of the accessibility tree entirely. */}
      <ExpoCameraView
        ref={cameraRef}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={styles.camera}
        facing="back"
        animateShutter={false}
        // Full-sensor stills are ~1MB+ of base64 per turn; Gemini downsamples
        // to 768px tiles anyway. 720p keeps label text readable and cuts
        // upload time by 3-5x on cellular.
        pictureSize="1280x720"
      />
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
