import { BlurView } from 'expo-blur';
import { useRef } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { TranscriptEntry } from '@/features/voice/use-voice-agent';
import { t } from '@/lib/i18n';
import { useSettings } from '@/lib/settings';
import { colors, radius, spacing, typography } from '@/theme';

const LARGE_TEXT_SCALE = 1.35;

type ChatTranscriptProps = {
  entries: TranscriptEntry[];
};

export function ChatTranscript({ entries }: ChatTranscriptProps) {
  const scrollRef = useRef<ScrollView>(null);
  const { largeText, highContrast } = useSettings();

  const textStyle = [
    styles.text,
    largeText && {
      fontSize: typography.body.fontSize * LARGE_TEXT_SCALE,
      lineHeight: typography.body.lineHeight * LARGE_TEXT_SCALE,
    },
    highContrast && styles.textHighContrast,
  ];

  return (
    <BlurView
      intensity={55}
      tint="extraLight"
      style={[styles.panel, highContrast && styles.panelHighContrast]}
    >
      {entries.length === 0 ? (
        <Text style={[styles.empty, highContrast && styles.textHighContrast]}>
          {t('chatEmpty')}
        </Text>
      ) : (
        <ScrollView
          ref={scrollRef}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
          contentContainerStyle={styles.scrollContent}
        >
          {entries.map((entry) => {
            const speaker = entry.speaker === 'user' ? t('you') : 'Vizi';
            return (
              // Grouped: VoiceOver reads "Vizi: the answer" as one item rather
              // than splitting the speaker and the message into two swipes.
              <View
                key={entry.id}
                accessible
                accessibilityRole="text"
                accessibilityLabel={`${speaker}: ${entry.text}`}
                style={styles.entry}
              >
                <Text style={[styles.speaker, highContrast && styles.textHighContrast]}>
                  {speaker}
                </Text>
                <Text style={textStyle}>{entry.text}</Text>
              </View>
            );
          })}
        </ScrollView>
      )}
    </BlurView>
  );
}

const styles = StyleSheet.create({
  panel: {
    maxHeight: 240,
    borderRadius: radius.lg,
    overflow: 'hidden',
    // Liquid-glass: real blur behind a thin white wash keeps text readable
    // while the camera stays visible through the panel.
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  // High contrast: no translucency — solid white behind pure black text.
  panelHighContrast: {
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  entry: {
    gap: spacing.xs,
  },
  speaker: {
    ...typography.caption,
    color: colors.gray500,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  text: {
    ...typography.body,
    color: colors.gray900,
  },
  textHighContrast: {
    color: '#000000',
  },
  empty: {
    ...typography.body,
    color: colors.gray500,
    textAlign: 'center',
    paddingVertical: spacing.md,
  },
});
