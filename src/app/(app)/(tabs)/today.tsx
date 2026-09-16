import * as Clipboard from 'expo-clipboard';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Dimensions, Share, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { DogSwitcher } from '@/components/dogs/DogSwitcher';
import { LookOrb } from '@/components/look/LookOrb';
import { EarnBadge } from '@/components/points/EarnBadge';
import { DogAvatar } from '@/components/ui/DogAvatar';
import { Icon, type IconName } from '@/components/ui/Icon';
import { Screen, Section } from '@/components/ui/Screen';
import { GroupedList } from '@/components/ui/Surface';
import { Tap } from '@/components/ui/Tap';
import { Text } from '@/components/ui/Text';
import { useDogActivity } from '@/lib/activity';
import { useAuth } from '@/lib/auth';
import { useDogs } from '@/lib/dogs';
import { useInbox } from '@/lib/inbox';
import { useBetterLevel, usePoints } from '@/lib/points';
import { REWARDS } from '@/engine/rewards';
import { pickDuty, useHeatF, useWalksToday } from '@/lib/duty';
import { buildHandoffSheet } from '@/lib/handoff';
import { usePreferences } from '@/lib/preferences';
import { useReminders } from '@/lib/reminders';
import { supabase } from '@/lib/supabase';
import { formatWeight } from '@/lib/units';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';

const PORTRAIT_H = Math.round(Math.min(Dimensions.get('window').height * 0.52, 520));

const MEALS: { kind: 'breakfast' | 'dinner' | 'treat'; label: string; icon: IconName }[] = [
  { kind: 'breakfast', label: 'Breakfast', icon: 'sun' },
  { kind: 'dinner', label: 'Dinner', icon: 'meal' },
  { kind: 'treat', label: 'Treat', icon: 'paw' },
];

export default function Today() {
  const t = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const { dog } = useDogs();
  const activity = useDogActivity(dog);
  const inbox = useInbox();
  const { award, total, today } = usePoints();
  const level = useBetterLevel();
  const bellCount = inbox.unread > 0 ? inbox.unread : 3;
  const { weightUnit } = usePreferences();
  const reminders = useReminders(dog?.id);
  const heatF = useHeatF();
  const walksToday = useWalksToday(dog?.id);
  const [logging, setLogging] = useState<string | null>(null);
  const [switcher, setSwitcher] = useState(false);

  const name = dog?.name ?? 'your dog';
  const loggedKinds = new Set(activity.mealsToday.map((m) => m.kind));
  const duty = useMemo(
    () => pickDuty({ name, dueToday: reminders.dueToday, walksToday, heatF }),
    [name, reminders.dueToday, walksToday, heatF],
  );
  const sky = dog?.avatar_url;
  const weight = formatWeight(dog?.weight_kg, weightUnit);
  const latestHealth = activity.health[0];
  const nextMed = reminders.dueToday.find((r) => r.kind === 'medication');
  const nextWalk = reminders.dueToday.find((r) => r.kind === 'walk');

  const logMeal = async (kind: 'breakfast' | 'dinner' | 'treat') => {
    if (!dog || !user) return;
    setLogging(kind);
    const existing = activity.mealsToday.find((m) => m.kind === kind);
    if (existing) await supabase.from('meals').delete().eq('id', existing.id);
    else {
      const treatN = activity.mealsToday.filter((m) => m.kind === 'treat').length;
      await supabase.from('meals').insert({ dog_id: dog.id, owner_id: user.id, kind });
      await award({ kind: 'meal', key: `meal:${dog.id}:${kind}:${kind === 'treat' ? treatN : 'once'}`, dogId: dog.id });
    }
    await activity.reload();
    setLogging(null);
  };

  const onPrimary = () => router.push(duty.href);

  return (
    <View style={{ flex: 1 }}>
    <Screen dock flushTop padded={false} refreshing={activity.refreshing} onRefresh={activity.refresh}>
      <Animated.View entering={FadeIn.duration(400)} style={[styles.portrait, { height: PORTRAIT_H }]}>
        {sky ? (
          <Image source={{ uri: sky }} style={StyleSheet.absoluteFill} contentFit="cover" transition={280} />
        ) : (
          <LinearGradient colors={[t.brandDeep, t.brand, t.bg]} locations={[0, 0.45, 1]} style={StyleSheet.absoluteFill} />
        )}
        {!sky ? <Image source={require('@/assets/brand/mascot.png')} style={styles.skyMascot} contentFit="contain" /> : null}
        <LinearGradient colors={['rgba(20,14,11,0.42)', 'transparent', 'transparent', t.bg]} locations={[0, 0.12, 0.58, 1]} style={StyleSheet.absoluteFill} pointerEvents="none" />

        <View style={styles.portraitBody} pointerEvents="box-none">
          <Text variant="body" style={styles.planLine} numberOfLines={2}>
            {duty.line}
          </Text>
          <Tap onPress={onPrimary} haptic="medium" style={[styles.primary, { backgroundColor: t.bgRaised }]} accessibilityRole="button" accessibilityLabel={duty.label}>
            <Icon name={duty.icon} size={18} color={t.brand} />
            <Text variant="headline">{duty.label}</Text>
          </Tap>
        </View>
      </Animated.View>

      <View style={styles.below}>
        <View style={styles.nameRow}>
          <Text variant="title" style={{ flex: 1 }} numberOfLines={1}>
            {dog?.name ?? 'Your dog'}
          </Text>
          <View style={styles.chrome} pointerEvents="box-none">
            <Tap onPress={() => setSwitcher(true)} haptic="selection" style={styles.slot} accessibilityLabel="Switch dog profile">
              <DogAvatar uri={dog?.avatar_url} size={28} ring={false} />
            </Tap>
            <Tap onPress={() => router.push('/(app)/inbox')} haptic="selection" style={styles.slot} accessibilityLabel={`${bellCount} new activity`}>
              <Icon name="bell" size={22} color={t.text} />
              <View style={[styles.badge, { backgroundColor: t.bad }]}>
                <Text variant="micro" style={{ color: t.onMeaning }}>
                  {bellCount > 9 ? '9+' : bellCount}
                </Text>
              </View>
            </Tap>
            <Tap onPress={() => router.push('/(app)/settings')} haptic="selection" style={styles.slot} accessibilityLabel="Settings">
              <Icon name="settings" size={22} color={t.text} />
            </Tap>
          </View>
        </View>

        <Tap onPress={() => router.push('/(app)/settings/points')} haptic="selection" style={[styles.jar, { backgroundColor: t.bgRaised, borderColor: t.border }]}>
          <Icon name="paw" size={18} color={t.accentDeep} />
          <View style={{ flex: 1 }}>
            <Text variant="bodyStrong">{total.toLocaleString()} treats</Text>
            <Text variant="caption" tone="secondary">
              {level.name} · {today} today
            </Text>
          </View>
          <EarnBadge points={REWARDS.meal.points} />
        </Tap>

        {dog ? (
          <View style={[styles.care, { backgroundColor: t.bgRaised, borderColor: t.border }]}>
            <Tap onPress={() => router.push('/(app)/care-team')} haptic="selection" style={styles.careMain} accessibilityLabel="Open care sheet">
              <Icon name="document" size={18} color={t.brand} />
              <View style={{ flex: 1 }}>
                <Text variant="bodyStrong">Care sheet</Text>
                <Text variant="caption" tone="secondary">
                  Feeding, vet, do-not list
                </Text>
              </View>
            </Tap>
            <Tap
              onPress={() => void Share.share({ message: buildHandoffSheet(dog, user?.email, weightUnit), title: `${dog.name} care sheet` })}
              haptic="medium"
              style={[styles.careSend, { backgroundColor: t.brand }]}
              accessibilityLabel="Send care sheet">
              <Icon name="share" size={16} color={t.onBrand} />
            </Tap>
            <Tap
              onPress={() => void Clipboard.setStringAsync(buildHandoffSheet(dog, user?.email, weightUnit))}
              haptic="selection"
              style={[styles.careSend, { backgroundColor: t.surface }]}
              accessibilityLabel="Copy care sheet">
              <Icon name="document" size={16} color={t.brand} />
            </Tap>
          </View>
        ) : null}

        <Section title="On the roster">
          <View style={styles.facts}>
            <Fact icon="walk" label="Walk" value={walksToday ? 'Done' : nextWalk ? nextWalk.time : 'Open'} onPress={() => router.push('/(app)/(tabs)/track')} />
            <Fact icon="pill" label="Meds" value={nextMed ? nextMed.time : 'None'} onPress={() => router.push('/(app)/calendar')} />
            <Fact icon="sun" label="Heat" value={heatF != null ? `${Math.round(heatF)}°` : '—'} />
            <Fact icon="document" label="Tonight" value="Sheet" onPress={() => router.push('/(app)/care-team')} />
          </View>
        </Section>

        <Section title="Fed today">
          <View style={styles.mealRow}>
            {MEALS.map((m) => {
              const done = loggedKinds.has(m.kind);
              return (
                <Tap
                  key={m.kind}
                  onPress={() => logMeal(m.kind)}
                  disabled={logging !== null}
                  haptic="medium"
                  style={[styles.meal, { backgroundColor: t.bgRaised, borderColor: done ? t.good : t.border }]}>
                  <Icon name={done ? 'check' : m.icon} size={18} color={done ? t.good : t.brand} />
                  <Text variant="label" style={{ color: done ? t.good : t.text }}>
                    {m.label}
                  </Text>
                  {!done ? <EarnBadge points={REWARDS.meal.points} /> : null}
                </Tap>
              );
            })}
          </View>
        </Section>

        <Section title="This dog today">
          <View style={styles.facts}>
            <Fact icon="meal" label="Meals" value={`${activity.mealsToday.filter((m) => m.kind !== 'treat').length}/2`} />
            <Fact icon="weight" label="Weight" value={weight ?? 'Add'} onPress={() => router.push('/(app)/(tabs)/track')} />
            <Fact icon="care" label="Health" value={latestHealth ? { green: 'Quiet', amber: 'Watch', red: 'Urgent' }[latestHealth.triage] ?? latestHealth.triage : 'Quiet'} onPress={() => router.push('/(app)/symptoms')} />
          </View>
        </Section>

        <Section title="The aisle">
          <GroupedList>
            <HelpRow icon="sparkle" label="Look" detail="Photo of a paw, a bag, a label. AI, not a vet" onPress={() => router.push('/(app)/look')} />
            <HelpRow icon="scan" label="Check a treat" detail="Barcode or ingredients, sized to them" onPress={() => router.push('/(app)/scan')} />
            <HelpRow icon="link" label="Shop for this dog" detail="Amazon links with our tag" onPress={() => router.push('/(app)/shop')} />
            <HelpRow icon="vet" label="Clinic pack" detail="Weight, symptoms, sheet for the exam room" onPress={() => router.push('/(app)/clinic')} />
            <HelpRow icon="detective" label="Log a symptom" detail="What you see, then a next step" onPress={() => router.push('/(app)/symptoms')} />
            <HelpRow icon="walk" label="Open Track" detail="The ledger: walks, weight, food" onPress={() => router.push('/(app)/(tabs)/track')} last />
          </GroupedList>
        </Section>
      </View>

      <DogSwitcher visible={switcher} onClose={() => setSwitcher(false)} />
    </Screen>
    <LookOrb />
    </View>
  );
}

function Fact({ icon, label, value, onPress }: { icon: IconName; label: string; value: string; onPress?: () => void }) {
  const t = useTheme();
  const inner = (
    <View style={[styles.fact, { backgroundColor: t.bgRaised, borderColor: t.border }]}>
      <Icon name={icon} size={16} color={t.brand} />
      <Text variant="bodyStrong">{value}</Text>
      <Text variant="caption" tone="tertiary">
        {label}
      </Text>
    </View>
  );
  return onPress ? (
    <Tap onPress={onPress} haptic="selection" style={{ flex: 1 }}>
      {inner}
    </Tap>
  ) : (
    <View style={{ flex: 1 }}>{inner}</View>
  );
}

function HelpRow({ icon, label, detail, onPress, last }: { icon: IconName; label: string; detail: string; onPress: () => void; last?: boolean }) {
  const t = useTheme();
  return (
    <Tap onPress={onPress} haptic="selection" scaleTo={0.99}>
      <View style={[styles.help, !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.border }]}>
        <View style={[styles.helpIcon, { backgroundColor: t.surface }]}>
          <Icon name={icon} size={16} color={t.brand} />
        </View>
        <View style={{ flex: 1 }}>
          <Text variant="bodyStrong">{label}</Text>
          <Text variant="caption" tone="secondary">
            {detail}
          </Text>
        </View>
        <Icon name="chevron" size={14} color={t.textTertiary} />
      </View>
    </Tap>
  );
}

const styles = StyleSheet.create({
  portrait: { width: '100%', justifyContent: 'flex-end', overflow: 'hidden' },
  skyMascot: { position: 'absolute', top: 88, alignSelf: 'center', width: 220, height: 168, opacity: 0.88 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  chrome: { flexDirection: 'row', alignItems: 'center' },
  slot: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  care: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingLeft: space.md, paddingRight: space.sm, paddingVertical: space.sm, borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth },
  careMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.sm },
  careSend: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', top: 2, right: 2, minWidth: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  jar: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingVertical: space.md, borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth },
  portraitBody: { alignItems: 'center', paddingHorizontal: space.xl, paddingBottom: space.lg, gap: space.sm, zIndex: 2 },
  planLine: { color: 'rgba(250,243,230,0.86)', textAlign: 'center', maxWidth: 320 },
  primary: {
    marginTop: space.xs,
    minHeight: 52,
    paddingHorizontal: space.xl,
    borderRadius: radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  below: { paddingHorizontal: space.xl, gap: space.lg },
  mealRow: { flexDirection: 'row', gap: space.sm },
  meal: {
    flex: 1,
    minHeight: 72,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  facts: { flexDirection: 'row', gap: space.sm },
  fact: { alignItems: 'center', gap: 2, paddingVertical: space.md, borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth },
  help: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingVertical: space.md },
  helpIcon: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
});
