import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { type PurchasesPackage } from 'react-native-purchases';

import { CHECK_ICON_SVG, MASCOT_SVG, svgToDataUri, UNLOCK_ICON_SVG } from '@/components/icons';
import { PAYWALL_PATTERN_SVG } from '@/components/paywall-pattern';
import { RoundedButton } from '@/components/rounded-button';
import { Screen } from '@/components/screen';
import { announce, useScreenAnnouncement } from '@/lib/a11y';
import { t } from '@/lib/i18n';
import {
  getCurrentOffering,
  hasRevenueCatKey,
  isPlus,
  purchase,
  restorePurchases,
  useCustomerInfo,
} from '@/lib/purchases';
import { colors, spacing, typography } from '@/theme';

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

  useScreenAnnouncement(t('paywallTitle'));

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
      // Purchase landed — say so before the screen disappears, otherwise the
      // only feedback a VoiceOver user gets is the paywall vanishing.
      announce(t('purchaseSuccess'));
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
      // accessibilityLiveRegion is Android-only — speak the failure on iOS.
      announce(t('purchaseFailed'));
    } finally {
      setBusy(false);
    }
  };

  const restore = async () => {
    setBusy(true);
    setError(null);
    try {
      await restorePurchases();
    } catch {
      setError(t('purchaseFailed'));
      announce(t('purchaseFailed'));
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
            // Grouped so the checkmark and its text read as a single item.
            <View key={benefit} accessible accessibilityRole="text" style={styles.benefitRow}>
              <Image
                source={{ uri: svgToDataUri(CHECK_ICON_SVG) }}
                style={styles.benefitIcon}
                contentFit="contain"
                accessibilityElementsHidden
                importantForAccessibility="no"
              />
              <Text style={styles.benefit}>{benefit}</Text>
            </View>
          ))}
        </View>
        {packages.length > 0 ? (
          packages.map((pkg, index) => (
            <RoundedButton
              key={pkg.identifier}
              label={`${PACKAGE_LABELS[pkg.packageType]?.() ?? pkg.packageType} — ${pkg.product.priceString}`}
              iconSvg={index === 0 ? UNLOCK_ICON_SVG : undefined}
              variant={index === 0 ? 'primary' : 'neutral'}
              busy={busy}
              onPress={() => buy(pkg)}
            />
          ))
        ) : (
          <Text style={styles.caption}>{t('offeringsUnavailable')}</Text>
        )}
        {error && (
          <Text accessibilityRole="text" style={styles.caption} accessibilityLiveRegion="assertive">
            {error}
          </Text>
        )}
        {/* Pressables, not tappable Text: 13pt captions gave targets well under
            44pt, and the "·" separators were focusable but meaningless. */}
        <View style={styles.legalRow}>
          <Pressable
            accessibilityRole="link"
            accessibilityLabel={t('restorePurchases')}
            accessibilityState={{ disabled: busy, busy }}
            disabled={busy}
            style={styles.legalTarget}
            onPress={restore}
          >
            <Text style={styles.legalLink}>{t('restorePurchases')}</Text>
          </Pressable>
          <Text accessibilityElementsHidden importantForAccessibility="no" style={styles.legalDivider}>
            ·
          </Text>
          <Pressable
            accessibilityRole="link"
            accessibilityLabel={t('privacyPolicy')}
            style={styles.legalTarget}
            onPress={() => Linking.openURL(PRIVACY_POLICY_URL)}
          >
            <Text style={styles.legalLink}>{t('privacyPolicy')}</Text>
          </Pressable>
          <Text accessibilityElementsHidden importantForAccessibility="no" style={styles.legalDivider}>
            ·
          </Text>
          <Pressable
            accessibilityRole="link"
            accessibilityLabel={t('termsOfUse')}
            style={styles.legalTarget}
            onPress={() => Linking.openURL(TERMS_OF_USE_URL)}
          >
            <Text style={styles.legalLink}>{t('termsOfUse')}</Text>
          </Pressable>
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
    paddingHorizontal: spacing.md,
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  benefitIcon: {
    width: 22,
    height: 22,
  },
  benefit: {
    ...typography.body,
    color: colors.text,
    flexShrink: 1,
  },
  caption: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
  },
  legalRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  legalTarget: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
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
