import { CameraView as ExpoCameraView } from 'expo-camera';
import { Redirect, useRouter, type Href } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
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
import { announce } from '@/lib/a11y';
import { useAuthUser } from '@/lib/auth';
import { identifyPurchaser } from '@/lib/purchases';
import { useSettings } from '@/lib/settings';
import { t } from '@/lib/i18n';
import { colors, spacing, typography } from '@/theme';

// Auth gate: the camera session only starts once an account exists (Apple,
// Google, or guest). Split from SessionScreen so hooks stay unconditional.
export default function IndexScreen() {
  const user = useAuthUser();
  const settings = useSettings();

  // Keep the RevenueCat purchaser identity in sync with the Firebase account.
  useEffect(() => {
    if (user !== undefined) {
      identifyPurchaser(user?.uid ?? null);
    }
  }, [user]);

  if (!settings.onboarded) {
    // Fresh install — show the welcome slideshow before anything else.
    return <Redirect href={'/welcome' as Href} />;
  }
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
  const router = useRouter();
  const cameraRef = useRef<ExpoCameraView | null>(null);
  const [muted, setMuted] = useState(false);
  const [chatVisible, setChatVisible] = useState(false);
  const { status, transcript } = useVoiceAgent({ cameraRef, muted });

  useEffect(() => {
    // "connecting" is transient, and "speaking" would have VoiceOver talk over
    // the answer Vizi is playing at that exact moment — the answer itself is
    // the feedback. Both stay readable on the status bar.
    if (status === 'connecting' || status === 'speaking') {
      return;
    }
    announce(statusAnnouncement(status));
  }, [status]);

  // Mute is not a status change, so it needs its own announcement — otherwise
  // the only feedback is a colour swap the user cannot see.
  const mountedRef = useRef(false);
  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }
    announce(muted ? t('statusMuted') : t('annListening'));
  }, [muted]);

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.headerSide} />
        <Text accessibilityRole="header" style={styles.wordmark}>
          Vizi
        </Text>
        <View style={[styles.headerSide, styles.headerRight]}>
          <RoundedButton
            label="Vizi+"
            // "Vizi plus" alone does not say what pressing it does.
            accessibilityLabel={t('openPlusSettings')}
            onPress={() => router.push('/settings' as Href)}
            style={styles.plusButton}
          />
        </View>
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
          size={72}
          onPress={() => setMuted((value) => !value)}
        />
        <IconButton
          svg={CHAT_ICON_SVG}
          accessibilityLabel={chatVisible ? t('hideChat') : t('showChat')}
          accessibilityState={{ expanded: chatVisible }}
          active={chatVisible}
          size={72}
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
    paddingVertical: spacing.md,
  },
  headerSide: {
    flex: 1,
    alignItems: 'flex-start',
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  plusButton: {
    minHeight: 44,
    paddingVertical: spacing.sm,
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
    justifyContent: 'center',
    gap: spacing.xxl,
  },
});
