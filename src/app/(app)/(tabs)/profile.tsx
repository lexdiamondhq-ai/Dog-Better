import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Dimensions, Linking, StyleSheet, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { DogAvatar } from '@/components/ui/DogAvatar';
import { Icon, type IconName } from '@/components/ui/Icon';
import { Screen, ScreenHeader, Section } from '@/components/ui/Screen';
import { GroupedList, Surface } from '@/components/ui/Surface';
import { Tap } from '@/components/ui/Tap';
import { Text } from '@/components/ui/Text';
import { INSURANCE_PARTNERS } from '@/content/partners';
import { useAuth } from '@/lib/auth';
import { ADD_DOG_HREF, dogAgeLabel, useDogs } from '@/lib/dogs';
import { changeDogPhoto } from '@/lib/media';
import { usePoints } from '@/lib/points';
import { usePreferences } from '@/lib/preferences';
import { formatWeight } from '@/lib/units';
import { isImagePath } from '@/lib/media';
import { useVaultPhotos } from '@/lib/vault';
import { useVetVisits } from '@/lib/visits';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';

const GRID_W = Dimensions.get('window').width - space.xl * 2;
const CELL = (GRID_W - space.sm * 2) / 3;

export default function Profile() {
  const t = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const { dog, dogs, setActiveDog, refresh } = useDogs();
  const gallery = useVaultPhotos(dog?.id);
  const visits = useVetVisits(dog?.id);
  const { total } = usePoints();
  const { weightUnit } = usePreferences();

  const age = dogAgeLabel(dog?.birthdate ?? null);
  const [changingPhoto, setChangingPhoto] = useState(false);

  const changePhoto = async () => {
    if (!dog || !user) return;
    setChangingPhoto(true);
    try {
      if (await changeDogPhoto(dog.id, user.id)) await refresh();
    } catch {
      // The picker was cancelled or the upload failed; the old photo simply stays.
    } finally {
      setChangingPhoto(false);
    }
  };

  return (
    <Screen dock>
      <ScreenHeader
        title={dog?.name ?? 'Your dog'}
        subtitle="Records, documents, and settings, kept private."
        trailing={
          <View style={styles.headerActions}>
            <Tap onPress={() => router.push('/(app)/dog/edit')} haptic="selection" style={[styles.iconBtn, { backgroundColor: t.surface }]} accessibilityLabel="Edit profile">
              <Icon name="edit" size={18} />
            </Tap>
            <Tap onPress={() => router.push('/(app)/settings')} haptic="selection" style={[styles.iconBtn, { backgroundColor: t.surface }]} accessibilityLabel="Settings">
              <Icon name="settings" size={18} />
            </Tap>
          </View>
        }
      />

      <Section title="This dog">
        <GroupedList>
          <Row icon="paw" label="Breed" value={[dog?.breed, dog?.sex ? cap(dog.sex) : null].filter(Boolean).join(' · ') || 'Add breed'} onPress={() => router.push('/(app)/dog/edit')} />
          <Row icon="weight" label="Weight" value={formatWeight(dog?.weight_kg, weightUnit) ?? 'Add'} onPress={() => router.push('/(app)/(tabs)/track')} />
          <Row icon="cake" label="Age" value={age ?? 'Add'} onPress={() => router.push('/(app)/dog/edit')} />
          <Row icon="camera" label="Today portrait" value={changingPhoto ? 'Uploading' : 'Change the photo on Today'} onPress={changePhoto} />
          <Row icon="paw" label="Treat jar" value={`${total.toLocaleString()} treats`} onPress={() => router.push('/(app)/settings/points')} last />
        </GroupedList>
      </Section>

      <Section title="Dogs in this house">
        <View style={styles.switcher}>
          {dogs.map((d) => (
            <Tap key={d.id} onPress={() => setActiveDog(d.id)} haptic="selection" style={[styles.dogChip, { backgroundColor: d.id === dog?.id ? t.brand : t.surface }]}>
              <DogAvatar uri={d.avatar_url} size={26} ring={false} />
              <Text variant="label" style={{ color: d.id === dog?.id ? t.onBrand : t.text }}>
                {d.name}
              </Text>
            </Tap>
          ))}
          <Tap onPress={() => router.push(ADD_DOG_HREF)} haptic="medium" style={[styles.dogChip, { backgroundColor: t.furLight }]}>
            <Icon name="plus" size={16} color={t.brand} />
            <Text variant="label" tone="brand">
              Add a dog
            </Text>
          </Tap>
        </View>
        <Text variant="caption" tone="tertiary">
          One profile per dog. Plans and photos never mix.
        </Text>
      </Section>

      <Section
        title="Photos"
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
                <Text variant="bodyStrong">Take {dog?.name ? `${dog.name}'s` : 'the'} first photo</Text>
                <Text variant="caption" tone="tertiary" align="center">
                  Private to you. Paws, skin, ears, and gait over time help your vet.
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

      <Section title="Care team">
        <GroupedList>
          <Row icon="careTeam" label="Care sheet" value="Sitters, walkers, and family" onPress={() => router.push('/(app)/care-team')} />
          <Row icon="vet" label="Clinic pack" value="Weight, symptoms, sheet for the exam room" onPress={() => router.push('/(app)/clinic')} last />
        </GroupedList>
      </Section>

      <Section title="Records">
        <Animated.View entering={FadeInUp.delay(180)}>
          <GroupedList>
            <Row
              icon="vet"
              label="Vet"
              value={dog?.vet_name ?? 'Not set'}
              onPress={dog?.vet_phone ? () => Linking.openURL(`tel:${dog.vet_phone}`) : () => router.push('/(app)/dog/edit')}
              trailing={dog?.vet_phone ? 'Call' : 'Add'}
            />
            <Row
              icon="docScan"
              label="Vet visits"
              value={visits.visits[0] ? `${visits.visits.length} on file · last ${new Date(visits.visits[0].created_at).toLocaleDateString()}` : 'Upload from the care sheet'}
              onPress={() => router.push('/(app)/care-team')}
              trailing={visits.visits.length ? `${visits.visits.length}` : 'Add'}
            />
            <Row icon="shield" label="Microchip" value={dog?.microchip ?? 'Not set'} onPress={() => router.push('/(app)/dog/edit')} />
            <Row icon="warning" label="Allergies" value={dog?.allergies?.length ? dog.allergies.join(', ') : 'None known'} onPress={() => router.push('/(app)/dog/edit')} />
            <Row icon="info" label="Notes" value={dog?.notes ?? 'Add anything a sitter should know'} onPress={() => router.push('/(app)/dog/edit')} />
            <Row icon="shield" label="Pet insurance" value={`Not on file. Compare cover from ${INSURANCE_PARTNERS[0].name}`} onPress={() => Linking.openURL(INSURANCE_PARTNERS[0].url)} trailing="Compare" last />
          </GroupedList>
        </Animated.View>
        {visits.visits.length ? (
          <View style={styles.visitRow}>
            {visits.visits.slice(0, 4).map((v) => (
              <Tap key={v.id} onPress={() => router.push({ pathname: '/(app)/photo/[id]', params: { id: v.id } })} haptic="selection">
                {isImagePath(v.storage_path) ? (
                  <Image source={{ uri: v.url }} style={styles.visitThumb} contentFit="cover" />
                ) : (
                  <View style={[styles.visitThumb, styles.visitFile, { backgroundColor: t.surface }]}>
                    <Icon name="document" size={22} color={t.brand} />
                  </View>
                )}
              </Tap>
            ))}
          </View>
        ) : null}
        <Text variant="caption" tone="tertiary">
          {INSURANCE_PARTNERS[0].disclosure}
        </Text>
      </Section>

      <Section title="Account">
        <GroupedList>
          <Row icon="plus" label="Add another dog" value="Each dog gets their own profile and plan" onPress={() => router.push(ADD_DOG_HREF)} />
          <Row icon="settings" label="Settings" value="Notifications, appearance, help, privacy, account" onPress={() => router.push('/(app)/settings')} />
          <Row icon="person" label="Signed in" value={user?.email ?? ''} last />
        </GroupedList>
      </Section>

    </Screen>
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
  headerActions: { flexDirection: 'row', gap: space.sm },
  switcher: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  dogChip: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingLeft: 6, paddingRight: space.md, height: 38, borderRadius: radius.pill },
  inlineAction: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  emptyGallery: { alignItems: 'center', gap: space.sm, paddingVertical: space.xxl },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  cell: { width: CELL, height: CELL, borderRadius: radius.md },
  cellHero: { width: CELL * 2 + space.sm, height: CELL * 2 + space.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingVertical: space.md },
  rowIcon: { width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  visitRow: { flexDirection: 'row', gap: space.sm },
  visitThumb: { width: 72, height: 72, borderRadius: 14 },
  visitFile: { alignItems: 'center', justifyContent: 'center' },
});
