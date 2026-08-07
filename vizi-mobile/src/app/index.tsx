import { CameraView as ExpoCameraView } from 'expo-camera';
import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, StyleSheet, Text, View } from 'react-native';

import { IconButton } from '@/components/icon-button';
import { CHAT_ICON_SVG, GEAR_ICON_SVG, MIC_OFF_ICON_SVG, MIC_ON_ICON_SVG } from '@/components/icons';
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
        <View style={styles.headerSide}>
          <SessionStatusBar status={status} muted={muted} />
        </View>
        <Text accessibilityRole="header" style={styles.wordmark}>
          Vizi
        </Text>
        <View style={[styles.headerSide, styles.headerRight]}>
          <IconButton
            svg={GEAR_ICON_SVG}
            accessibilityLabel="Settings"
            size={44}
            onPress={() => {
              // Settings screen comes later.
            }}
          />
        </View>
      </View>

      <View style={styles.cameraArea}>
        <CameraView cameraRef={cameraRef} />
        {chatVisible && (
          <View style={styles.chatOverlay}>
            <ChatTranscript entries={transcript} />
          </View>
        )}
      </View>

      <View style={styles.footer}>
        <IconButton
          svg={muted ? MIC_OFF_ICON_SVG : MIC_ON_ICON_SVG}
          accessibilityLabel={muted ? 'Unmute microphone' : 'Mute microphone'}
          active={muted}
          onPress={() => setMuted((value) => !value)}
        />
        <RoundedButton
          label="Repeat"
          variant="neutral"
          onPress={repeatLastAnswer}
          style={styles.rowButton}
        />
        <RoundedButton label="Ask again" onPress={askAgain} style={styles.rowButton} />
        <IconButton
          svg={CHAT_ICON_SVG}
          accessibilityLabel={chatVisible ? 'Hide chat' : 'Show chat'}
          active={chatVisible}
          onPress={() => setChatVisible((value) => !value)}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  headerSide: {
    flex: 1,
    alignItems: 'flex-start',
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  wordmark: {
    ...typography.brand,
    color: colors.text,
  },
  cameraArea: {
    flex: 1,
  },
  chatOverlay: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    bottom: spacing.md,
  },
  footer: {
    paddingTop: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  rowButton: {
    flex: 1,
  },
});
