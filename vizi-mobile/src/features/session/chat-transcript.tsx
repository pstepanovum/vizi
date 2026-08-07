import { BlurView } from 'expo-blur';
import { useRef } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { TranscriptEntry } from '@/features/voice/use-voice-agent';
import { colors, radius, spacing, typography } from '@/theme';

type ChatTranscriptProps = {
  entries: TranscriptEntry[];
};

export function ChatTranscript({ entries }: ChatTranscriptProps) {
  const scrollRef = useRef<ScrollView>(null);

  return (
    <BlurView intensity={40} tint="light" style={styles.panel}>
      {entries.length === 0 ? (
        <Text style={styles.empty}>The conversation will appear here.</Text>
      ) : (
        <ScrollView
          ref={scrollRef}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
          contentContainerStyle={styles.scrollContent}
        >
          {entries.map((entry) => (
            <View key={entry.id} style={styles.entry}>
              <Text style={styles.speaker}>{entry.speaker === 'user' ? 'You' : 'Vizi'}</Text>
              <Text style={styles.text}>{entry.text}</Text>
            </View>
          ))}
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
    backgroundColor: colors.overlay,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
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
  empty: {
    ...typography.body,
    color: colors.gray500,
    textAlign: 'center',
    paddingVertical: spacing.md,
  },
});
