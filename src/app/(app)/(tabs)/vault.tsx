import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Dimensions, Linking, StyleSheet, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { Button } from '@/components/ui/Button';
import { DogAvatar } from '@/components/ui/DogAvatar';
import { Icon, type IconName } from '@/components/ui/Icon';
import { Screen, ScreenHeader, Section } from '@/components/ui/Screen';
import { Surface } from '@/components/ui/Surface';
import { Tap } from '@/components/ui/Tap';
import { Text } from '@/components/ui/Text';
import { useAuth } from '@/lib/auth';
import { dogAgeLabel, useDogs } from '@/lib/dogs';
import { supabase } from '@/lib/supabase';
import { useVaultPhotos } from '@/lib/vault';
import { useTheme } from '@/theme/ThemeProvider';
import { CONTENT_INSET_END, radius, space } from '@/theme/tokens';

const GRID_W = Dimensions.get('window').width - CONTENT_INSET_END - space.xl;
const CELL = (GRID_W - space.sm * 2) / 3;

export default function Vault() {
  const t = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const { dog, dogs, setActiveDog } = useDogs();
  const gallery = useVaultPhotos(dog?.id);

  const age = dogAgeLabel(dog?.birthdate ?? null);

  return (
    <Screen rail>
      <ScreenHeader
        eyebrow="Vault"
        title={dog?.name ?? 'Your dog'}
        subtitle="Everything about them, kept safe."
        trailing={
          <Tap onPress={() => router.push('/(app)/dog/edit')} haptic="selection" style={[styles.iconBtn, { backgroundColor: t.surface }]} accessibilityLabel="Edit profile">
            <Icon name="edit" size={18} />
          </Tap>
        }
      />

      <Animated.View entering={FadeInUp.delay(40).springify().damping(18)}>
        <Surface kind="fur" style={styles.hero}>
          <DogAvatar uri={dog?.avatar_url} size={104} />
          <View style={{ alignItems: 'center', gap: 2 }}>
            <Text variant="display" align="center">
              {dog?.name}
            </Text>
            <Text variant="body" tone="secondary" align="center">
              {[dog?.breed, dog?.sex ? cap(dog.sex) : null, age].filter(Boolean).join(' - ') || 'Add a few details'}
            </Text>
          </View>
          <View style={styles.facts}>
            <Fact icon="weight" label="Weight" value={dog?.weight_kg ? `${dog.weight_kg} kg` : 'Add'} />
            <Fact icon="cake" label="Age" value={age ?? 'Add'} />
            <Fact icon="photo" label="Photos" value={String(gallery.photos.length)} />
          </View>
        </Surface>
      </Animated.View>

      {dogs.length > 1 ? (
        <View style={styles.switcher}>
          {dogs.map((d) => (
            <Tap key={d.id} onPress={() => setActiveDog(d.id)} haptic="selection" style={[styles.dogChip, { backgroundColor: d.id === dog?.id ? t.brand : t.surface }]}>
              <DogAvatar uri={d.avatar_url} size={26} ring={false} />
              <Text variant="label" style={{ color: d.id === dog?.id ? t.onBrand : t.text }}>
                {d.name}
              </Text>
            </Tap>
          ))}
        </View>
      ) : null}

      <Section
        title="Gallery"
        action={
          <Tap onPress={() => router.push('/(app)/snap')} haptic="medium" style={styles.inlineAction}>
            <Icon name="camera" size={16} color={t.brand} />
            <Text variant="label" tone="brand">
              Snap
            </Text>
          </Tap>
        }>
        {gallery.photos.length === 0 ? (
          <Animated.View entering={FadeInUp.delay(120)}>
            <Tap onPress={() => router.push('/(app)/snap')} haptic="medium">
              <Surface kind="outline" style={styles.emptyGallery}>
                <Icon name="camera" size={28} color={t.brand} />
                <Text variant="bodyStrong">Take {dog?.name ? `${dog.name}'s` : 'the'} first vault photo</Text>
                <Text variant="caption" tone="tertiary" align="center">
                  Private to you. Share to the pack only when you choose.
                </Text>
              </Surface>
            </Tap>
          </Animated.View>
        ) : (
          <View style={styles.grid}>
            {gallery.photos.map((p, i) => (
              <Animated.View key={p.id} entering={FadeInUp.delay(Math.min(i, 9) * 40)}>
                <Tap onPress={() => router.push({ pathname: '/(app)/photo/[id]', params: { id: p.id } })} haptic="selection" scaleTo={0.96} accessibilityLabel={p.caption ?? `Photo ${gallery.photos.length - i} of ${gallery.photos.length}`}>
                  <Image source={{ uri: p.url }} style={[styles.cell, i === 0 && styles.cellHero]} contentFit="cover" transition={200} />
                </Tap>
              </Animated.View>
            ))}
          </View>
        )}
      </Section>

      <Section title="Records">
        <Animated.View entering={FadeInUp.delay(180)}>
          <Surface kind="raised" padding={0} style={{ overflow: 'hidden' }}>
            <Row icon="vet" label="Vet" value={dog?.vet_name ?? 'Not set'} onPress={dog?.vet_phone ? () => Linking.openURL(`tel:${dog.vet_phone}`) : () => router.push('/(app)/dog/edit')} trailing={dog?.vet_phone ? 'Call' : 'Add'} />
            <Row icon="shield" label="Microchip" value={dog?.microchip ?? 'Not set'} onPress={() => router.push('/(app)/dog/edit')} />
            <Row icon="warning" label="Allergies" value={dog?.allergies?.length ? dog.allergies.join(', ') : 'None known'} onPress={() => router.push('/(app)/dog/edit')} />
            <Row icon="info" label="Notes" value={dog?.notes ?? 'Add anything a sitter should know'} onPress={() => router.push('/(app)/dog/edit')} last />
          </Surface>
        </Animated.View>
      </Section>

      <Section title="Account">
        <Surface kind="tonal" padding={0} style={{ overflow: 'hidden' }}>
          <Row icon="plus" label="Add another dog" value="Profiles for the whole pack" onPress={() => router.push('/onboarding')} />
          <Row icon="person" label="Signed in" value={user?.email ?? ''} last />
        </Surface>
        <Button label="Sign out" kind="ghost" icon="logout" onPress={() => supabase.auth.signOut()} />
      </Section>
    </Screen>
  );
}

function Fact({ icon, label, value }: { icon: IconName; label: string; value: string }) {
  const t = useTheme();
  return (
    <View style={[styles.fact, { backgroundColor: t.bgRaised }]}>
      <Icon name={icon} size={16} color={t.brand} />
      <Text variant="bodyStrong">{value}</Text>
      <Text variant="caption" tone="tertiary">
        {label}
      </Text>
    </View>
  );
}

function Row({ icon, label, value, onPress, trailing, last }: { icon: IconName; label: string; value: string; onPress?: () => void; trailing?: string; last?: boolean }) {
  const t = useTheme();
  const inner = (
    <View style={[styles.row, !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.border }]}>
      <View style={[styles.rowIcon, { backgroundColor: t.surfaceStrong }]}>
        <Icon name={icon} size={16} color={t.brand} />
      </View>
      <View style={{ flex: 1, gap: 1 }}>
        <Text variant="caption" tone="tertiary">
          {label}
        </Text>
        <Text variant="bodyStrong" numberOfLines={2}>
          {value}
        </Text>
      </View>
      {onPress ? (
        trailing ? (
          <Text variant="label" tone="brand">
            {trailing}
          </Text>
        ) : (
          <Icon name="chevron" size={16} color={t.textTertiary} />
        )
      ) : null}
    </View>
  );
  return onPress ? (
    <Tap onPress={onPress} haptic="selection" scaleTo={0.99}>
      {inner}
    </Tap>
  ) : (
    inner
  );
}

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const styles = StyleSheet.create({
  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  hero: { alignItems: 'center', gap: space.lg, paddingVertical: space.xl },
  facts: { flexDirection: 'row', gap: space.sm, alignSelf: 'stretch' },
  fact: { flex: 1, alignItems: 'center', gap: 2, paddingVertical: space.md, borderRadius: radius.md },
  switcher: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  dogChip: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingLeft: 6, paddingRight: space.md, height: 38, borderRadius: radius.pill },
  inlineAction: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  emptyGallery: { alignItems: 'center', gap: space.sm, paddingVertical: space.xxl },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  cell: { width: CELL, height: CELL, borderRadius: radius.md },
  cellHero: { width: CELL * 2 + space.sm, height: CELL * 2 + space.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingVertical: space.md },
  rowIcon: { width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
