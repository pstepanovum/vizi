import { useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { RoundedButton } from '@/components/rounded-button';
import { Screen } from '@/components/screen';
import { signOutUser, useAuthUser } from '@/lib/auth';
import { t } from '@/lib/i18n';
import { isPlus, restorePurchases, useCustomerInfo } from '@/lib/purchases';
import { setSetting, useSettings } from '@/lib/settings';
import { remainingFreeQuestions } from '@/lib/usage';
import { colors, radius, spacing, typography } from '@/theme';

const PRIVACY_POLICY_URL =
  'https://github.com/pstepanovum/vizi/blob/main/vizi-assets/docs/PRIVACY.md';
const TERMS_OF_USE_URL =
  'https://github.com/pstepanovum/vizi/blob/main/vizi-assets/docs/TERMS.md';
const MANAGE_SUBSCRIPTIONS_URL = 'https://apps.apple.com/account/subscriptions';

// Languages shown as their native names — recognizable regardless of the
// currently active UI language.
const LANGUAGE_OPTIONS: { code: string; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' },
  { code: 'de', label: 'Deutsch' },
  { code: 'it', label: 'Italiano' },
  { code: 'pt', label: 'Português' },
  { code: 'ru', label: 'Русский' },
  { code: 'uk', label: 'Українська' },
  { code: 'zh', label: '中文' },
  { code: 'ja', label: '日本語' },
  { code: 'ko', label: '한국어' },
  { code: 'ar', label: 'العربية' },
];

export default function SettingsScreen() {
  const router = useRouter();
  const user = useAuthUser();
  const customerInfo = useCustomerInfo();
  const settings = useSettings();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const plus = isPlus(customerInfo);

  const restore = async () => {
    setBusy(true);
    setError(null);
    try {
      await restorePurchases();
    } catch (err) {
      console.warn('[vizi:purchases] restore failed:', err);
      setError(t('purchaseFailed'));
    } finally {
      setBusy(false);
    }
  };

  const expiration = customerInfo?.entitlements.active.plus?.expirationDate;

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text accessibilityRole="header" style={styles.title}>
          {t('settingsTitle')}
        </Text>

        <Text accessibilityRole="header" style={styles.section}>
          {t('sectionSubscription')}
        </Text>
        <View style={styles.card}>
          <Text style={styles.body} accessibilityLiveRegion="polite">
            {plus ? t('plusActive') : t('plusInactive')}
          </Text>
          {plus && expiration && (
            <Text style={styles.caption}>
              {t('renewalLabel')}: {new Date(expiration).toLocaleDateString()}
            </Text>
          )}
          {!plus && (
            <Text style={styles.caption}>
              {t('questionsLeftLabel')}: {remainingFreeQuestions()}
            </Text>
          )}
        </View>
        {!plus && (
          <RoundedButton
            label={t('paywallTitle')}
            onPress={() => router.push('/paywall' as Href)}
          />
        )}
        {error && (
          <Text style={styles.caption} accessibilityLiveRegion="assertive">
            {error}
          </Text>
        )}
        {plus ? (
          <RoundedButton
            label={t('manageSubscription')}
            variant="neutral"
            onPress={() => Linking.openURL(MANAGE_SUBSCRIPTIONS_URL)}
          />
        ) : (
          <RoundedButton
            label={t('restorePurchases')}
            variant="neutral"
            onPress={() => !busy && restore()}
          />
        )}

        <Text accessibilityRole="header" style={styles.section}>
          {t('sectionPreferences')}
        </Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.body}>{t('toggleHaptics')}</Text>
            <Switch
              accessibilityLabel={t('toggleHaptics')}
              value={settings.haptics}
              onValueChange={(value) => setSetting('haptics', value)}
              trackColor={{ true: colors.primary, false: colors.gray300 }}
            />
          </View>
          <View style={styles.row}>
            <Text style={styles.body}>{t('toggleAmbient')}</Text>
            <Switch
              accessibilityLabel={t('toggleAmbient')}
              value={settings.ambientNarration}
              onValueChange={(value) => setSetting('ambientNarration', value)}
              trackColor={{ true: colors.primary, false: colors.gray300 }}
            />
          </View>
          <View style={styles.row}>
            <Text style={styles.body}>{t('toggleLargeText')}</Text>
            <Switch
              accessibilityLabel={t('toggleLargeText')}
              value={settings.largeText}
              onValueChange={(value) => setSetting('largeText', value)}
              trackColor={{ true: colors.primary, false: colors.gray300 }}
            />
          </View>
          <View style={styles.row}>
            <Text style={styles.body}>{t('toggleHighContrast')}</Text>
            <Switch
              accessibilityLabel={t('toggleHighContrast')}
              value={settings.highContrast}
              onValueChange={(value) => setSetting('highContrast', value)}
              trackColor={{ true: colors.primary, false: colors.gray300 }}
            />
          </View>
        </View>

        <Text accessibilityRole="header" style={styles.section}>
          {t('sectionLanguage')}
        </Text>
        <View style={styles.pillWrap}>
          {[{ code: 'auto', label: t('languageAuto') }, ...LANGUAGE_OPTIONS].map(
            ({ code, label }) => {
              const selected = settings.language === code;
              return (
                <Pressable
                  key={code}
                  accessibilityRole="button"
                  accessibilityLabel={label}
                  accessibilityState={{ selected }}
                  onPress={() => setSetting('language', code)}
                  style={({ pressed }) => [
                    styles.pill,
                    selected && styles.pillSelected,
                    pressed && styles.pillPressed,
                  ]}
                >
                  <Text style={styles.pillLabel}>{label}</Text>
                </Pressable>
              );
            },
          )}
        </View>

        <Text accessibilityRole="header" style={styles.section}>
          {t('sectionAccount')}
        </Text>
        <View style={styles.card}>
          <Text style={styles.body}>
            {t('signedInAs')} {user?.displayName ?? user?.email ?? user?.uid.slice(0, 8) ?? '—'}
          </Text>
        </View>
        <RoundedButton
          label={t('signOut')}
          variant="neutral"
          onPress={() => {
            signOutUser();
            router.back();
          }}
        />
        <RoundedButton
          label={t('privacyPolicy')}
          variant="neutral"
          onPress={() => Linking.openURL(PRIVACY_POLICY_URL)}
        />
        <RoundedButton
          label={t('termsOfUse')}
          variant="neutral"
          onPress={() => Linking.openURL(TERMS_OF_USE_URL)}
        />

        <RoundedButton label={t('done')} onPress={() => router.back()} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.sm,
    paddingVertical: spacing.lg,
  },
  title: {
    ...typography.title,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  section: {
    ...typography.caption,
    color: colors.gray500,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: spacing.lg,
  },
  card: {
    borderRadius: radius.lg,
    backgroundColor: colors.gray100,
    padding: spacing.md,
    gap: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  body: {
    ...typography.body,
    color: colors.text,
    flexShrink: 1,
  },
  caption: {
    ...typography.caption,
    color: colors.textMuted,
  },
  pillWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  pill: {
    borderRadius: radius.full,
    backgroundColor: colors.gray100,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  pillSelected: {
    backgroundColor: colors.primary,
  },
  pillPressed: {
    opacity: 0.7,
  },
  pillLabel: {
    ...typography.body,
    color: colors.text,
  },
});
