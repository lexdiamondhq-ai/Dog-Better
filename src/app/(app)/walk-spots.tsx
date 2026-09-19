import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import MapView, { Marker, type Region } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Glass } from '@/components/ui/Glass';
import { Icon, type IconName } from '@/components/ui/Icon';
import { Surface } from '@/components/ui/Surface';
import { Tap } from '@/components/ui/Tap';
import { Text } from '@/components/ui/Text';
import { useAuth } from '@/lib/auth';
import { humanizeError } from '@/lib/errors';
import { usePreferences } from '@/lib/preferences';
import { queueWalkStart } from '@/lib/walkIntent';
import {
  fetchNearbyDbPlaces,
  fetchOsmWalkSpots,
  formatDistance,
  haversineKm,
  KIND_META,
  syncPlaces,
  WALK_PLACE_KINDS,
  type PlaceKind,
} from '@/lib/places';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';

type Filter = 'all' | 'dog_park' | 'areas' | 'trail';
type Spot = { key: string; name: string; kind: PlaceKind; lat: number; lng: number; km: number };

const CACHE_KEY = 'dogbetter.walkspots.v2';
const FALLBACK: Region = { latitude: 43.6532, longitude: -79.3832, latitudeDelta: 0.06, longitudeDelta: 0.06 };
const CARD_H = 168;
const KIND_ICON: Record<PlaceKind, IconName> = { dog_park: 'park', trail: 'walk', patio: 'meal', beach: 'sun', other: 'park' };
const AREA_LABEL: Record<PlaceKind, string> = {
  dog_park: 'Dog park',
  trail: 'Trail',
  patio: 'Patio',
  beach: 'Beach',
  other: 'Dog area',
};

function isWalkKind(kind: PlaceKind) {
  return WALK_PLACE_KINDS.includes(kind);
}

function matchesFilter(kind: PlaceKind, filter: Filter) {
  if (filter === 'all') return isWalkKind(kind);
  if (filter === 'areas') return kind === 'other' || kind === 'beach';
  return kind === filter;
}

function toSpot(p: { osm_id?: number | null; name: string; kind: string; lat: number; lng: number }, here: { lat: number; lng: number }): Spot {
  return {
    key: p.osm_id != null ? `osm:${p.osm_id}` : `${p.name}:${p.lat}:${p.lng}`,
    name: p.name,
    kind: p.kind as PlaceKind,
    lat: p.lat,
    lng: p.lng,
    km: haversineKm(here.lat, here.lng, p.lat, p.lng),
  };
}

function mergeSpots(rows: { osm_id?: number | null; name: string; kind: string; lat: number; lng: number }[], here: { lat: number; lng: number }) {
  const byKey = new Map<string, Spot>();
  for (const p of rows) {
    if (!isWalkKind(p.kind as PlaceKind)) continue;
    const spot = toSpot(p, here);
    byKey.set(spot.key, spot);
  }
  return Array.from(byKey.values()).sort((a, b) => a.km - b.km);
}

async function hereNow(): Promise<{ lat: number; lng: number; rough: boolean }> {
  const perm = await Location.getForegroundPermissionsAsync();
  if (!perm.granted) {
    const asked = await Location.requestForegroundPermissionsAsync();
    if (!asked.granted) return { lat: FALLBACK.latitude, lng: FALLBACK.longitude, rough: true };
  }
  const last = await Location.getLastKnownPositionAsync();
  if (last) return { lat: last.coords.latitude, lng: last.coords.longitude, rough: false };
  try {
    const fresh = await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low }),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 2500)),
    ]);
    if (fresh) return { lat: fresh.coords.latitude, lng: fresh.coords.longitude, rough: false };
  } catch {
    /* last known already missed */
  }
  return { lat: FALLBACK.latitude, lng: FALLBACK.longitude, rough: true };
}

/**
 * Parks, areas, and trails on a live map. Tap a pin, then start the same walk Track already uses.
 */
export default function WalkSpots() {
  const t = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { weightUnit } = usePreferences();
  const mapRef = useRef<MapView>(null);
  const mapReady = useRef(false);
  const pendingRegion = useRef<Region | null>(null);

  const flyTo = (r: Region, duration = 500) => {
    if (mapReady.current) mapRef.current?.animateToRegion(r, duration);
    else pendingRegion.current = r;
  };

  const [filter, setFilter] = useState<Filter>('all');
  const [spots, setSpots] = useState<Spot[]>([]);
  const [me, setMe] = useState<{ lat: number; lng: number } | null>(null);
  const [region, setRegion] = useState<Region>(FALLBACK);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [moved, setMoved] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(
    async (lat: number, lng: number) => {
      setError(null);
      setLoading(true);
      try {
        const [osm, db] = await Promise.all([
          fetchOsmWalkSpots(lat, lng).catch(() => []),
          user ? fetchNearbyDbPlaces(lat, lng).catch(() => []) : Promise.resolve([]),
        ]);
        const here = { lat, lng };
        const list = mergeSpots([...db, ...osm], here);
        setSpots(list);
        if (list.length) {
          AsyncStorage.setItem(CACHE_KEY, JSON.stringify({ spots: list, at: Date.now() })).catch(() => {});
        }
        if (user && osm.length) void syncPlaces(osm, user.id).catch(() => {});
        if (!list.length) setError('No parks or trails in this area. Pan the map and search again.');
      } catch (e) {
        setError(humanizeError(e, 'Could not load parks and trails.'));
      } finally {
        setLoading(false);
        setMoved(false);
      }
    },
    [user],
  );

  useEffect(() => {
    (async () => {
      const cached = await AsyncStorage.getItem(CACHE_KEY);
      if (cached) {
        const snap = JSON.parse(cached) as { spots: Spot[]; at: number };
        if (snap.spots?.length && Date.now() - snap.at < 24 * 3600_000) setSpots(snap.spots);
      }
      const here = await hereNow();
      const next = { latitude: here.lat, longitude: here.lng, latitudeDelta: 0.045, longitudeDelta: 0.045 };
      setMe(here.rough ? null : { lat: here.lat, lng: here.lng });
      setRegion(next);
      flyTo(next);
      if (here.rough) setError('Location is off. Showing a default city so you can still browse.');
      await search(here.lat, here.lng);
    })();
  }, [search]);

  const visible = useMemo(() => {
    const origin = me ?? { lat: region.latitude, lng: region.longitude };
    return spots
      .filter((s) => matchesFilter(s.kind, filter))
      .map((s) => ({ ...s, km: haversineKm(origin.lat, origin.lng, s.lat, s.lng) }))
      .sort((a, b) => a.km - b.km);
  }, [spots, filter, me, region.latitude, region.longitude]);

  const picked = visible.find((s) => s.key === selected) ?? null;

  const focus = (spot: Spot) => {
    setSelected(spot.key);
    flyTo({ latitude: spot.lat, longitude: spot.lng, latitudeDelta: 0.018, longitudeDelta: 0.018 }, 400);
  };

  const startHere = (spot: Spot) => {
    setStarting(true);
    setError(null);
    try {
      queueWalkStart(spot.name);
      if (router.canGoBack()) router.back();
      router.navigate('/(app)/(tabs)/track');
    } catch (e) {
      setError(humanizeError(e, 'Could not open Track to start the walk.'));
      setStarting(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={FALLBACK}
        showsUserLocation
        showsMyLocationButton={false}
        showsPointsOfInterests={false}
        mapPadding={{ top: insets.top + 120, left: 0, right: 0, bottom: CARD_H + insets.bottom }}
        onMapReady={() => {
          mapReady.current = true;
          if (pendingRegion.current) {
            mapRef.current?.animateToRegion(pendingRegion.current, 500);
            pendingRegion.current = null;
          }
        }}
        onRegionChangeComplete={(r) => {
          setRegion(r);
          setMoved(true);
        }}>
        {visible.map((spot) => (
          <Marker
            key={spot.key}
            coordinate={{ latitude: spot.lat, longitude: spot.lng }}
            onPress={() => focus(spot)}
            tracksViewChanges={false}>
            <Pin kind={spot.kind} active={selected === spot.key} />
          </Marker>
        ))}
      </MapView>

      <View style={[styles.top, { paddingTop: insets.top + space.sm }]} pointerEvents="box-none">
        <Glass borderRadius={radius.lg} intensity={60} style={styles.topBar}>
          <View style={styles.topHead}>
            <Tap onPress={() => router.back()} haptic="selection" style={[styles.back, { backgroundColor: t.surface }]} accessibilityLabel="Back">
              <Icon name="back" size={18} />
            </Tap>
            <View style={{ gap: 2, flex: 1 }}>
              <Text variant="overline" tone="tertiary">
                Walk
              </Text>
              <Text variant="title">Parks and trails</Text>
            </View>
          </View>
          <View style={styles.filters}>
            <Chip label="All" selected={filter === 'all'} onPress={() => setFilter('all')} />
            <Chip label="Dog parks" icon="park" selected={filter === 'dog_park'} onPress={() => setFilter('dog_park')} />
            <Chip label="Areas" icon="sun" selected={filter === 'areas'} onPress={() => setFilter('areas')} />
            <Chip label="Trails" icon="walk" selected={filter === 'trail'} onPress={() => setFilter('trail')} />
          </View>
        </Glass>
        {moved && !loading ? (
          <Tap onPress={() => void search(region.latitude, region.longitude)} haptic="medium" style={{ alignSelf: 'flex-start' }}>
            <Glass borderRadius={radius.pill} style={styles.searchHere}>
              <Icon name="refresh" size={16} />
              <Text variant="label">Search this area</Text>
            </Glass>
          </Tap>
        ) : null}
        {loading ? (
          <Glass borderRadius={radius.pill} style={styles.searchHere}>
            <ActivityIndicator color={t.brand} />
            <Text variant="label">Finding spots</Text>
          </Glass>
        ) : null}
      </View>

      {me ? (
        <Tap
          onPress={() => flyTo({ latitude: me.lat, longitude: me.lng, latitudeDelta: 0.04, longitudeDelta: 0.04 }, 450)}
          haptic="selection"
          style={[styles.locate, { bottom: insets.bottom + CARD_H + space.md }]}
          accessibilityLabel="Center on me">
          <Glass borderRadius={22} style={styles.locateInner}>
            <Icon name="pin" size={20} color={t.brand} />
          </Glass>
        </Tap>
      ) : null}

      <View style={[styles.bottom, { paddingBottom: insets.bottom + space.md }]} pointerEvents="box-none">
        {error && !loading ? (
          <Glass borderRadius={radius.md} style={styles.notice}>
            <Text variant="caption" tone="secondary" style={{ flex: 1 }}>
              {error}
            </Text>
          </Glass>
        ) : null}
        <Surface kind="raised" style={styles.card}>
          {picked ? (
            <>
              <View style={styles.cardRow}>
                <View style={[styles.cardIcon, { backgroundColor: t.brand }]}>
                  <Icon name={KIND_ICON[picked.kind]} size={20} color={t.onBrand} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text variant="headline" numberOfLines={1}>
                    {picked.name}
                  </Text>
                  <Text variant="caption" tone="secondary" numberOfLines={1}>
                    {AREA_LABEL[picked.kind] ?? KIND_META[picked.kind].label} · {formatDistance(picked.km, weightUnit)}
                  </Text>
                </View>
              </View>
              <Button label="Start a walk" icon="walk" loading={starting} onPress={() => void startHere(picked)} />
              <Button label="How this area feels" icon="places" kind="ghost" onPress={() => router.push('/(app)/places')} />
            </>
          ) : (
            <Text variant="body" tone="secondary">
              {visible.length ? 'Tap a park or trail on the map, then start a walk.' : 'No spots on the map yet. Search this area or try All.'}
            </Text>
          )}
        </Surface>
      </View>
    </View>
  );
}

function Pin({ kind, active }: { kind: PlaceKind; active: boolean }) {
  const t = useTheme();
  return (
    <View style={styles.pinWrap}>
      <View style={[styles.pin, { backgroundColor: active ? t.brand : t.bgRaised, borderColor: t.brand, transform: [{ scale: active ? 1.15 : 1 }] }]}>
        <Icon name={KIND_ICON[kind]} size={16} color={active ? t.onBrand : t.brand} />
      </View>
      <View style={[styles.pinTail, { borderTopColor: active ? t.brand : t.bgRaised }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  top: { position: 'absolute', left: 0, right: 0, paddingHorizontal: space.lg, gap: space.sm },
  topBar: { padding: space.lg, gap: space.md },
  topHead: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  back: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  searchHere: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.lg, height: 44, alignSelf: 'flex-start' },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: space.lg, gap: space.sm },
  notice: { padding: space.md },
  card: { gap: space.md, minHeight: 88 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  cardIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  pinWrap: { alignItems: 'center' },
  pin: { width: 36, height: 36, borderRadius: 18, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  pinTail: { width: 0, height: 0, borderLeftWidth: 6, borderRightWidth: 6, borderTopWidth: 8, borderLeftColor: 'transparent', borderRightColor: 'transparent', marginTop: -2 },
  locate: { position: 'absolute', left: space.lg },
  locateInner: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});
