import { useEffect, useState } from 'react';
import Purchases, {
  type CustomerInfo,
  type PurchasesOffering,
  type PurchasesPackage,
  LOG_LEVEL,
} from 'react-native-purchases';

// Public SDK key (RevenueCat dashboard → project → Apps → Vizi iOS → API key,
// starts with "appl_"). Public by design — safe to inline in the bundle.
const REVENUECAT_IOS_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY;

// The single premium entitlement. Safety-critical features stay free forever;
// "plus" gates the premium extras.
export const PLUS_ENTITLEMENT = 'plus';

let configured = false;

export function hasRevenueCatKey(): boolean {
  return Boolean(REVENUECAT_IOS_KEY);
}

export function configurePurchases(appUserId?: string) {
  if (!REVENUECAT_IOS_KEY) {
    console.warn('[vizi:purchases] EXPO_PUBLIC_REVENUECAT_IOS_KEY not set — purchases disabled');
    return;
  }
  if (configured) {
    return;
  }
  Purchases.setLogLevel(LOG_LEVEL.INFO);
  Purchases.configure({ apiKey: REVENUECAT_IOS_KEY, appUserID: appUserId ?? null });
  configured = true;
  console.log('[vizi:purchases] configured');
}

// Tie the RevenueCat identity to the Firebase account so purchases follow the
// user across devices. Call after sign-in / sign-out.
export async function identifyPurchaser(firebaseUid: string | null) {
  if (!configured) {
    return;
  }
  try {
    if (firebaseUid) {
      await Purchases.logIn(firebaseUid);
      console.log(`[vizi:purchases] identified as ${firebaseUid}`);
    } else if (!(await Purchases.isAnonymous())) {
      // logOut throws if the purchaser is already anonymous.
      await Purchases.logOut();
      console.log('[vizi:purchases] anonymous purchaser');
    }
  } catch (error) {
    console.warn('[vizi:purchases] identify failed:', error);
  }
}

export function isPlus(info: CustomerInfo | null): boolean {
  return Boolean(info?.entitlements.active[PLUS_ENTITLEMENT]);
}

// Live customer info — updates on purchases, restores, renewals.
export function useCustomerInfo(): CustomerInfo | null {
  const [info, setInfo] = useState<CustomerInfo | null>(null);

  useEffect(() => {
    if (!configured) {
      return;
    }
    Purchases.getCustomerInfo().then(setInfo).catch(() => {});
    const listener = (customerInfo: CustomerInfo) => {
      setInfo(customerInfo);
    };
    Purchases.addCustomerInfoUpdateListener(listener);
    return () => {
      Purchases.removeCustomerInfoUpdateListener(listener);
    };
  }, []);

  return info;
}

export async function getCurrentOffering(): Promise<PurchasesOffering | null> {
  if (!configured) {
    return null;
  }
  const offerings = await Purchases.getOfferings();
  return offerings.current;
}

export async function purchase(pkg: PurchasesPackage): Promise<CustomerInfo> {
  const { customerInfo } = await Purchases.purchasePackage(pkg);
  console.log(`[vizi:purchases] purchased ${pkg.identifier}`);
  return customerInfo;
}

export async function restorePurchases(): Promise<CustomerInfo> {
  const customerInfo = await Purchases.restorePurchases();
  console.log('[vizi:purchases] restored');
  return customerInfo;
}
