import { useCameraPermissions } from 'expo-camera';
import { useEffect, useState } from 'react';
import { AccessibilityInfo, StyleSheet, Text, View } from 'react-native';

import { RoundedButton } from '@/components/rounded-button';
import { Screen } from '@/components/screen';
import { CameraView } from '@/features/camera/camera-view';
import { SessionStatusBar } from '@/features/session/session-status-bar';
import {
  SessionStatus,
  statusAnnouncement,
} from '@/features/session/session-status';
import { colors, spacing, typography } from '@/theme';

export default function SessionScreen() {
  const [permission] = useCameraPermissions();
  const [muted, setMuted] = useState(false);
  const [status, setStatus] = useState<SessionStatus>('connecting');

  useEffect(() => {
    if (!permission) {
      return;
    }
    if (!permission.granted) {
      setStatus('needs_permission');
      return;
    }
    // Gemini Live connects in a later phase — present listening UX immediately.
    setStatus('listening');
  }, [permission]);

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

      <CameraView />

      <View style={styles.footer}>
        <RoundedButton
          label={muted ? 'Unmute microphone' : 'Mute microphone'}
          variant="neutral"
          onPress={() => setMuted((value) => !value)}
          style={styles.footerButton}
        />
        <RoundedButton
          label="Repeat last answer"
          variant="neutral"
          onPress={() => {
            // Wired when TTS / Live playback exists.
          }}
          style={styles.footerButton}
        />
        <RoundedButton
          label="Reconnect"
          onPress={() => {
            setStatus('connecting');
            requestAnimationFrame(() => {
              setStatus(permission?.granted ? 'listening' : 'needs_permission');
            });
          }}
        />
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
