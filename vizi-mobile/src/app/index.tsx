import { useCameraPermissions } from 'expo-camera';
import { useEffect, useState } from 'react';
import { AccessibilityInfo, StyleSheet, Text, View } from 'react-native';

import { RoundedButton } from '@/components/rounded-button';
import { Screen } from '@/components/screen';
import { LiveCameraView } from '@/features/camera/live-camera-view';
import { SessionStatusBar } from '@/features/session/session-status-bar';
import { statusAnnouncement } from '@/features/session/session-status';
import { useSessionController } from '@/features/session/use-session-controller';
import { colors, spacing, typography } from '@/theme';

export default function SessionScreen() {
  const [permission] = useCameraPermissions();
  const [cameraGranted, setCameraGranted] = useState(false);
  const {
    cameraRef,
    status,
    muted,
    toggleMute,
    repeatLast,
    reconnect,
  } = useSessionController(cameraGranted);

  useEffect(() => {
    setCameraGranted(Boolean(permission?.granted));
  }, [permission?.granted]);

  useEffect(() => {
    if (status === 'connecting') {
      return;
    }
    AccessibilityInfo.announceForAccessibility(statusAnnouncement(status));
  }, [status]);

  return (
    <Screen>
      <View style={styles.header}>
        <Text accessibilityRole="header" style={styles.wordmark}>
          Vizi
        </Text>
        <SessionStatusBar status={status} muted={muted} />
      </View>

      <LiveCameraView
        ref={cameraRef}
        onPermissionChange={setCameraGranted}
      />

      <View style={styles.footer}>
        <RoundedButton
          label={muted ? 'Unmute microphone' : 'Mute microphone'}
          variant="neutral"
          onPress={toggleMute}
          style={styles.footerButton}
        />
        <RoundedButton
          label="Repeat last answer"
          variant="neutral"
          onPress={repeatLast}
          style={styles.footerButton}
        />
        <RoundedButton label="Reconnect" onPress={reconnect} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  wordmark: {
    ...typography.brand,
    color: colors.text,
  },
  footer: {
    paddingTop: spacing.lg,
    gap: spacing.sm,
  },
  footerButton: {
    alignSelf: 'stretch',
  },
});
