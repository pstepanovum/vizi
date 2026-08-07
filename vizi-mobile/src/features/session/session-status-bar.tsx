import { StyleSheet, Text, View } from 'react-native';

import { t } from '@/lib/i18n';
import { useSettings } from '@/lib/settings';
import { colors, radius, spacing, typography } from '@/theme';

import { SessionStatus, statusLabel } from './session-status';

const LARGE_TEXT_SCALE = 1.35;

type SessionStatusBarProps = {
  status: SessionStatus;
  muted?: boolean;
};

export function SessionStatusBar({ status, muted = false }: SessionStatusBarProps) {
  const { largeText, highContrast } = useSettings();
  const label = muted && status === 'listening' ? t('statusMuted') : statusLabel(status);
  // The dot's colour is the only visual mute indicator, and it stays grey while
  // Vizi thinks or speaks. Spell the mute state out for anyone who cannot see
  // it, without repeating it when the label already says so.
  const spokenLabel = muted && label !== t('statusMuted') ? `${label}. ${t('statusMuted')}` : label;

  return (
    <View
      accessible
      accessibilityLabel={spokenLabel}
      accessibilityLiveRegion="polite"
      accessibilityRole="text"
      style={[styles.bar, highContrast && styles.barHighContrast]}
    >
      <View
        accessibilityElementsHidden
        importantForAccessibility="no"
        style={[styles.dot, muted ? styles.dotMuted : styles.dotActive]}
      />
      {/* Wraps instead of shrinking: truncating "Camera access needed" would
          hide the one thing the user has to act on. */}
      <Text
        style={[
          styles.label,
          largeText && {
            fontSize: typography.caption.fontSize * LARGE_TEXT_SCALE,
            lineHeight: typography.caption.lineHeight * LARGE_TEXT_SCALE,
          },
          highContrast && styles.labelHighContrast,
        ]}
      >
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
  barHighContrast: {
    backgroundColor: '#FFFFFF',
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
  labelHighContrast: {
    color: '#000000',
  },
});
