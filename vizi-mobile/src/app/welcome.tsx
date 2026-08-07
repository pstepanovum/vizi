import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import { Image } from 'expo-image';
import { useRouter, type Href } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, StyleSheet, Text, View } from 'react-native';

import { MASCOT_SVG, svgToDataUri } from '@/components/icons';
import { PAYWALL_PATTERN_SVG } from '@/components/paywall-pattern';
import { RoundedButton } from '@/components/rounded-button';
import { Screen } from '@/components/screen';
import { welcomeAudioSource, type WelcomeSlide } from '@/features/onboarding/welcome-audio';
import { t } from '@/lib/i18n';
import { setSetting } from '@/lib/settings';
import { colors, spacing, typography } from '@/theme';

const SLIDES: WelcomeSlide[] = [1, 2, 3];

// First-launch welcome slideshow with a pre-recorded voiceover per slide.
export default function WelcomeScreen() {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const playerRef = useRef<AudioPlayer | null>(null);

  const stopVoiceover = useCallback(() => {
    const player = playerRef.current;
    playerRef.current = null;
    if (player) {
      try {
        player.release();
      } catch {
        // Already released — nothing to do.
      }
    }
  }, []);

  // Play the slide's recorded narration on mount and on every slide change.
  useEffect(() => {
    stopVoiceover();
    const player = createAudioPlayer(welcomeAudioSource(SLIDES[index]));
    player.volume = 1.0;
    playerRef.current = player;
    player.addListener('playbackStatusUpdate', (status) => {
      if (status.didJustFinish && playerRef.current === player) {
        playerRef.current = null;
        player.release();
      }
    });
    player.play();
    return stopVoiceover;
  }, [index, stopVoiceover]);

  const title = t(`welcomeTitle${SLIDES[index]}`);
  const body = t(`welcomeBody${SLIDES[index]}`);

  // Mirror the narration for VoiceOver users.
  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(`${title}. ${body}`);
  }, [title, body]);

  const finish = useCallback(() => {
    stopVoiceover();
    setSetting('onboarded', true);
    router.replace('/' as Href);
  }, [router, stopVoiceover]);

  const lastSlide = index === SLIDES.length - 1;

  return (
    <Screen>
      <Image
        source={{ uri: svgToDataUri(PAYWALL_PATTERN_SVG) }}
        style={styles.pattern}
        contentFit="cover"
        accessibilityElementsHidden
        importantForAccessibility="no"
      />
      <View style={styles.content}>
        <Image
          source={{ uri: svgToDataUri(MASCOT_SVG) }}
          style={styles.mascot}
          contentFit="contain"
          accessibilityElementsHidden
          importantForAccessibility="no"
        />
        <View style={styles.slide}>
          <Text accessibilityRole="header" style={styles.title}>
            {title}
          </Text>
          <Text style={styles.body}>{body}</Text>
        </View>
        <View style={styles.dots} accessibilityElementsHidden importantForAccessibility="no">
          {SLIDES.map((slide, dotIndex) => (
            <View
              key={slide}
              style={[styles.dot, dotIndex === index ? styles.dotActive : styles.dotInactive]}
            />
          ))}
        </View>
        <View style={styles.buttons}>
          <RoundedButton
            label={lastSlide ? t('welcomeStart') : t('welcomeNext')}
            onPress={() => (lastSlide ? finish() : setIndex((value) => value + 1))}
          />
          {!lastSlide && <RoundedButton label={t('welcomeSkip')} variant="neutral" onPress={finish} />}
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pattern: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.4,
  },
  content: {
    flex: 1,
    paddingVertical: spacing.lg,
  },
  mascot: {
    width: 160,
    height: 158,
    alignSelf: 'center',
  },
  slide: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
  },
  title: {
    ...typography.brand,
    color: colors.text,
    textAlign: 'center',
  },
  body: {
    ...typography.body,
    color: colors.text,
    textAlign: 'center',
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  dotActive: {
    backgroundColor: colors.primary,
  },
  dotInactive: {
    backgroundColor: colors.gray300,
  },
  buttons: {
    gap: spacing.sm,
  },
});
