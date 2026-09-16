import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Linking, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { Icon, type IconName } from '@/components/ui/Icon';
import { Tap } from '@/components/ui/Tap';
import { Text } from '@/components/ui/Text';
import { useDogs } from '@/lib/dogs';
import { PLANS, TRIAL_DAYS, useEntitlements, type Plan } from '@/lib/entitlements';
import { humanizeError } from '@/lib/errors';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';

const FEATURES: { icon: IconName; title: string; line: string }[] = [
  { icon: 'today', title: 'A plan that changes with the day', line: 'Weather, sleep, triggers, and your schedule shape what to do next.' },
  { icon: 'detective', title: 'Pattern detective', line: 'What changed in the last 72 hours, matched against your dog\u2019s own history.' },
  { icon: 'pill', title: 'Medication intelligence', line: 'Given confirmations, refill countdowns, side-effect links to symptoms.' },
  { icon: 'document', title: 'Clinic pack', line: 'Weight trend, symptom timeline, and the care sheet as a file the clinic can keep.' },
  { icon: 'paw', title: 'Every dog in the house', line: 'Unlimited profiles with their own plans and records.' },
  { icon: 'sparkle', title: 'Unlimited Looks', line: 'Point the camera at a paw, a bag, or a label. Three a day stay free.' },
  { icon: 'paw', title: 'The daily Learn wheel', line: 'Five sessions stay free. Fifty-plus rotate for Premium.' },
  { icon: 'sparkle', title: 'No ads', line: 'Nothing between you and your dog.' },
];

/**
 * Shown once after sign-up with a visible Skip, and again from any gated feature. Yearly is the
 * default selection. What stays free is stated plainly at the bottom so the trial never feels like a trap.
 */
export default function Paywall() {
  const t = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { dog } = useDogs();
  const ent = useEntitlements();
  const { from } = useLocalSearchParams<{ from?: string }>();
  const [plan, setPlan] = useState<Plan>('yearly');
  const [busy, setBusy] = useState<'trial' | 'restore' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const done = async () => {
    await ent.markPaywallSeen();
    if (router.canGoBack()) router.back();
    else router.replace('/(app)/(tabs)/today');
  };

  const start = async () => {
    setBusy('trial');
    setError(null);
    try {
      await ent.startTrial(plan);
      await done();
    } catch (e) {
      setError(humanizeError(e, 'Could not start the trial. Try again.'));
    } finally {
      setBusy(null);
    }
  };

  const restore = async () => {
    setBusy('restore');
    setError(null);
    try {
      const ok = await ent.restore();
      if (ok) await done();
      else setError('No previous purchase found for this Apple ID.');
    } finally {
      setBusy(null);
    }
  };

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
              <View style={[styles.featureIcon, { backgroundColor: t.bgRaised }]}>
                <Icon name={f.icon} size={16} color={t.brand} />
              </View>
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
            const meta = PLANS[p];
            return (
              <Tap key={p} onPress={() => setPlan(p)} haptic="selection" accessibilityRole="radio" accessibilityState={{ selected: on }} style={[styles.plan, { backgroundColor: t.bgRaised, borderColor: on ? t.brand : t.border, borderWidth: on ? 2 : 1 }]}>
                <View style={{ flex: 1 }}>
                  <Text variant="bodyStrong">{p === 'yearly' ? 'Yearly' : 'Monthly'}</Text>
                  <Text variant="caption" tone="secondary">
                    {meta.price} per {meta.per}
                    {p === 'yearly' ? ` (${(39.99 / 12).toFixed(2)}/mo)` : ''}
                  </Text>
                </View>
                {meta.note ? (
                  <View style={[styles.badge, { backgroundColor: t.accent }]}>
                    <Text variant="micro" style={{ color: t.onAccent }}>
                      {meta.note}
                    </Text>
                  </View>
                ) : null}
                <Icon name={on ? 'check' : 'chevron'} size={16} color={on ? t.brand : t.textTertiary} />
              </Tap>
            );
          })}
        </View>
        </ScrollView>

        <View style={{ gap: space.sm, paddingTop: space.sm }}>
          <Button label={`Start ${TRIAL_DAYS}-day free trial`} size="lg" kind="accent" onPress={start} loading={busy === 'trial'} disabled={busy !== null} />
          <Text variant="caption" tone="tertiary" align="center">
            Free for {TRIAL_DAYS} days, then {PLANS[plan].price}/{PLANS[plan].per}. Cancel any time in Settings. Records, emergency mode, the care sheet, and community stay free forever.
          </Text>
          {error ? (
            <Text variant="caption" tone="bad" align="center">
              {error}
            </Text>
          ) : null}
          <View style={styles.links}>
            <Tap onPress={restore} haptic="selection" disabled={busy !== null}>
              <Text variant="caption" tone="brand">
                Restore purchase
              </Text>
            </Tap>
            <Tap onPress={() => router.push({ pathname: '/(app)/settings/legal/[doc]', params: { doc: 'terms' } })} haptic="selection">
              <Text variant="caption" tone="brand">
                Terms
              </Text>
            </Tap>
            <Tap onPress={() => router.push({ pathname: '/(app)/settings/legal/[doc]', params: { doc: 'privacy' } })} haptic="selection">
              <Text variant="caption" tone="brand">
                Privacy
              </Text>
            </Tap>
            <Tap onPress={() => Linking.openURL('https://apps.apple.com/account/subscriptions')} haptic="selection">
              <Text variant="caption" tone="brand">
                Manage
              </Text>
            </Tap>
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
  featureIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  plans: { gap: space.sm },
  plan: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, borderRadius: radius.md },
  badge: { paddingHorizontal: space.sm, height: 22, borderRadius: 11, justifyContent: 'center' },
  links: { flexDirection: 'row', justifyContent: 'center', gap: space.lg },
});
