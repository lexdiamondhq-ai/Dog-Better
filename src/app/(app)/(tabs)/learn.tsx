import { Image } from 'expo-image';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInUp, LinearTransition } from 'react-native-reanimated';

import { AdSlot } from '@/components/ads/AdSlot';
import { LookOrb } from '@/components/look/LookOrb';
import { Chip } from '@/components/ui/Chip';
import { Skeleton } from '@/components/ui/Skeleton';
import { Icon, type IconName } from '@/components/ui/Icon';
import { Screen, ScreenHeader, Section } from '@/components/ui/Screen';
import { GroupedList, Surface } from '@/components/ui/Surface';
import { Tap } from '@/components/ui/Tap';
import { Text } from '@/components/ui/Text';
import { useRouter } from 'expo-router';

import { TonightSession } from '@/components/learn/TonightSession';
import { catalog, FREE_SESSION_LIMIT, selectTonight, sessionFromTonight, tipsForToday, TIPS, type Tip } from '@/engine/guidance';
import { useDogActivity } from '@/lib/activity';
import { useDogs } from '@/lib/dogs';
import { useEntitlements } from '@/lib/entitlements';
import { usePreferences } from '@/lib/preferences';
import { usePoints } from '@/lib/points';
import { useTheme } from '@/theme/ThemeProvider';
import { space } from '@/theme/tokens';

const TOPICS: { id: Tip['topic'] | 'all'; label: string; icon: IconName }[] = [
  { id: 'all', label: 'All', icon: 'sparkle' },
  { id: 'training', label: 'Training', icon: 'paw' },
  { id: 'health', label: 'Health', icon: 'care' },
  { id: 'enrichment', label: 'Enrichment', icon: 'toy' },
  { id: 'safety', label: 'Safety', icon: 'shield' },
  { id: 'routine', label: 'Routine', icon: 'clock' },
];

export default function Learn() {
  const t = useTheme();
  const { dog } = useDogs();
  const a = useDogActivity(dog);
  const { weightUnit } = usePreferences();
  const { isPremium } = useEntitlements();
  const tonight = useMemo(() => selectTonight(dog, a.health, new Date(), weightUnit, isPremium), [dog, a.health, weightUnit, isPremium]);
  const more = useMemo(() => {
    const skip = tonight.kind === 'tip' ? tonight.tip.id : null;
    return tipsForToday(new Date(), 4, isPremium).filter((tip) => tip.id !== skip).slice(0, 3);
  }, [tonight, isPremium]);
  const router = useRouter();
  const [topic, setTopic] = useState<Tip['topic'] | 'all'>('all');
  const inTopic = TIPS.filter((tip) => topic === 'all' || tip.topic === topic);
  const library = catalog(isPremium).filter((tip) => topic === 'all' || tip.topic === topic);
  const lockedCount = isPremium ? 0 : inTopic.filter((tip) => tip.premium).length;
  const session = useMemo(() => sessionFromTonight(tonight), [tonight]);

  return (
    <View style={{ flex: 1 }}>
    <Screen dock refreshing={a.refreshing} onRefresh={a.refresh}>
      <ScreenHeader title={dog?.name ?? 'Learn'} subtitle="Flip five cards. Know a little more." />

      {a.loading ? (
        <Skeleton height={220} />
      ) : (
        <Animated.View entering={t.reduceMotion ? undefined : FadeInUp.duration(280)} layout={LinearTransition}>
          <TonightSession session={session} footer={<ShopNote topic={session.topic} />} />
        </Animated.View>
      )}

      <Section title="Also useful">
        <GroupedList>
          {more.map((tip, i) => (
            <TipRow key={tip.id} tip={tip} last={i === more.length - 1} />
          ))}
        </GroupedList>
      </Section>

      <AdSlot placement="learn" />

      <Section title="Library">
        <View style={styles.topics}>
          {TOPICS.map((tp) => (
            <Chip key={tp.id} label={tp.label} icon={tp.icon} selected={topic === tp.id} onPress={() => setTopic(tp.id)} />
          ))}
        </View>
        <GroupedList>
          {library.map((tip, i) => (
            <TipRow key={tip.id} tip={tip} last={i === library.length - 1 && lockedCount === 0} />
          ))}
        </GroupedList>
        {lockedCount > 0 ? (
          <Tap onPress={() => router.push({ pathname: '/paywall', params: { from: 'learn' } })} haptic="medium">
            <Surface kind="grouped" style={styles.vault}>
              <Icon name="lock" size={18} color={t.brand} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text variant="bodyStrong">More in the vault</Text>
                <Text variant="caption" tone="secondary">
                  {lockedCount} more in the daily wheel. Free is {FREE_SESSION_LIMIT}. Open the rest with Premium.
                </Text>
              </View>
              <Icon name="chevron" size={14} color={t.textTertiary} />
            </Surface>
          </Tap>
        ) : null}
      </Section>

      <Text variant="caption" tone="tertiary" align="center">
        General guidance, not a diagnosis. Your vet knows {dog?.name ?? 'your dog'}; when in doubt, call them.
      </Text>
    </Screen>
    <LookOrb />
    </View>
  );
}

const SHOP_PREVIEW: Record<Tip['topic'], { uri: string; label: string }> = {
  training: { uri: 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=240&h=240&fit=crop', label: 'Training treats' },
  health: { uri: 'https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?w=240&h=240&fit=crop', label: 'Care kit' },
  enrichment: { uri: 'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=240&h=240&fit=crop', label: 'Puzzle feeder' },
  safety: { uri: 'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=240&h=240&fit=crop', label: 'Harness and leash' },
  routine: { uri: 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=240&h=240&fit=crop', label: 'Daily walk gear' },
};

function ShopNote({ topic }: { topic: Tip['topic'] }) {
  const t = useTheme();
  const router = useRouter();
  const preview = SHOP_PREVIEW[topic];
  return (
    <Tap onPress={() => router.push('/(app)/shop')} haptic="selection">
      <View style={[styles.shop, { backgroundColor: t.surface }]}>
        <Image source={{ uri: preview.uri }} style={styles.shopImg} contentFit="cover" />
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="bodyStrong">{preview.label}</Text>
          <Text variant="label" tone="brand">
            Open shop
          </Text>
        </View>
        <Icon name="chevron" size={14} color={t.textTertiary} />
      </View>
    </Tap>
  );
}

function TipRow({ tip, last }: { tip: Tip; last: boolean }) {
  const t = useTheme();
  const { award } = usePoints();
  const [open, setOpen] = useState(false);
  return (
    <Tap
      onPress={() => {
        setOpen((v) => !v);
        void award({ kind: 'tip', key: `tip:${tip.id}` });
      }}
      haptic="selection"
      scaleTo={0.995}>
      <View style={[styles.row, !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.border }]}>
        <View style={styles.head}>
          <Text variant="bodyStrong" style={{ flex: 1 }}>
            {tip.title}
          </Text>
          <Icon name="chevron" size={16} color={t.textTertiary} style={{ transform: [{ rotate: open ? '90deg' : '0deg' }] }} />
        </View>
        {open ? (
          <View style={{ gap: space.sm }}>
            <Text variant="body" tone="secondary">
              {tip.body}
            </Text>
            <ShopNote topic={tip.topic} />
          </View>
        ) : null}
      </View>
    </Tap>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  topics: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  row: { paddingHorizontal: space.lg, paddingVertical: space.md, gap: space.sm },
  vault: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginTop: space.sm },
  shop: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.sm, borderRadius: 14 },
  shopImg: { width: 56, height: 56, borderRadius: 12 },
});
