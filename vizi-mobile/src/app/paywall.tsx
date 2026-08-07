import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { type PurchasesPackage } from 'react-native-purchases';

import { MASCOT_SVG, svgToDataUri } from '@/components/icons';
import { PAYWALL_PATTERN_SVG } from '@/components/paywall-pattern';
import { RoundedButton } from '@/components/rounded-button';
import { Screen } from '@/components/screen';
import { t } from '@/lib/i18n';
import {
  getCurrentOffering,
  hasRevenueCatKey,
  isPlus,
  purchase,
  restorePurchases,
  useCustomerInfo,
} from '@/lib/purchases';
import { colors, radius, spacing, typography } from '@/theme';

const PRIVACY_POLICY_URL =
  'https://github.com/pstepanovum/vizi/blob/main/vizi-assets/docs/PRIVACY.md';
const TERMS_OF_USE_URL =
  'https://github.com/pstepanovum/vizi/blob/main/vizi-assets/docs/TERMS.md';

const PACKAGE_LABELS: Record<string, () => string> = {
  MONTHLY: () => t('packageMonthly'),
  ANNUAL: () => t('packageYearly'),
  LIFETIME: () => t('packageLifetime'),
};

export default function PaywallScreen() {
  const router = useRouter();
  const customerInfo = useCustomerInfo();
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const plus = isPlus(customerInfo);

  useEffect(() => {
    if (!hasRevenueCatKey()) {
      return;
    }
    getCurrentOffering()
      .then((offering) => setPackages(offering?.availablePackages ?? []))
      .catch(() => setPackages([]));
  }, []);

  useEffect(() => {
    if (plus) {
      // Purchase landed — close the paywall.
      router.back();
    }
  }, [plus, router]);

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

  const benefits = [t('benefitUnlimited'), t('toggleAmbient'), t('benefitSpeed'), t('benefitVoice')];

  return (
    <Screen>
      <Image
        source={{ uri: svgToDataUri(PAYWALL_PATTERN_SVG) }}
        style={styles.pattern}
        contentFit="cover"
        accessibilityElementsHidden
        importantForAccessibility="no"
      />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Image
          source={{ uri: svgToDataUri(MASCOT_SVG) }}
          style={styles.mascot}
          contentFit="contain"
          accessibilityElementsHidden
          importantForAccessibility="no"
        />
        <Text accessibilityRole="header" style={styles.title}>
          {t('paywallTitle')}
        </Text>
        <View style={styles.benefits}>
          {benefits.map((benefit) => (
            <Text key={benefit} style={styles.benefit}>
              {benefit}
            </Text>
          ))}
        </View>
        {packages.length > 0 ? (
          packages.map((pkg, index) => (
            <RoundedButton
              key={pkg.identifier}
              label={`${PACKAGE_LABELS[pkg.packageType]?.() ?? pkg.packageType} — ${pkg.product.priceString}`}
              variant={index === 0 ? 'primary' : 'neutral'}
              onPress={() => !busy && buy(pkg)}
            />
          ))
        ) : (
          <Text style={styles.caption}>{t('offeringsUnavailable')}</Text>
        )}
        {error && (
          <Text style={styles.caption} accessibilityLiveRegion="assertive">
            {error}
          </Text>
        )}
        <View style={styles.legalRow}>
          <Text
            accessibilityRole="link"
            style={styles.legalLink}
            onPress={async () => {
              if (busy) {
                return;
              }
              setBusy(true);
              try {
                await restorePurchases();
              } catch {
                setError(t('purchaseFailed'));
              } finally {
                setBusy(false);
              }
            }}
          >
            {t('restorePurchases')}
          </Text>
          <Text style={styles.legalDivider}>·</Text>
          <Text
            accessibilityRole="link"
            style={styles.legalLink}
            onPress={() => Linking.openURL(PRIVACY_POLICY_URL)}
          >
            {t('privacyPolicy')}
          </Text>
          <Text style={styles.legalDivider}>·</Text>
          <Text
            accessibilityRole="link"
            style={styles.legalLink}
            onPress={() => Linking.openURL(TERMS_OF_USE_URL)}
          >
            {t('termsOfUse')}
          </Text>
        </View>
      </ScrollView>
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
    gap: spacing.sm,
    paddingVertical: spacing.lg,
  },
  mascot: {
    width: 160,
    height: 158,
    alignSelf: 'center',
  },
  title: {
    ...typography.title,
    color: colors.text,
    textAlign: 'center',
    marginVertical: spacing.md,
  },
  benefits: {
    borderRadius: radius.lg,
    backgroundColor: colors.overlay,
    padding: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  benefit: {
    ...typography.body,
    color: colors.text,
  },
  caption: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
  },
  legalRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  legalLink: {
    ...typography.caption,
    color: colors.gray500,
    textDecorationLine: 'underline',
  },
  legalDivider: {
    ...typography.caption,
    color: colors.gray400,
  },
});
