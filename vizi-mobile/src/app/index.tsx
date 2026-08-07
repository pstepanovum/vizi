import { CameraView as ExpoCameraView } from 'expo-camera';
import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, StyleSheet, Text, View } from 'react-native';

import { RoundedButton } from '@/components/rounded-button';
import { Screen } from '@/components/screen';
import { CameraView } from '@/features/camera/camera-view';
import { SessionStatusBar } from '@/features/session/session-status-bar';
import { statusAnnouncement } from '@/features/session/session-status';
import { useVoiceAgent } from '@/features/voice/use-voice-agent';
import { colors, spacing, typography } from '@/theme';

export default function SessionScreen() {
  const cameraRef = useRef<ExpoCameraView | null>(null);
  const [muted, setMuted] = useState(false);
  const { status, repeatLastAnswer, reconnect } = useVoiceAgent({ cameraRef, muted });

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

      <CameraView cameraRef={cameraRef} />

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
          onPress={repeatLastAnswer}
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
