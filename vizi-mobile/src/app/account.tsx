import * as AppleAuthentication from 'expo-apple-authentication';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

import { APPLE_ICON_SVG, GOOGLE_ICON_SVG, MASCOT_SVG, svgToDataUri } from '@/components/icons';
import { PAYWALL_PATTERN_SVG } from '@/components/paywall-pattern';
import { RoundedButton } from '@/components/rounded-button';
import { Screen } from '@/components/screen';
import { signInWithApple, signInWithGoogle, signOutUser, useAuthUser } from '@/lib/auth';
import { t } from '@/lib/i18n';
import { colors, spacing, typography } from '@/theme';

export default function AccountScreen() {
  const router = useRouter();
  const user = useAuthUser();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [appleAvailable, setAppleAvailable] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'ios') {
      AppleAuthentication.isAvailableAsync().then(setAppleAvailable);
    }
  }, []);

  const run = async (signIn: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await signIn();
      router.replace('/');
    } catch (err) {
      console.warn('[vizi:auth] sign-in failed:', err);
      setError(t('authError'));
    } finally {
      setBusy(false);
    }
  };

  if (user) {
    return (
      <Screen style={styles.screen}>
        <Text style={styles.wordmark}>Vizi</Text>
        <View style={styles.body}>
          <Text style={styles.subtitle}>
            {t('signedInAs')} {user.displayName ?? user.email ?? user.uid.slice(0, 8)}
          </Text>
          <RoundedButton label={t('openCamera')} onPress={() => router.replace('/')} />
          <RoundedButton
            label={t('signOut')}
            variant="neutral"
            onPress={() => {
              signOutUser();
            }}
          />
        </View>
      </Screen>
    );
  }

  return (
    <Screen style={styles.screen}>
      <Image
        source={{ uri: svgToDataUri(PAYWALL_PATTERN_SVG) }}
        style={styles.pattern}
        contentFit="cover"
        accessibilityElementsHidden
        importantForAccessibility="no"
      />
      <Image
        source={{ uri: svgToDataUri(MASCOT_SVG) }}
        style={styles.mascot}
        contentFit="contain"
        accessibilityElementsHidden
        importantForAccessibility="no"
      />
      <Text style={styles.wordmark}>Vizi</Text>
      <View style={styles.body}>
        <Text style={styles.title}>{t('accountTitle')}</Text>
        <Text style={styles.subtitle}>{t('accountSubtitle')}</Text>
        {error && <Text style={styles.error}>{error}</Text>}
        {appleAvailable && (
          <RoundedButton
            label={t('continueApple')}
            iconSvg={APPLE_ICON_SVG}
            onPress={() => !busy && run(signInWithApple)}
          />
        )}
        <RoundedButton
          label={t('continueGoogle')}
          iconSvg={GOOGLE_ICON_SVG}
          variant="neutral"
          onPress={() => !busy && run(signInWithGoogle)}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    justifyContent: 'center',
  },
  pattern: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.4,
  },
  mascot: {
    width: 220,
    height: 217,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  wordmark: {
    ...typography.brand,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  body: {
    gap: spacing.md,
  },
  title: {
    ...typography.title,
    color: colors.text,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  error: {
    ...typography.caption,
    color: colors.gray700,
    textAlign: 'center',
  },
});
