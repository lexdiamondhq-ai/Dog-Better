import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import { NativeModules, Platform } from 'react-native';
import Purchases, { LOG_LEVEL, type CustomerInfo, type PurchasesPackage } from 'react-native-purchases';

import { useAuth } from './auth';

/**
 * Premium entitlement, backed by RevenueCat and Apple StoreKit.
 *
 * Product rules this module enforces by design:
 * - records, emergency, the care sheet, visit meds, community, and one dog are never gated;
 * - a lapsed subscription never deletes data, it only hides the intelligence layer again;
 * - nothing here can grant Premium without a store transaction. Expo Go has no StoreKit, so
 *   `available` is false there and the paywall says so instead of pretending.
 *
 * The RevenueCat app user id is the Supabase auth uid, which is what lets the revenuecat-webhook
 * Edge Function mirror the subscription into profiles.premium_until for server-side checks.
 */

export type Plan = 'monthly' | 'yearly';

/** Fallback copy for when the store has not answered yet. Live prices from StoreKit win. */
export const PLANS: Record<Plan, { price: string; per: string; note?: string; productId: string }> = {
  monthly: { price: '$6.99', per: 'month', productId: 'dogbetter.premium.monthly' },
  yearly: { price: '$39.99', per: 'year', note: 'Save 52%', productId: 'dogbetter.premium.yearly' },
};
export const ENTITLEMENT_ID = 'premium';

export type Entitlement = {
  active: boolean;
  plan: Plan | null;
  /** Inside an introductory free trial. */
  trial: boolean;
  expiresAt: string | null;
  willRenew: boolean;
  managementURL: string | null;
};

export type PlanOffer = {
  plan: Plan;
  pkg: PurchasesPackage;
  priceString: string;
  /** Free trial length in days when the store offers an introductory free period, else 0. */
  trialDays: number;
};

type Api = {
  loaded: boolean;
  /** StoreKit is reachable and the offering loaded. False in Expo Go and when RevenueCat is not configured. */
  available: boolean;
  entitlement: Entitlement;
  isPremium: boolean;
  offers: Partial<Record<Plan, PlanOffer>>;
  /** Whether the post-signup paywall has been shown once. */
  paywallSeen: boolean;
  markPaywallSeen: () => Promise<void>;
  /** Starts the App Store purchase sheet. Resolves true on success, false if the user cancelled. */
  purchase: (plan: Plan) => Promise<boolean>;
  restore: () => Promise<boolean>;
  /** Dev/testing only: clears the "paywall seen" flag so the offer shows again. */
  reset: () => Promise<void>;
};

const NONE: Entitlement = { active: false, plan: null, trial: false, expiresAt: null, willRenew: false, managementURL: null };
const seenKey = (userId: string) => `dogbetter.paywall.seen.v2.${userId}`;

const RC_KEY = Platform.select({ ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY, android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY }) ?? '';
const NATIVE_READY = Boolean(NativeModules.RNPurchases);
const STORE_AVAILABLE = NATIVE_READY && RC_KEY.length > 0;

function planFromProductId(id: string | null | undefined): Plan | null {
  if (!id) return null;
  if (id.includes('yearly') || id.includes('annual')) return 'yearly';
  if (id.includes('monthly')) return 'monthly';
  return null;
}

function entitlementFrom(info: CustomerInfo | null): Entitlement {
  const e = info?.entitlements.active[ENTITLEMENT_ID];
  if (!e) return NONE;
  return {
    active: e.isActive,
    plan: planFromProductId(e.productIdentifier),
    trial: e.periodType === 'TRIAL' || e.periodType === 'INTRO',
    expiresAt: e.expirationDate,
    willRenew: e.willRenew,
    managementURL: info?.managementURL ?? null,
  };
}

function trialDaysOf(pkg: PurchasesPackage) {
  const intro = pkg.product.introPrice;
  if (!intro || intro.price !== 0) return 0;
  const n = intro.periodNumberOfUnits;
  switch (intro.periodUnit) {
    case 'DAY':
      return n;
    case 'WEEK':
      return n * 7;
    case 'MONTH':
      return n * 30;
    case 'YEAR':
      return n * 365;
    default:
      return 0;
  }
}

function offersFrom(packages: PurchasesPackage[]): Partial<Record<Plan, PlanOffer>> {
  const out: Partial<Record<Plan, PlanOffer>> = {};
  for (const pkg of packages) {
    const plan = planFromProductId(pkg.product.identifier) ?? (pkg.packageType === 'ANNUAL' ? 'yearly' : pkg.packageType === 'MONTHLY' ? 'monthly' : null);
    if (!plan || out[plan]) continue;
    out[plan] = { plan, pkg, priceString: pkg.product.priceString, trialDays: trialDaysOf(pkg) };
  }
  return out;
}

const Ctx = createContext<Api>({
  loaded: false,
  available: false,
  entitlement: NONE,
  isPremium: false,
  offers: {},
  paywallSeen: true,
  markPaywallSeen: async () => {},
  purchase: async () => false,
  restore: async () => false,
  reset: async () => {},
});

let configured = false;
function configureOnce() {
  if (configured || !STORE_AVAILABLE) return;
  Purchases.setLogLevel(__DEV__ ? LOG_LEVEL.WARN : LOG_LEVEL.ERROR);
  Purchases.configure({ apiKey: RC_KEY });
  configured = true;
}

export function EntitlementsProvider({ children }: PropsWithChildren) {
  const { user, ready } = useAuth();
  const [entitlement, setEntitlement] = useState<Entitlement>(NONE);
  const [offers, setOffers] = useState<Partial<Record<Plan, PlanOffer>>>({});
  const [available, setAvailable] = useState(false);
  const [paywallSeen, setPaywallSeen] = useState(true);
  const [seenReady, setSeenReady] = useState(false);
  const [storeLoaded, setStoreLoaded] = useState(false);
  const loaded = storeLoaded && seenReady;

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    if (!user) {
      void Promise.resolve().then(() => {
        if (!cancelled) {
          setPaywallSeen(true);
          setSeenReady(true);
        }
      });
      return () => {
        cancelled = true;
      };
    }
    AsyncStorage.getItem(seenKey(user.id))
      .then((seen) => {
        if (!cancelled) setPaywallSeen(seen === '1');
      })
      .catch(() => {
        if (!cancelled) setPaywallSeen(false);
      })
      .finally(() => {
        if (!cancelled) setSeenReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [ready, user]);

  // Identity: RevenueCat app user id follows the Supabase user so the webhook can map back.
  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    if (!STORE_AVAILABLE) {
      // No StoreKit in this build (Expo Go, or no RevenueCat key). Resolve on the next tick so the gate can proceed.
      void Promise.resolve().then(() => {
        if (!cancelled) setStoreLoaded(true);
      });
      return () => {
        cancelled = true;
      };
    }
    configureOnce();
    (async () => {
      try {
        const info = user ? (await Purchases.logIn(user.id)).customerInfo : await Purchases.getCustomerInfo();
        if (cancelled) return;
        setEntitlement(entitlementFrom(info));
        const offerings = await Purchases.getOfferings();
        if (cancelled) return;
        const packages = offerings.current?.availablePackages ?? [];
        setOffers(offersFrom(packages));
        setAvailable(packages.length > 0);
      } catch {
        if (!cancelled) setAvailable(false);
      } finally {
        if (!cancelled) setStoreLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ready, user]);

  useEffect(() => {
    if (!STORE_AVAILABLE) return;
    configureOnce();
    const listener = (info: CustomerInfo) => setEntitlement(entitlementFrom(info));
    Purchases.addCustomerInfoUpdateListener(listener);
    return () => {
      Purchases.removeCustomerInfoUpdateListener(listener);
    };
  }, []);

  const markPaywallSeen = useCallback(async () => {
    setPaywallSeen(true);
    if (user) await AsyncStorage.setItem(seenKey(user.id), '1');
  }, [user]);

  const purchase = useCallback(
    async (plan: Plan) => {
      const offer = offers[plan];
      if (!STORE_AVAILABLE || !offer) throw new Error('Purchases are not available in this build.');
      try {
        const { customerInfo } = await Purchases.purchasePackage(offer.pkg);
        const next = entitlementFrom(customerInfo);
        setEntitlement(next);
        return next.active;
      } catch (e) {
        const err = e as { userCancelled?: boolean | null; code?: string };
        if (err.userCancelled || err.code === Purchases.PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) return false;
        throw e;
      }
    },
    [offers],
  );

  const restore = useCallback(async () => {
    if (!STORE_AVAILABLE) return false;
    const info = await Purchases.restorePurchases();
    const next = entitlementFrom(info);
    setEntitlement(next);
    return next.active;
  }, []);

  const reset = useCallback(async () => {
    if (user) await AsyncStorage.removeItem(seenKey(user.id));
    setPaywallSeen(false);
  }, [user]);

  const value = useMemo<Api>(
    () => ({ loaded, available, entitlement, isPremium: entitlement.active, offers, paywallSeen, markPaywallSeen, purchase, restore, reset }),
    [loaded, available, entitlement, offers, paywallSeen, markPaywallSeen, purchase, restore, reset],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useEntitlements() {
  return useContext(Ctx);
}

export function trialDaysLeft(expiresAt: string | null) {
  if (!expiresAt) return 0;
  return Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86400000));
}

/** Sign-out hook: keep RevenueCat identity in step with Supabase. */
export async function forgetStoreIdentity() {
  if (!STORE_AVAILABLE || !configured) return;
  try {
    const info = await Purchases.getCustomerInfo();
    if (!info.originalAppUserId.startsWith('$RCAnonymousID')) await Purchases.logOut();
  } catch {
    /* nothing to forget */
  }
}
