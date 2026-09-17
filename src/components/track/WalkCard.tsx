import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Polyline } from 'react-native-maps';

import { EarnBadge } from '@/components/points/EarnBadge';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Surface } from '@/components/ui/Surface';
import { Text } from '@/components/ui/Text';
import { relativeTime } from '@/lib/activity';
import type { Walk } from '@/lib/database.types';
import { humanizeError } from '@/lib/errors';
import { REWARDS } from '@/engine/rewards';
import { usePoints } from '@/lib/points';
import { usePreferences } from '@/lib/preferences';
import { takeWalkStart } from '@/lib/walkIntent';
import { fetchRecentWalks, formatDuration, pathMetres, saveWalk, useLiveWalk, useStepsToday } from '@/lib/walks';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';

type Props = { dogId: string; ownerId: string; dogName: string };

function distanceLabel(metres: number, unit: 'kg' | 'lb') {
  if (metres < 20) return 'steps';
  if (unit === 'lb') {
    const mi = metres / 1609.344;
    return mi < 0.1 ? `${Math.round(metres * 3.28084)} ft` : `${mi.toFixed(2)} mi`;
  }
  return metres < 1000 ? `${Math.round(metres)} m` : `${(metres / 1000).toFixed(2)} km`;
}

/**
 * Today's steps from the phone, a start/stop walk timer that counts live, and the last few walks.
 * When the device has no pedometer (simulators, some Androids) the card says so instead of showing zeros.
 */
export function WalkCard({ dogId, ownerId, dogName }: Props) {
  const t = useTheme();
  const { weightUnit } = usePreferences();
  const today = useStepsToday();
  const live = useLiveWalk();
  const { award } = usePoints();
  const [recent, setRecent] = useState<Walk[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [mapReady, setMapReady] = useState(false);

  const startLive = live.start;
  const begin = useCallback(
    async (placeName?: string) => {
      setError(null);
      try {
        await startLive({ placeName });
      } catch (e) {
        setError(humanizeError(e, 'Could not start the walk.'));
      }
    },
    [startLive],
  );

  const loadRecent = useCallback(() => fetchRecentWalks(dogId, 5).then(setRecent), [dogId]);
  useEffect(() => {
    loadRecent();
  }, [loadRecent]);

  useFocusEffect(
    useCallback(() => {
      const queued = takeWalkStart();
      if (queued) void begin(queued.placeName);
    }, [begin]),
  );

  useEffect(() => {
    if (!live.walk) return;
    const started = live.walk.startedAt instanceof Date ? live.walk.startedAt.getTime() : new Date(live.walk.startedAt).getTime();
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - started) / 1000)), 1000);
    return () => clearInterval(id);
  }, [live.walk]);

  // The map mounts a beat after the first fix so the card does not flash an empty tile.
  const hasFix = Boolean(live.walk?.here);
  useEffect(() => {
    if (!hasFix) return;
    const id = setTimeout(() => setMapReady(true), 350);
    return () => {
      clearTimeout(id);
      setMapReady(false);
    };
  }, [hasFix]);

  const finish = async () => {
    const w = live.stop();
    if (!w) return;
    setSaving(true);
    setError(null);
    try {
      const saved = await saveWalk({
        dogId,
        ownerId,
        startedAt: w.startedAt,
        endedAt: new Date(),
        steps: w.steps,
        notes: w.placeName ?? null,
      });
      await award({ kind: 'walk', key: `walk:${saved.id}`, dogId });
      await Promise.all([loadRecent(), today.reload()]);
    } catch (e) {
      setError(humanizeError(e, 'Could not save the walk.'));
    } finally {
      setSaving(false);
    }
  };

  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const ss = String(elapsed % 60).padStart(2, '0');

  return (
    <Surface kind="raised" style={{ gap: space.md }}>
      <View style={styles.head}>
        <View style={[styles.icon, { backgroundColor: t.furLight }]}>
          <Icon name="walk" size={22} color={t.brand} />
        </View>
        <View style={{ flex: 1 }}>
          {today.available === false ? (
            <>
              <Text variant="display">--</Text>
              <Text variant="caption" tone="secondary">
                Step counting is not available on this device.
              </Text>
            </>
          ) : (
            <>
              <Text variant="display">{today.steps == null ? '--' : today.steps.toLocaleString()}</Text>
              <Text variant="caption" tone="secondary">
                Dog Better walk with {dogName}. Your steps today.
              </Text>
            </>
          )}
        </View>
      </View>

      {live.walk ? (
        <View style={{ gap: space.sm }}>
          {live.walk.here && mapReady ? (
            <View style={[styles.mapWrap, { borderColor: t.border }]}>
              <MapView
                style={styles.map}
                initialRegion={{
                  latitude: live.walk.here.latitude,
                  longitude: live.walk.here.longitude,
                  latitudeDelta: 0.008,
                  longitudeDelta: 0.008,
                }}
                showsUserLocation
                followsUserLocation
                showsMyLocationButton={false}
                showsPointsOfInterests={false}
                scrollEnabled={false}
                pitchEnabled={false}
                rotateEnabled={false}
                zoomEnabled={false}
                pointerEvents="none">
                {live.walk.path.length > 1 ? (
                  <Polyline coordinates={live.walk.path} strokeColor={t.brand} strokeWidth={4} />
                ) : null}
              </MapView>
            </View>
          ) : (
            <View style={[styles.mapWrap, styles.mapHold, { borderColor: t.border, backgroundColor: t.surface }]}>
              <Text variant="caption" tone="secondary" align="center">
                {live.walk.locationDenied ? 'Location is off. Steps still count. Turn it on to see the path.' : 'Finding you on the map.'}
              </Text>
            </View>
          )}
          <View style={[styles.live, { backgroundColor: t.surface }]}>
            <View style={{ flex: 1 }}>
              <Text variant="overline" tone="tertiary">
                {live.walk.placeName ? live.walk.placeName : 'Walking'}
              </Text>
              <Text variant="title" style={{ fontVariant: ['tabular-nums'] }}>
                {mm}:{ss}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text variant="title" style={{ fontVariant: ['tabular-nums'] }}>
                {live.walk.steps.toLocaleString()}
              </Text>
              <Text variant="caption" tone="tertiary">
                {distanceLabel(pathMetres(live.walk.path), weightUnit)}
              </Text>
            </View>
          </View>
        </View>
      ) : null}

      {live.walk ? (
        <Button label={`Finish walk  +${REWARDS.walk.points}`} icon="check" onPress={finish} loading={saving} />
      ) : today.available === false ? null : (
        <View style={{ gap: space.sm }}>
          <Button label="Start a walk" icon="walk" kind="secondary" onPress={() => void begin()} />
          <EarnBadge points={REWARDS.walk.points} />
        </View>
      )}

      {error ? (
        <Text variant="caption" tone="bad">
          {error}
        </Text>
      ) : null}

      {recent.length ? (
        <View style={{ gap: space.xs }}>
          {recent.map((w) => (
            <View key={w.id} style={styles.row}>
              <Text variant="bodyStrong">{w.steps.toLocaleString()} steps</Text>
              <Text variant="caption" tone="secondary">
                {formatDuration(w.started_at, w.ended_at)}
                {w.notes ? ` · ${w.notes}` : ''} - {relativeTime(w.started_at)}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </Surface>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  icon: { width: 48, height: 48, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  live: { flexDirection: 'row', alignItems: 'center', padding: space.md, borderRadius: radius.sm, gap: space.md },
  mapWrap: { height: 196, borderRadius: radius.md, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth },
  map: { flex: 1 },
  mapHold: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.lg },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
