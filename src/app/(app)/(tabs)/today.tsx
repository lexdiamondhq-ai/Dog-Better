import * as Clipboard from 'expo-clipboard';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Share, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { DogSwitcher } from '@/components/dogs/DogSwitcher';
import { LookOrb } from '@/components/look/LookOrb';
import { TreatPocket } from '@/components/points/TreatPocket';
import { DayFilm } from '@/components/today/DayFilm';
import { Skeleton } from '@/components/ui/Skeleton';
import { DogAvatar } from '@/components/ui/DogAvatar';
import { Icon, type IconName } from '@/components/ui/Icon';
import { IconWell } from '@/components/ui/IconWell';
import { Screen, Section } from '@/components/ui/Screen';
import { GroupedList } from '@/components/ui/Surface';
import { Tap } from '@/components/ui/Tap';
import { Text } from '@/components/ui/Text';
import { useDogActivity } from '@/lib/activity';
import { useAuth } from '@/lib/auth';
import { useDogs } from '@/lib/dogs';
import { useInbox } from '@/lib/inbox';
import { usePoints } from '@/lib/points';
import { buildDayFilm } from '@/engine/dayFilm';
import { JAR_POCKET } from '@/engine/rewards';
import { walkGoalMinutes } from '@/engine/walkGoal';
import { formatWeight } from '@/lib/units';
import { pickDuty, useHeatF, useWalksToday } from '@/lib/duty';
import { buildHandoffSheet } from '@/lib/handoff';
import { usePreferences } from '@/lib/preferences';
import { useSyncNotesMeds } from '@/lib/syncNotesMeds';
import { isOpen, useReminders } from '@/lib/reminders';
import { humanizeError } from '@/lib/errors';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';

export default function Today() {
  const t = useTheme();
  const { height: windowH } = useWindowDimensions();
  const portraitH = Math.round(Math.min(windowH * 0.52, 520));
  const router = useRouter();
  const { user } = useAuth();
  const { dog } = useDogs();
  const activity = useDogActivity(dog);
  const inbox = useInbox();
  const { award, revoke } = usePoints();
  const bellCount = inbox.unread;
  const { weightUnit } = usePreferences();
  const reminders = useReminders(dog?.id);
  useSyncNotesMeds(dog);
  const heatF = useHeatF();
  const walks = useWalksToday(dog?.id);
  const walksToday = walks.count;
  const [logging, setLogging] = useState<string | null>(null);
  const [mealError, setMealError] = useState<string | null>(null);
  const [switcher, setSwitcher] = useState(false);

  const name = dog?.name ?? 'your dog';
  const duty = useMemo(
    () => pickDuty({ name, dueToday: reminders.dueToday, nextMed: reminders.nextMed, walksToday, heatF }),
    [name, reminders.dueToday, reminders.nextMed, walksToday, heatF],
  );
  const sky = dog?.avatar_url;
  const dayStart = useMemo(() => {
    const d = new Date(activity.fetchedAt || 0);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [activity.fetchedAt]);
  const weightToday = activity.weights.find((w) => new Date(w.recorded_at) >= dayStart) ?? null;
  const weightLabel = formatWeight(dog?.weight_kg, weightUnit);
  const walkGoal = walkGoalMinutes(dog?.breed, heatF);
  const medsToday = reminders.onDay(reminders.today).filter((r) => r.kind === 'medication');
  const film = useMemo(
    () =>
      buildDayFilm({
        mealsToday: activity.mealsToday,
        walksToday,
        walkMinutes: walkGoal.minutes,
        weightToday,
        weightLabel,
        medsDueToday: medsToday.filter(isOpen).length,
        medsLoggedToday: medsToday.length,
      }),
    [activity.mealsToday, walksToday, walkGoal.minutes, weightToday, weightLabel, medsToday],
  );
  const jarHolds = film.filter((f) => f.tone !== 'empty').length;
  const ready = !activity.loading && reminders.loaded && !walks.loading;
  const firstRun = ready && !activity.mealsToday.length && walksToday === 0 && !reminders.count;

  const logMeal = async (kind: 'breakfast' | 'dinner' | 'treat') => {
    if (!dog || !user) return;
    setLogging(kind);
    setMealError(null);
    try {
      const existing = activity.mealsToday.find((m) => m.kind === kind);
      if (existing) {
        const { error } = await supabase.from('meals').delete().eq('id', existing.id);
        if (error) throw error;
        if (kind === 'treat') {
          const left = activity.mealsToday.filter((m) => m.kind === 'treat').length - 1;
          await revoke({ kind: 'treat', key: `treat:${dog.id}:${Math.max(0, left)}`, dogId: dog.id });
        } else {
          await revoke({ kind: 'meal', key: `meal:${dog.id}:${kind}:once`, dogId: dog.id });
        }
      } else {
        const treatN = activity.mealsToday.filter((m) => m.kind === 'treat').length;
        const { error } = await supabase.from('meals').insert({ dog_id: dog.id, owner_id: user.id, kind });
        if (error) throw error;
        if (kind === 'treat') {
          await award({ kind: 'treat', key: `treat:${dog.id}:${treatN}`, dogId: dog.id });
        } else {
          await award({ kind: 'meal', key: `meal:${dog.id}:${kind}:once`, dogId: dog.id });
        }
      }
      await activity.reload();
    } catch (e) {
      setMealError(humanizeError(e, 'Could not save that meal.'));
    } finally {
      setLogging(null);
    }
  };

  const onPrimary = () => router.push(duty.href);

  return (
    <View style={{ flex: 1 }}>
    <Screen dock flushTop padded={false} refreshing={activity.refreshing} onRefresh={activity.refresh}>
      <Animated.View entering={t.reduceMotion ? undefined : FadeIn.duration(400)} style={[styles.portrait, { height: portraitH }]}>
        {sky ? (
          <Image source={{ uri: sky }} style={StyleSheet.absoluteFill} contentFit="cover" transition={280} />
        ) : (
          <LinearGradient colors={[t.brandDeep, t.brand, t.bg]} locations={[0, 0.45, 1]} style={StyleSheet.absoluteFill} />
        )}
        {!sky ? <Image source={require('@/assets/brand/mascot.png')} style={styles.skyMascot} contentFit="contain" /> : null}
        <LinearGradient colors={['rgba(20,14,11,0.42)', 'transparent', 'transparent', t.bg]} locations={[0, 0.12, 0.58, 1]} style={StyleSheet.absoluteFill} pointerEvents="none" />

        <View style={styles.portraitBody} pointerEvents="box-none">
          <Text variant="body" style={styles.planLine} numberOfLines={2}>
            {ready ? duty.line : 'Checking what happened today.'}
          </Text>
          <Tap onPress={onPrimary} haptic="medium" style={[styles.primary, { backgroundColor: t.bgRaised }]} accessibilityRole="button" accessibilityLabel={duty.label}>
            <Icon name={duty.icon} size={18} color={t.brand} />
            <Text variant="headline" numberOfLines={1} ellipsizeMode="tail" style={styles.primaryLabel}>
              {duty.label}
            </Text>
          </Tap>
        </View>
      </Animated.View>

      <View style={styles.below}>
        <View style={styles.nameRow}>
          <View style={{ flex: 1 }}>
            <Text variant="title" numberOfLines={1}>
              {dog?.name ?? 'Your dog'}
            </Text>
            <Text variant="caption" tone="secondary">
              {weightLabel ?? 'Add a weight on the care sheet'}
            </Text>
          </View>
          <View style={styles.chrome} pointerEvents="box-none">
            <Tap onPress={() => setSwitcher(true)} haptic="selection" style={styles.slot} accessibilityLabel="Switch dog profile">
              <DogAvatar uri={dog?.avatar_url} size={28} ring={false} />
            </Tap>
            <Tap onPress={() => router.push('/(app)/inbox')} haptic="selection" style={styles.slot} accessibilityLabel={bellCount ? `${bellCount} new activity` : 'Inbox'}>
              <Icon name="bell" size={22} color={t.text} />
              {bellCount > 0 ? (
                <View style={[styles.badge, { backgroundColor: t.bad, borderColor: t.bg }]}>
                  <Text variant="micro" style={{ color: t.onMeaning }}>
                    {bellCount > 9 ? '9+' : bellCount}
                  </Text>
                </View>
              ) : null}
            </Tap>
            <Tap onPress={() => router.push('/(app)/settings')} haptic="selection" style={styles.slot} accessibilityLabel="Settings">
              <Icon name="settings" size={22} color={t.text} />
            </Tap>
          </View>
        </View>

        {ready ? (
          <TreatPocket
            mealKinds={activity.mealsToday.map((m) => m.kind)}
            walksToday={walksToday}
            hasWeight={!!dog?.weight_kg}
            onMeal={(kind) => void logMeal(kind)}
            slots={Array.from({ length: JAR_POCKET }, (_, i) => i < jarHolds)}
          />
        ) : (
          <Skeleton height={56} />
        )}

        {ready ? (
          <DayFilm
            frames={film}
            onMeal={(kind) => {
              if (logging) return;
              void logMeal(kind);
            }}
          />
        ) : (
          <View style={{ flexDirection: 'row', gap: space.xs }}>
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} height={76} style={{ flex: 1 }} />
            ))}
          </View>
        )}
        {firstRun ? (
          <Text variant="caption" tone="secondary">
            Tap breakfast when they eat. Start a walk when you go out. The film fills left to right.
          </Text>
        ) : null}
        {mealError ? (
          <Text variant="caption" tone="bad">
            {mealError}
          </Text>
        ) : null}

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

        <Tap
          onPress={() => router.push('/(app)/emergency')}
          onLongPress={() => router.push('/(app)/lost')}
          delayLongPress={380}
          haptic="heavy"
          style={[styles.emergency, { backgroundColor: t.bgRaised, borderColor: t.bad }]}
          accessibilityRole="button"
          accessibilityLabel="Open emergency mode. Long press for the lost dog packet.">
          <Icon name="emergency" size={20} color={t.bad} />
          <View style={{ flex: 1 }}>
            <Text variant="bodyStrong">Emergency</Text>
            <Text variant="caption" tone="secondary">
              Vet facts, call, and directions
            </Text>
          </View>
          <Icon name="chevron" size={14} color={t.textTertiary} />
        </Tap>

        <Section title="Need something">
          <GroupedList>
            <HelpRow icon="scan" label="Check a treat" detail="Barcode or ingredients, sized to them" onPress={() => router.push('/(app)/scan')} />
            <HelpRow icon="park" label="Parks and trails" detail="Pick a spot and start a walk" onPress={() => router.push('/(app)/walk-spots')} />
            <HelpRow icon="detective" label="Log a symptom" detail="What you see, then a next step" onPress={() => router.push('/(app)/symptoms')} />
            <HelpRow icon="link" label="Shop for this dog" detail="Amazon links with our tag" onPress={() => router.push('/(app)/shop')} last />
          </GroupedList>
        </Section>
      </View>

      <DogSwitcher visible={switcher} onClose={() => setSwitcher(false)} />
    </Screen>
    <LookOrb />
    </View>
  );
}

function HelpRow({ icon, label, detail, onPress, last }: { icon: IconName; label: string; detail: string; onPress: () => void; last?: boolean }) {
  const t = useTheme();
  return (
    <Tap onPress={onPress} haptic="selection" scaleTo={0.99}>
      <View style={[styles.help, !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.border }]}>
        <IconWell name={icon} />
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
  slot: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  care: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingLeft: space.md, paddingRight: space.sm, paddingVertical: space.sm, borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth },
  careMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.sm },
  careSend: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  emergency: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.md, paddingVertical: space.md, borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth },
  badge: { position: 'absolute', top: 2, right: 2, minWidth: 18, height: 18, borderRadius: 9, borderWidth: 2, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  portraitBody: { alignItems: 'center', paddingHorizontal: space.xl, paddingBottom: space.lg, gap: space.sm, zIndex: 2 },
  planLine: { color: 'rgba(250,243,230,0.86)', textAlign: 'center', maxWidth: 320 },
  primary: {
    marginTop: space.xs,
    minHeight: 52,
    maxWidth: '100%',
    paddingHorizontal: space.xl,
    borderRadius: radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    overflow: 'hidden',
  },
  primaryLabel: { flexShrink: 1 },
  below: { paddingHorizontal: space.xl, gap: space.lg },
  help: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingVertical: space.md },
});
