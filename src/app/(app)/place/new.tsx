import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';

import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Field } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { Screen, ScreenHeader } from '@/components/ui/Screen';
import { Surface } from '@/components/ui/Surface';
import { Text } from '@/components/ui/Text';
import { useAuth } from '@/lib/auth';
import { KIND_META, type PlaceKind } from '@/lib/places';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';

const KINDS: PlaceKind[] = ['dog_park', 'trail', 'patio', 'beach', 'other'];

export default function NewPlace() {
  const t = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const params = useLocalSearchParams<{ lat: string; lng: string }>();
  const lat = Number(params.lat);
  const lng = Number(params.lng);

  const [name, setName] = useState('');
  const [kind, setKind] = useState<PlaceKind>('dog_park');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    if (!user) return;
    if (name.trim().length < 2) {
      setError('Give the spot a name others will recognize.');
      return;
    }
    setSaving(true);
    const { data, error: err } = await supabase.from('places').insert({ name: name.trim(), kind, lat, lng, created_by: user.id }).select().single();
    setSaving(false);
    if (err || !data) {
      setError(err?.message ?? 'Could not save');
      return;
    }
    router.replace({ pathname: '/(app)/place/[id]', params: { id: data.id } });
  };

  return (
    <Screen keyboardShouldPersistTaps="handled">
      <ScreenHeader eyebrow="Places" title="Add a spot" subtitle="Share a dog-friendly place the map does not know about yet." onBack={() => router.back()} />

      <View style={[styles.map, { borderColor: t.border }]}>
        <MapView
          style={StyleSheet.absoluteFill}
          initialRegion={{ latitude: lat, longitude: lng, latitudeDelta: 0.008, longitudeDelta: 0.008 }}
          scrollEnabled={false}
          zoomEnabled={false}
          pitchEnabled={false}
          rotateEnabled={false}
          showsPointsOfInterests={false}>
          <Marker coordinate={{ latitude: lat, longitude: lng }}>
            <View style={[styles.pin, { backgroundColor: t.brand }]}>
              <Icon name="paw" size={16} color={t.onBrand} />
            </View>
          </Marker>
        </MapView>
      </View>

      <Surface kind="raised" style={{ gap: space.lg }}>
        <Field label="Name" placeholder="e.g. Riverside off-leash meadow" value={name} onChangeText={setName} autoFocus error={error ?? undefined} />
        <View style={{ gap: space.sm }}>
          <Text variant="label" tone="secondary">
            What is it?
          </Text>
          <View style={styles.chips}>
            {KINDS.map((k) => (
              <Chip key={k} label={KIND_META[k].label} selected={kind === k} onPress={() => setKind(k)} />
            ))}
          </View>
        </View>
        <Button label="Add to the map" icon="pin" onPress={save} loading={saving} size="lg" />
      </Surface>
    </Screen>
  );
}

const styles = StyleSheet.create({
  map: { height: 180, borderRadius: radius.lg, overflow: 'hidden', borderWidth: 1 },
  pin: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
});
