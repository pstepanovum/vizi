import * as AppleAuthentication from 'expo-apple-authentication';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

import { RoundedButton } from '@/components/rounded-button';
import { Screen } from '@/components/screen';
import {
  signInAsGuest,
  signInWithApple,
  signInWithGoogle,
  signOutUser,
  useAuthUser,
} from '@/lib/auth';
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
      <Text style={styles.wordmark}>Vizi</Text>
      <View style={styles.body}>
        <Text style={styles.title}>{t('accountTitle')}</Text>
        <Text style={styles.subtitle}>{t('accountSubtitle')}</Text>
        {error && <Text style={styles.error}>{error}</Text>}
        {appleAvailable && (
          <RoundedButton
            label={t('continueApple')}
            onPress={() => !busy && run(signInWithApple)}
          />
        )}
        <RoundedButton
          label={t('continueGoogle')}
          onPress={() => !busy && run(signInWithGoogle)}
        />
        <RoundedButton
          label={t('continueGuest')}
          variant="neutral"
          onPress={() => !busy && run(signInAsGuest)}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    justifyContent: 'center',
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
