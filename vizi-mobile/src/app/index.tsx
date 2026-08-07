import { CameraView as ExpoCameraView } from 'expo-camera';
import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, StyleSheet, Text, View } from 'react-native';

import { RoundedButton } from '@/components/rounded-button';
import { Screen } from '@/components/screen';
import { CameraView } from '@/features/camera/camera-view';
import { ChatTranscript } from '@/features/session/chat-transcript';
import { SessionStatusBar } from '@/features/session/session-status-bar';
import { statusAnnouncement } from '@/features/session/session-status';
import { useVoiceAgent } from '@/features/voice/use-voice-agent';
import { colors, spacing, typography } from '@/theme';

export default function SessionScreen() {
  const cameraRef = useRef<ExpoCameraView | null>(null);
  const [muted, setMuted] = useState(false);
  const [chatVisible, setChatVisible] = useState(false);
  const { status, repeatLastAnswer, askAgain, transcript } = useVoiceAgent({ cameraRef, muted });

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

      {chatVisible && <ChatTranscript entries={transcript} />}

      <View style={styles.footer}>
        <View style={styles.buttonRow}>
          <RoundedButton
            label={muted ? 'Unmute' : 'Mute'}
            variant="neutral"
            onPress={() => setMuted((value) => !value)}
            style={styles.rowButton}
          />
          <RoundedButton
            label={chatVisible ? 'Hide chat' : 'Show chat'}
            variant="neutral"
            onPress={() => setChatVisible((value) => !value)}
            style={styles.rowButton}
          />
        </View>
        <View style={styles.buttonRow}>
          <RoundedButton
            label="Repeat answer"
            variant="neutral"
            onPress={repeatLastAnswer}
            style={styles.rowButton}
          />
          <RoundedButton label="Ask again" onPress={askAgain} style={styles.rowButton} />
        </View>
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
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  rowButton: {
    flex: 1,
  },
});
