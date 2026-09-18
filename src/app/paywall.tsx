import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Linking, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { Icon, type IconName } from '@/components/ui/Icon';
import { IconWell } from '@/components/ui/IconWell';
import { Tap } from '@/components/ui/Tap';
import { Text } from '@/components/ui/Text';
import { track } from '@/lib/analytics';
import { useDogs } from '@/lib/dogs';
import { PLANS, useEntitlements, type Plan } from '@/lib/entitlements';
import { humanizeError } from '@/lib/errors';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';

/** Every line here is enforced in code. Do not add a feature until its gate exists. */
const FEATURES: { icon: IconName; title: string; line: string }[] = [
  { icon: 'pill', title: 'Medication reader', line: 'A visit photo or file is read for meds, written on the profile, and scheduled with reminders.' },
  { icon: 'document', title: 'Clinic pack', line: 'Weight trend, symptom timeline, and the care sheet as a file the clinic can keep.' },
  { icon: 'careTeam', title: 'Every dog in the house', line: 'One dog is free. Premium adds unlimited profiles, each with their own records.' },
  { icon: 'camera', title: 'Forty Looks a day', line: 'Point the camera at a paw, a bag, or a label. Three a day stay free.' },
  { icon: 'learn', title: 'The full Learn library', line: 'Five sessions stay free. Eighty rotate for Premium.' },
  { icon: 'shield', title: 'No partner cards', line: 'Nothing between you and your dog.' },
];

const MANAGE_URL = 'https://apps.apple.com/account/subscriptions';

/**
 * Shown once after sign-up with a visible Skip, and again from any gated feature. Yearly is the
 * default selection. Prices come from StoreKit through RevenueCat; the static PLANS copy is only a
 * fallback while the store answers. What stays free is stated plainly so the offer never feels like a trap.
 */
export default function Paywall() {
  const t = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { dog } = useDogs();
  const ent = useEntitlements();
  const { from } = useLocalSearchParams<{ from?: string }>();
  const [plan, setPlan] = useState<Plan>('yearly');
  const [busy, setBusy] = useState<'buy' | 'restore' | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void track('paywall_view', { from: from ?? 'unknown', available: ent.available });
  }, [from, ent.available]);

  const offer = ent.offers[plan];
  const price = offer?.priceString ?? PLANS[plan].price;
  const per = PLANS[plan].per;
  const trialDays = offer?.trialDays ?? 0;

  const done = async () => {
    await ent.markPaywallSeen();
    if (router.canGoBack()) router.back();
    else router.replace('/(app)/(tabs)/today');
  };

  const buy = async () => {
    setBusy('buy');
    setError(null);
    void track('purchase_start', { plan, from: from ?? 'unknown', trialDays });
    try {
      const ok = await ent.purchase(plan);
      if (ok) {
        void track('purchase_success', { plan, trialDays });
        await done();
      } else {
        void track('purchase_cancel', { plan });
      }
    } catch (e) {
      void track('purchase_error', { plan });
      setError(humanizeError(e, 'The App Store could not complete that. Try again.'));
    } finally {
      setBusy(null);
    }
  };

  const restore = async () => {
    setBusy('restore');
    setError(null);
    try {
      const ok = await ent.restore();
      void track('restore', { ok });
      if (ok) await done();
      else setError('No active Dog Better subscription is on this Apple ID.');
    } catch (e) {
      setError(humanizeError(e, 'Could not reach the App Store. Try again.'));
    } finally {
      setBusy(null);
    }
  };

  const cta = !ent.loaded ? 'Checking the App Store' : trialDays > 0 ? `Start ${trialDays}-day free trial` : `Subscribe for ${price} per ${per}`;

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <LinearGradient colors={[t.furLight, t.bg]} locations={[0, 0.5]} style={StyleSheet.absoluteFill} />
      <View style={[styles.root, { paddingTop: insets.top + space.md, paddingBottom: insets.bottom + space.md }]}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          <View style={styles.top}>
            <Tap onPress={done} haptic="selection" style={[styles.skip, { backgroundColor: t.surface }]} accessibilityLabel="Skip for now">
              <Text variant="label" tone="secondary">
                {from === 'onboarding' ? 'Skip for now' : 'Not now'}
              </Text>
            </Tap>
          </View>

          <Animated.View entering={FadeInUp.duration(300)} style={styles.hero}>
            <Image source={require('@/assets/brand/mascot.png')} style={{ width: 120, height: 92 }} contentFit="contain" />
            <Text variant="overline" tone="accent">
              Dog Better Premium
            </Text>
            <Text variant="display" align="center">
              Know what {dog?.name ?? 'your dog'} needs today
            </Text>
          </Animated.View>

          <View style={styles.features}>
            {FEATURES.map((f, i) => (
              <Animated.View key={f.title} entering={FadeInUp.delay(80 + i * 40).duration(260)} style={styles.feature}>
                <IconWell name={f.icon} size="sm" />
                <View style={{ flex: 1 }}>
                  <Text variant="bodyStrong">{f.title}</Text>
                  <Text variant="caption" tone="secondary">
                    {f.line}
                  </Text>
                </View>
              </Animated.View>
            ))}
          </View>

          <View style={styles.plans}>
            {(['yearly', 'monthly'] as Plan[]).map((p) => {
              const on = plan === p;
              const live = ent.offers[p];
              const shown = live?.priceString ?? PLANS[p].price;
              const perMonth = live?.pkg.product.pricePerMonthString ?? null;
              return (
                <Tap
                  key={p}
                  onPress={() => setPlan(p)}
                  haptic="selection"
                  accessibilityRole="radio"
                  accessibilityState={{ selected: on }}
                  style={[styles.plan, { backgroundColor: t.bgRaised, borderColor: on ? t.brand : t.border, borderWidth: on ? 2 : 1 }]}>
                  <View style={{ flex: 1 }}>
                    <Text variant="bodyStrong">{p === 'yearly' ? 'Yearly' : 'Monthly'}</Text>
                    <Text variant="caption" tone="secondary">
                      {shown} per {PLANS[p].per}
                      {p === 'yearly' && perMonth ? ` (${perMonth} per month)` : ''}
                    </Text>
                  </View>
                  {PLANS[p].note ? (
                    <View style={[styles.badge, { backgroundColor: t.accent }]}>
                      <Text variant="micro" style={{ color: t.onAccent }}>
                        {PLANS[p].note}
                      </Text>
                    </View>
                  ) : null}
                  <Icon name={on ? 'check' : 'chevron'} size={16} color={on ? t.brand : t.textTertiary} />
                </Tap>
              );
            })}
          </View>

          {ent.loaded && !ent.available ? (
            <View style={[styles.notice, { backgroundColor: t.surface }]}>
              <Icon name="info" size={16} color={t.textSecondary} />
              <Text variant="caption" tone="secondary" style={{ flex: 1 }}>
                Purchases need the App Store build of Dog Better. Everything free stays free here.
              </Text>
            </View>
          ) : null}
        </ScrollView>

        <View style={{ gap: space.sm, paddingTop: space.sm }}>
          <Button label={cta} size="lg" kind="accent" onPress={buy} loading={busy === 'buy'} disabled={busy !== null || !ent.loaded || !ent.available || !offer} />
          <Text variant="caption" tone="tertiary" align="center">
            {trialDays > 0 ? `Free for ${trialDays} days, then ${price} per ${per}. ` : `${price} per ${per}. `}
            Renews automatically until cancelled at least 24 hours before the end of the period. Manage or cancel in your Apple ID settings. Records, emergency mode, the care sheet, and community stay free forever.
          </Text>
          {error ? (
            <Text variant="caption" tone="bad" align="center">
              {error}
            </Text>
          ) : null}
          <View style={styles.links}>
            <Tap onPress={restore} haptic="selection" disabled={busy !== null} style={styles.link}>
              <Text variant="caption" tone="brand">
                Restore purchase
              </Text>
            </Tap>
            <Tap onPress={() => router.push({ pathname: '/(app)/settings/legal/[doc]', params: { doc: 'terms' } })} haptic="selection" style={styles.link}>
              <Text variant="caption" tone="brand">
                Terms of Use
              </Text>
            </Tap>
            <Tap onPress={() => router.push({ pathname: '/(app)/settings/legal/[doc]', params: { doc: 'privacy' } })} haptic="selection" style={styles.link}>
              <Text variant="caption" tone="brand">
                Privacy Policy
              </Text>
            </Tap>
            {ent.isPremium ? (
              <Tap onPress={() => Linking.openURL(ent.entitlement.managementURL ?? MANAGE_URL)} haptic="selection" style={styles.link}>
                <Text variant="caption" tone="brand">
                  Manage
                </Text>
              </Tap>
            ) : null}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: space.xl },
  scroll: { gap: space.lg, paddingBottom: space.sm },
  top: { flexDirection: 'row', justifyContent: 'flex-end' },
  skip: { paddingHorizontal: space.md, height: 34, borderRadius: radius.pill, justifyContent: 'center' },
  hero: { alignItems: 'center', gap: space.xs },
  features: { gap: space.sm },
  feature: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  plans: { gap: space.sm },
  plan: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, borderRadius: radius.md },
  badge: { paddingHorizontal: space.sm, height: 22, borderRadius: 11, justifyContent: 'center' },
  notice: { flexDirection: 'row', alignItems: 'center', gap: space.sm, padding: space.md, borderRadius: radius.md },
  links: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: space.md, rowGap: 2 },
  link: { minHeight: 44, justifyContent: 'center', paddingHorizontal: space.xs },
});
