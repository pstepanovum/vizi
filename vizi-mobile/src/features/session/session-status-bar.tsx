import { StyleSheet, Text, View } from 'react-native';

import { t } from '@/lib/i18n';
import { colors, radius, spacing, typography } from '@/theme';

import { SessionStatus, statusLabel } from './session-status';

type SessionStatusBarProps = {
  status: SessionStatus;
  muted?: boolean;
};

export function SessionStatusBar({ status, muted = false }: SessionStatusBarProps) {
  const label = muted && status === 'listening' ? t('statusMuted') : statusLabel(status);

  return (
    <View
      accessibilityLiveRegion="polite"
      accessibilityRole="text"
      style={styles.bar}
    >
      <View style={[styles.dot, muted ? styles.dotMuted : styles.dotActive]} />
      <Text style={styles.label} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    backgroundColor: colors.gray100,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: radius.full,
  },
  dotActive: {
    backgroundColor: colors.primary,
  },
  dotMuted: {
    backgroundColor: colors.gray400,
  },
  label: {
    ...typography.caption,
    color: colors.text,
    flexShrink: 1,
  },
});
