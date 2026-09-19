import * as Location from 'expo-location';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { Surface } from '@/components/ui/Surface';
import { Tap } from '@/components/ui/Tap';
import { Text } from '@/components/ui/Text';
import { formatDistance } from '@/lib/places';
import { usePreferences } from '@/lib/preferences';
import { fillVetPhone, geocodePlace, searchVetsNear, type VetHit } from '@/lib/vets';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';

type Props = {
  onPick: (vet: VetHit) => void;
};

export function VetSearch({ onPick }: Props) {
  const t = useTheme();
  const { weightUnit } = usePreferences();
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<VetHit[]>([]);
  const [busy, setBusy] = useState<'near' | 'zip' | null>(null);
  const [picking, setPicking] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async (origin: { lat: number; lng: number }) => {
    const found = await searchVetsNear(origin.lat, origin.lng);
    setHits(found);
    if (!found.length) setError('No clinics showed up in that area. Try a city name or a different zip.');
  };

  const nearMe = async () => {
    setBusy('near');
    setError(null);
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (!perm.granted) {
        setError('Location is off. Type a zip or city instead.');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      await run({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    } catch {
      setError('Could not use this location. Type a zip instead.');
    } finally {
      setBusy(null);
    }
  };

  const byQuery = async () => {
    if (query.trim().length < 2) return;
    setBusy('zip');
    setError(null);
    try {
      const origin = await geocodePlace(query);
      if (!origin) {
        setError('Could not find that zip or city.');
        return;
      }
      await run(origin);
    } catch {
      setError('Search failed. Try again in a moment.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <View style={{ gap: space.sm }}>
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Field placeholder="Zip or city" value={query} onChangeText={setQuery} onSubmitEditing={byQuery} returnKeyType="search" autoCapitalize="characters" />
        </View>
        <Button label="Find" kind="secondary" onPress={byQuery} loading={busy === 'zip'} disabled={query.trim().length < 2} />
      </View>
      <Button label="Use my location" icon="location" kind="ghost" onPress={nearMe} loading={busy === 'near'} />
      {error ? (
        <Text variant="caption" tone="bad">
          {error}
        </Text>
      ) : null}
      {hits.map((v) => (
        <Tap
          key={`${v.name}-${v.lat}`}
          onPress={async () => {
            setPicking(`${v.name}-${v.lat}`);
            const filled = await fillVetPhone(v);
            setHits((list) => list.map((h) => (h.lat === v.lat && h.lng === v.lng && h.name === v.name ? filled : h)));
            onPick(filled);
            setPicking(null);
          }}
          haptic="selection"
          disabled={picking !== null}>
          <Surface kind="grouped" style={[styles.hit, { borderColor: t.border }]}>
            <View style={[styles.dot, { backgroundColor: t.info }]}>
              <Icon name="vet" size={14} color={t.onMeaning} />
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="bodyStrong">{v.name}</Text>
              <Text variant="caption" tone="secondary">
                {picking === `${v.name}-${v.lat}` && !v.phone
                  ? [v.address, 'Looking up the phone'].filter(Boolean).join(' · ')
                  : [v.address, formatDistance(v.km, weightUnit), v.phone].filter(Boolean).join(' · ')}
              </Text>
            </View>
          </Surface>
        </Tap>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: space.sm },
  hit: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.lg },
  dot: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
});
