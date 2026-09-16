import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Share, StyleSheet, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { AdSlot } from '@/components/ads/AdSlot';
import { LookOrb } from '@/components/look/LookOrb';
import { PostCard } from '@/components/pack/PostCard';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Field } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { Screen, ScreenHeader } from '@/components/ui/Screen';
import { Surface } from '@/components/ui/Surface';
import { Tap } from '@/components/ui/Tap';
import { Text } from '@/components/ui/Text';
import { useAuth } from '@/lib/auth';
import { circleLabel, useCircles, type CircleTab } from '@/lib/circles';
import { useInbox } from '@/lib/inbox';
import { useFeed } from '@/lib/pack';
import { useTheme } from '@/theme/ThemeProvider';
import { space } from '@/theme/tokens';

const PROMPTS = [
  { label: 'At the park', seed: 'At the park now. Anyone else here?' },
  { label: 'Walk at 5', seed: 'Who can take a walk around 5?' },
  { label: 'Daycare pickup', seed: 'Anyone at daycare for pickup?' },
];

export default function Community() {
  const t = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const circles = useCircles();
  const inbox = useInbox();
  const active = circles.active;
  const feed = useFeed({ circleId: active?.id ?? '' });
  const [composer, setComposer] = useState<'create' | 'join' | null>(null);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');

  useEffect(() => {
    void circles.ensureStarter();
  }, [circles.ensureStarter]);

  useFocusEffect(
    useCallback(() => {
      void feed.reload();
    }, [feed.reload]),
  );

  const goPost = (seed?: string) => {
    if (!active) return;
    router.push({ pathname: '/(app)/new-post', params: { circleId: active.id, ...(seed ? { seed } : {}) } });
  };

  const shareCircle = async (circle: CircleTab) => {
    if (!circle.inviteCode) return;
    await Share.share({
      message: `Join my Dog Better circle "${circleLabel(circle)}". Open Community, tap Join, and enter ${circle.inviteCode}.`,
    });
  };

  const create = async () => {
    const { circle, error } = await circles.create(name);
    if (!circle) {
      Alert.alert('Could not create that circle', error ?? 'Try again in a moment.');
      return;
    }
    setName('');
    setComposer(null);
    await shareCircle(circle);
  };

  const join = async () => {
    const found = await circles.join(code);
    if (!found) {
      Alert.alert('That code did not work', 'Ask them to share the circle again.');
      return;
    }
    setCode('');
    setComposer(null);
  };

  const remove = (id: string) => {
    Alert.alert('Delete this post?', 'It leaves this circle. Comments go with it.', [
      { text: 'Keep it', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => void feed.remove(feed.posts.find((p) => p.id === id)!) },
    ]);
  };

  return (
    <View style={{ flex: 1 }}>
      <Screen dock refreshing={feed.refreshing} onRefresh={feed.refresh}>
        <ScreenHeader
          title={active ? circleLabel(active) : 'Your circles'}
          subtitle="Street, family, daycare. Not the whole internet."
          trailing={
            <View style={styles.headerActions}>
              {inbox.unreadComments > 0 ? (
                <View style={[styles.badge, { backgroundColor: t.bad }]}>
                  <Text variant="micro" style={{ color: t.onMeaning }}>
                    {inbox.unreadComments > 9 ? '9+' : inbox.unreadComments}
                  </Text>
                </View>
              ) : null}
              {active?.inviteCode ? (
                <Tap onPress={() => shareCircle(active)} haptic="selection" style={[styles.share, { backgroundColor: t.surface }]} accessibilityLabel="Share this circle">
                  <Icon name="share" size={18} />
                </Tap>
              ) : null}
              <Tap onPress={() => router.push('/(app)/look')} haptic="medium" style={[styles.share, { backgroundColor: t.brand }]} accessibilityLabel="Look at a photo of your dog">
                <Icon name="sparkle" size={20} color={t.onBrand} />
              </Tap>
            </View>
          }
        />

        <View style={styles.chips}>
          {circles.circles.map((c) => (
            <Chip key={c.id} label={circleLabel(c)} icon={c.kind === 'nearby' ? 'location' : c.kind === 'contacts' ? 'person' : 'careTeam'} selected={c.id === active?.id} onPress={() => circles.setActive(c.id)} />
          ))}
          <Chip label="Create" icon="plus" onPress={() => setComposer('create')} />
          <Chip label="Join" icon="link" onPress={() => setComposer('join')} />
        </View>

        {active ? (
          <View style={styles.chips}>
            {PROMPTS.map((p) => (
              <Chip key={p.label} label={p.label} onPress={() => goPost(p.seed)} />
            ))}
          </View>
        ) : null}

        {composer ? (
          <Surface kind="grouped" style={{ gap: space.md }}>
            {composer === 'create' ? (
              <>
                <Text variant="headline">New circle</Text>
                <Text variant="caption" tone="secondary">
                  A street, a daycare, a family. After you create it, send the invite.
                </Text>
                <Field label="Name" placeholder="Oak Street, Sunny Daycare" value={name} onChangeText={setName} maxLength={40} />
                <View style={styles.row}>
                  <Button label="Create" icon="plus" onPress={create} disabled={name.trim().length < 2} style={{ flex: 1 }} />
                  <Button label="Cancel" kind="ghost" onPress={() => setComposer(null)} />
                </View>
              </>
            ) : (
              <>
                <Text variant="headline">Join a circle</Text>
                <Field label="Invite code" placeholder="K7M2QX" value={code} onChangeText={setCode} autoCapitalize="characters" />
                <View style={styles.row}>
                  <Button label="Join" icon="check" onPress={join} disabled={code.trim().length < 4} style={{ flex: 1 }} />
                  <Button label="Cancel" kind="ghost" onPress={() => setComposer(null)} />
                </View>
              </>
            )}
          </Surface>
        ) : null}

        {!active ? (
          <Text variant="body" tone="secondary">
            Create Street or Family, or join with a code.
          </Text>
        ) : feed.loading ? null : feed.posts.length === 0 ? (
          <Animated.View entering={FadeInUp.duration(260)}>
            <Surface kind="fur" style={styles.empty}>
              <Image source={require('@/assets/brand/mascot.png')} style={{ width: 140, height: 120 }} contentFit="contain" />
              <Text variant="title" align="center">
                Nobody has posted here
              </Text>
              <Text variant="body" tone="secondary" align="center">
                Who is at the park. Who can take a walk at 5. Invite this circle, then ask.
              </Text>
              <Button label="At the park" icon="park" kind="secondary" onPress={() => goPost(PROMPTS[0].seed)} />
            </Surface>
          </Animated.View>
        ) : (
          feed.posts.flatMap((p, i) => [
            <PostCard
              key={p.id}
              post={p}
              index={i}
              onLike={() => feed.like(p)}
              onOpen={() => router.push({ pathname: '/(app)/post/[id]', params: { id: p.id } })}
              onDelete={user && p.author_id === user.id ? () => remove(p.id) : undefined}
            />,
            ...(i === 1 ? [<AdSlot key="ad" placement="community" />] : []),
          ])
        )}
      </Screen>
      <LookOrb
        icon="plus"
        label="Post a photo"
        onPress={() => goPost()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  share: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  badge: { minWidth: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  empty: { alignItems: 'center', gap: space.md, paddingVertical: space.xxl },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
});
