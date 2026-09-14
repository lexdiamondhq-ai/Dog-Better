import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Linking, Platform, StyleSheet, Switch, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Field } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { Screen, ScreenHeader, Section } from '@/components/ui/Screen';
import { Surface } from '@/components/ui/Surface';
import { Text } from '@/components/ui/Text';
import { relativeTime } from '@/lib/activity';
import { useAuth } from '@/lib/auth';
import type { Place, PlacePulse } from '@/lib/database.types';
import { CROWD, GROUND, KIND_META, type PlaceKind } from '@/lib/places';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/theme/ThemeProvider';
import { space } from '@/theme/tokens';

export default function PlaceDetail() {
  const t = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [place, setPlace] = useState<Place | null>(null);
  const [pulses, setPulses] = useState<PlacePulse[]>([]);
  const [crowd, setCrowd] = useState<string>('light');
  const [ground, setGround] = useState<string>('dry');
  const [shade, setShade] = useState(false);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const load = useCallback(
    () =>
      fetchPlace(id).then((r) => {
        setPlace(r.place);
        setPulses(r.pulses);
      }),
    [id],
  );

  useEffect(() => {
    load();
  }, [load]);

  const send = async () => {
    if (!user || !place) return;
    setSaving(true);
    await supabase.from('place_pulses').insert({ place_id: place.id, user_id: user.id, crowd, ground, shade, note: note.trim() || null });
    setNote('');
    setDone(true);
    await load();
    setSaving(false);
  };

  const directions = () => {
    if (!place) return;
    const label = encodeURIComponent(place.name);
    const url = Platform.select({
      ios: `maps://?daddr=${place.lat},${place.lng}&q=${label}`,
      default: `geo:${place.lat},${place.lng}?q=${place.lat},${place.lng}(${label})`,
    });
    Linking.openURL(url).catch(() => Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}`));
  };

  const kind = (place?.kind ?? 'other') as PlaceKind;
  const latest = pulses[0];

  return (
    <Screen keyboardShouldPersistTaps="handled">
      <ScreenHeader eyebrow={KIND_META[kind].label} title={place?.name ?? 'Loading'} onBack={() => router.back()} large={false} />

      <Animated.View entering={FadeInUp.delay(40).springify().damping(18)}>
        <Surface kind="fur" style={{ gap: space.md }}>
          <View style={styles.row}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text variant="overline" tone="tertiary">
                Right now
              </Text>
              <Text variant="title">{latest ? crowdLabel(latest.crowd) : 'No pulse yet'}</Text>
              <Text variant="caption" tone="secondary">
                {latest ? `${groundLabel(latest.ground)}${latest.shade ? ', shade available' : ''} - ${relativeTime(latest.created_at)}` : 'Be the first to report conditions today.'}
              </Text>
            </View>
            <Icon name={latest ? (latest.crowd === 'packed' ? 'warning' : 'happy') : 'pin'} size={34} color={t.brand} />
          </View>
          <Button label="Directions" kind="secondary" icon="walk" onPress={directions} />
        </Surface>
      </Animated.View>

      <Section title="Send a pulse">
        <Animated.View entering={FadeInUp.delay(120)}>
          <Surface kind="raised" style={{ gap: space.lg }}>
            <View style={{ gap: space.sm }}>
              <Text variant="label" tone="secondary">
                How busy is it?
              </Text>
              <View style={styles.chips}>
                {CROWD.map((c) => (
                  <Chip key={c.id} label={c.label} selected={crowd === c.id} onPress={() => setCrowd(c.id)} tone={c.id === 'packed' ? 'bad' : c.id === 'busy' ? 'warn' : 'good'} />
                ))}
              </View>
            </View>
            <View style={{ gap: space.sm }}>
              <Text variant="label" tone="secondary">
                Ground
              </Text>
              <View style={styles.chips}>
                {GROUND.map((g) => (
                  <Chip key={g.id} label={g.label} selected={ground === g.id} onPress={() => setGround(g.id)} tone={g.id === 'muddy' || g.id === 'icy' ? 'warn' : 'neutral'} />
                ))}
              </View>
            </View>
            <View style={[styles.row, { justifyContent: 'space-between' }]}>
              <View style={styles.row}>
                <Icon name="sun" size={18} color={t.accentDeep} />
                <Text variant="bodyStrong">Shade available</Text>
              </View>
              <Switch value={shade} onValueChange={setShade} trackColor={{ true: t.brand }} />
            </View>
            <Field placeholder="Anything others should know? (optional)" value={note} onChangeText={setNote} maxLength={140} />
            <Button label={done ? 'Pulse sent, thank you' : 'Send pulse'} icon={done ? 'check' : 'send'} onPress={send} loading={saving} kind={done ? 'secondary' : 'primary'} />
          </Surface>
        </Animated.View>
      </Section>

      {pulses.length ? (
        <Section title="Recent pulses">
          <Surface kind="tonal" padding={0} style={{ overflow: 'hidden' }}>
            {pulses.map((p, i) => (
              <View key={p.id} style={[styles.pulse, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.border }]}>
                <View style={[styles.dot, { backgroundColor: { empty: t.good, light: t.good, busy: t.warn, packed: t.bad }[p.crowd] ?? t.brand }]} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text variant="bodyStrong">
                    {crowdLabel(p.crowd)}, {groundLabel(p.ground).toLowerCase()}
                    {p.shade ? ', shade' : ''}
                  </Text>
                  {p.note ? (
                    <Text variant="caption" tone="secondary">
                      {p.note}
                    </Text>
                  ) : null}
                </View>
                <Text variant="caption" tone="tertiary">
                  {relativeTime(p.created_at)}
                </Text>
              </View>
            ))}
          </Surface>
        </Section>
      ) : null}
    </Screen>
  );
}

async function fetchPlace(id: string) {
  const [{ data: place }, { data: pulses }] = await Promise.all([
    supabase.from('places').select('*').eq('id', id).single(),
    supabase.from('place_pulses').select('*').eq('place_id', id).order('created_at', { ascending: false }).limit(20),
  ]);
  return { place: place ?? null, pulses: pulses ?? [] };
}

function crowdLabel(id: string) {
  return CROWD.find((c) => c.id === id)?.label ?? id;
}
function groundLabel(id: string) {
  return GROUND.find((g) => g.id === id)?.label ?? id;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  pulse: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg },
  dot: { width: 10, height: 10, borderRadius: 5 },
});
