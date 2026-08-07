import { CameraView as ExpoCameraView } from 'expo-camera';
import { Redirect, type Href } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';

import { IconButton } from '@/components/icon-button';
import { CHAT_ICON_SVG, MIC_OFF_ICON_SVG, MIC_ON_ICON_SVG } from '@/components/icons';
import { RoundedButton } from '@/components/rounded-button';
import { Screen } from '@/components/screen';
import { CameraView } from '@/features/camera/camera-view';
import { ChatTranscript } from '@/features/session/chat-transcript';
import { SessionStatusBar } from '@/features/session/session-status-bar';
import { statusAnnouncement } from '@/features/session/session-status';
import { useVoiceAgent } from '@/features/voice/use-voice-agent';
import { useAuthUser } from '@/lib/auth';
import { identifyPurchaser } from '@/lib/purchases';
import { t } from '@/lib/i18n';
import { colors, spacing, typography } from '@/theme';

// Auth gate: the camera session only starts once an account exists (Apple,
// Google, or guest). Split from SessionScreen so hooks stay unconditional.
export default function IndexScreen() {
  const user = useAuthUser();

  // Keep the RevenueCat purchaser identity in sync with the Firebase account.
  useEffect(() => {
    if (user !== undefined) {
      identifyPurchaser(user?.uid ?? null);
    }
  }, [user]);

  if (user === undefined) {
    return <Screen />;
  }
  if (user === null) {
    // Cast until `expo start` regenerates typed routes with the new screen.
    return <Redirect href={'/account' as Href} />;
  }
  return <SessionScreen />;
}

function SessionScreen() {
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
      </View>

      <View style={styles.cameraArea}>
        <CameraView cameraRef={cameraRef} />
        <View style={styles.statusOverlay}>
          <SessionStatusBar status={status} muted={muted} />
        </View>
        {chatVisible && (
          <Animated.View
            entering={FadeInDown.duration(220)}
            exiting={FadeOutDown.duration(180)}
            style={styles.chatOverlay}
          >
            <ChatTranscript entries={transcript} />
          </Animated.View>
        )}
      </View>

      <View style={styles.footer}>
        <IconButton
          svg={muted ? MIC_OFF_ICON_SVG : MIC_ON_ICON_SVG}
          accessibilityLabel={muted ? t('unmute') : t('mute')}
          active={muted}
          onPress={() => setMuted((value) => !value)}
        />
        <RoundedButton
          label={t('repeat')}
          variant="neutral"
          onPress={repeatLastAnswer}
          style={styles.rowButton}
        />
        <RoundedButton label={t('askAgain')} onPress={askAgain} style={styles.rowButton} />
        <IconButton
          svg={CHAT_ICON_SVG}
          accessibilityLabel={chatVisible ? t('hideChat') : t('showChat')}
          active={chatVisible}
          onPress={() => setChatVisible((value) => !value)}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  wordmark: {
    ...typography.brand,
    color: colors.text,
  },
  cameraArea: {
    flex: 1,
  },
  statusOverlay: {
    position: 'absolute',
    top: spacing.md,
    left: 0,
    right: 0,
    alignItems: 'center',
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
