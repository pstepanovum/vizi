import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Linking, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { type PurchasesPackage } from 'react-native-purchases';

import { RoundedButton } from '@/components/rounded-button';
import { Screen } from '@/components/screen';
import { signOutUser, useAuthUser } from '@/lib/auth';
import { t } from '@/lib/i18n';
import {
  getCurrentOffering,
  hasRevenueCatKey,
  isPlus,
  purchase,
  restorePurchases,
  useCustomerInfo,
} from '@/lib/purchases';
import { setSetting, useSettings } from '@/lib/settings';
import { colors, radius, spacing, typography } from '@/theme';

const PRIVACY_POLICY_URL =
  'https://github.com/pstepanovum/vizi/blob/main/vizi-assets/docs/PRIVACY.md';
const MANAGE_SUBSCRIPTIONS_URL = 'https://apps.apple.com/account/subscriptions';

const PACKAGE_LABELS: Record<string, () => string> = {
  MONTHLY: () => t('packageMonthly'),
  ANNUAL: () => t('packageYearly'),
  LIFETIME: () => t('packageLifetime'),
};

export default function SettingsScreen() {
  const router = useRouter();
  const user = useAuthUser();
  const customerInfo = useCustomerInfo();
  const settings = useSettings();
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const plus = isPlus(customerInfo);

  useEffect(() => {
    if (!hasRevenueCatKey() || plus) {
      return;
    }
    getCurrentOffering()
      .then((offering) => setPackages(offering?.availablePackages ?? []))
      .catch(() => setPackages([]));
  }, [plus]);

  const buy = async (pkg: PurchasesPackage) => {
    setBusy(true);
    setError(null);
    try {
      await purchase(pkg);
    } catch (err) {
      console.warn('[vizi:purchases] purchase failed:', err);
      setError(t('purchaseFailed'));
    } finally {
      setBusy(false);
    }
  };

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
        </View>
        {!plus &&
          (packages.length > 0 ? (
            packages.map((pkg) => (
              <RoundedButton
                key={pkg.identifier}
                label={`${PACKAGE_LABELS[pkg.packageType]?.() ?? pkg.packageType} — ${pkg.product.priceString}`}
                onPress={() => !busy && buy(pkg)}
              />
            ))
          ) : (
            <Text style={styles.caption}>{t('offeringsUnavailable')}</Text>
          ))}
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
});
