import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';

/**
 * Premium entitlement. The shape mirrors what RevenueCat returns (active entitlement, expiry,
 * trial state) so wiring the real store later replaces `mockStore` and nothing else.
 *
 * Product rules this module enforces by design:
 * - records, emergency, the care sheet, community, and one dog are never gated;
 * - a lapsed trial never deletes data, it only hides the intelligence layer again.
 */

export type Plan = 'monthly' | 'yearly';
export const PLANS: Record<Plan, { price: string; per: string; note?: string; productId: string }> = {
  monthly: { price: '$6.99', per: 'month', productId: 'dogbetter.premium.monthly' },
  yearly: { price: '$39.99', per: 'year', note: 'Save 52%', productId: 'dogbetter.premium.yearly' },
};
export const TRIAL_DAYS = 7;

export type PremiumFeature = 'plan' | 'detective_insights' | 'trigger_patterns' | 'medication' | 'vet_pdf' | 'multi_dog' | 'ad_free' | 'trick_library';

type Entitlement = { active: boolean; plan: Plan | null; trial: boolean; expiresAt: string | null };

type Api = {
  loaded: boolean;
  entitlement: Entitlement;
  isPremium: boolean;
  /** Whether the post-signup paywall has been shown once. */
  paywallSeen: boolean;
  markPaywallSeen: () => Promise<void>;
  startTrial: (plan: Plan) => Promise<void>;
  purchase: (plan: Plan) => Promise<void>;
  restore: () => Promise<boolean>;
  /** Dev/testing only: clear the mock entitlement. */
  reset: () => Promise<void>;
};

const NONE: Entitlement = { active: false, plan: null, trial: false, expiresAt: null };
const KEY = 'dogbetter.entitlement.mock.v1';
const SEEN_KEY = 'dogbetter.paywall.seen.v1';

/** Stand-in for the app store until StoreKit is connected. Persists on-device so the trial survives restarts. */
const mockStore = {
  async read(): Promise<Entitlement> {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return NONE;
    const e = JSON.parse(raw) as Entitlement;
    if (e.expiresAt && new Date(e.expiresAt).getTime() < Date.now()) return { ...NONE };
    return e;
  },
  async write(e: Entitlement) {
    await AsyncStorage.setItem(KEY, JSON.stringify(e));
  },
  async clear() {
    await AsyncStorage.removeItem(KEY);
  },
};

const Ctx = createContext<Api>({
  loaded: false,
  entitlement: NONE,
  isPremium: false,
  paywallSeen: true,
  markPaywallSeen: async () => {},
  startTrial: async () => {},
  purchase: async () => {},
  restore: async () => false,
  reset: async () => {},
});

export function EntitlementsProvider({ children }: PropsWithChildren) {
  const [entitlement, setEntitlement] = useState<Entitlement>(NONE);
  const [paywallSeen, setPaywallSeen] = useState(true);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    Promise.all([mockStore.read(), AsyncStorage.getItem(SEEN_KEY)])
      .then(([e, seen]) => {
        setEntitlement(e);
        setPaywallSeen(seen === '1');
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  const markPaywallSeen = useCallback(async () => {
    setPaywallSeen(true);
    await AsyncStorage.setItem(SEEN_KEY, '1');
  }, []);

  const startTrial = useCallback(async (plan: Plan) => {
    const expiresAt = new Date(Date.now() + TRIAL_DAYS * 86400000).toISOString();
    const e: Entitlement = { active: true, plan, trial: true, expiresAt };
    await mockStore.write(e);
    setEntitlement(e);
  }, []);

  const purchase = useCallback(async (plan: Plan) => {
    const days = plan === 'yearly' ? 365 : 30;
    const e: Entitlement = { active: true, plan, trial: false, expiresAt: new Date(Date.now() + days * 86400000).toISOString() };
    await mockStore.write(e);
    setEntitlement(e);
  }, []);

  const restore = useCallback(async () => {
    const e = await mockStore.read();
    setEntitlement(e);
    return e.active;
  }, []);

  const reset = useCallback(async () => {
    await mockStore.clear();
    await AsyncStorage.removeItem(SEEN_KEY);
    setEntitlement(NONE);
    setPaywallSeen(false);
  }, []);

  const value = useMemo<Api>(
    () => ({ loaded, entitlement, isPremium: entitlement.active, paywallSeen, markPaywallSeen, startTrial, purchase, restore, reset }),
    [loaded, entitlement, paywallSeen, markPaywallSeen, startTrial, purchase, restore, reset],
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
