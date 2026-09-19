import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, useWindowDimensions, View } from 'react-native';
import MapView, { Marker, type Region } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Chip } from '@/components/ui/Chip';
import { Glass } from '@/components/ui/Glass';
import { Icon, type IconName } from '@/components/ui/Icon';
import { Surface } from '@/components/ui/Surface';
import { Tap } from '@/components/ui/Tap';
import { Text } from '@/components/ui/Text';
import { useAuth } from '@/lib/auth';
import { usePreferences } from '@/lib/preferences';
import type { Place } from '@/lib/database.types';
import { humanizeError } from '@/lib/errors';
import { fetchNearbyDbPlaces, fetchOsmPlaces, fetchPulseSummaries, formatDistance, haversineKm, KIND_META, syncPlaces, type PlaceKind, type PulseSummary } from '@/lib/places';
import { relativeTime } from '@/lib/activity';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';

const FALLBACK: Region = { latitude: 43.6532, longitude: -79.3832, latitudeDelta: 0.06, longitudeDelta: 0.06 };
const CARD_STRIP_H = 120;
const KIND_ICON: Record<PlaceKind, IconName> = { dog_park: 'park', trail: 'walk', patio: 'meal', beach: 'sun', other: 'park' };
const FILTERS: (PlaceKind | 'all')[] = ['all', 'dog_park', 'trail', 'patio'];

export default function Places() {
  const t = useTheme();
  const { width: windowW } = useWindowDimensions();
  const cardW = Math.min(300, windowW - space.xl * 2);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { weightUnit } = usePreferences();
  const mapRef = useRef<MapView>(null);
  const listRef = useRef<FlatList<Place & { km: number }>>(null);
  // animateToRegion is a no-op until the native map has loaded, and the location fix often wins that race.
  const mapReady = useRef(false);
  const pendingRegion = useRef<Region | null>(null);
  const flyTo = (r: Region, duration = 600) => {
    if (mapReady.current) mapRef.current?.animateToRegion(r, duration);
    else pendingRegion.current = r;
  };

  const [region, setRegion] = useState<Region>(FALLBACK);
  const [me, setMe] = useState<{ lat: number; lng: number } | null>(null);
  const [places, setPlaces] = useState<Place[]>([]);
  const [pulses, setPulses] = useState<Record<string, PulseSummary>>({});
  const [filter, setFilter] = useState<PlaceKind | 'all'>('all');
  const [loading, setLoading] = useState(true);
  const [moved, setMoved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  const search = useCallback(
    async (lat: number, lng: number) => {
      if (!user) return;
      setLoading(true);
      setError(null);
      let osmFailed = false;
      try {
        const [osm, db] = await Promise.all([
          fetchOsmPlaces(lat, lng).catch(() => {
            osmFailed = true;
            return [];
          }),
          fetchNearbyDbPlaces(lat, lng),
        ]);
        const synced = osm.length ? await syncPlaces(osm, user.id) : [];
        const byId = new Map<string, Place>();
        for (const p of [...db, ...synced]) byId.set(p.id, p);
        const list = Array.from(byId.values());
        setPlaces(list);
        setPulses(await fetchPulseSummaries(list.map((p) => p.id)));
        if (osmFailed) setError('OpenStreetMap is busy right now. Showing saved spots; tap "Search this area" to retry.');
        else if (list.length === 0) {
          setError(
            weightUnit === 'lb'
              ? 'No mapped dog spots within 3 miles. Long-press the map to add one.'
              : 'No mapped dog spots within 5 km. Long-press the map to add one.',
          );
        }
      } catch (e) {
        setError(humanizeError(e, 'Could not load places.'));
      } finally {
        setLoading(false);
        // Leave the retry button up after a failed fetch.
        setMoved(osmFailed);
      }
    },
    [user, weightUnit],
  );

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Location is off, showing a default area. Enable it in Settings for spots near you.');
        search(FALLBACK.latitude, FALLBACK.longitude);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const next = { latitude: loc.coords.latitude, longitude: loc.coords.longitude, latitudeDelta: 0.05, longitudeDelta: 0.05 };
      setMe({ lat: next.latitude, lng: next.longitude });
      setRegion(next);
      flyTo(next);
      search(next.latitude, next.longitude);
    })();
  }, [search]);

  const visible = useMemo(() => {
    const origin = me ?? { lat: region.latitude, lng: region.longitude };
    return places
      .filter((p) => filter === 'all' || p.kind === filter)
      .map((p) => ({ ...p, km: haversineKm(origin.lat, origin.lng, p.lat, p.lng) }))
      .sort((a, b) => a.km - b.km)
      .slice(0, 40);
  }, [places, filter, me, region]);

  const focus = (p: Place, index?: number) => {
    setSelected(p.id);
    flyTo({ latitude: p.lat, longitude: p.lng, latitudeDelta: 0.02, longitudeDelta: 0.02 }, 450);
    if (index != null) listRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.5 });
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
        // Keeps the Apple Maps attribution above the card strip.
        mapPadding={{ top: 0, left: 0, right: 0, bottom: CARD_STRIP_H + insets.bottom }}
        onMapReady={() => {
          mapReady.current = true;
          if (pendingRegion.current) {
            mapRef.current?.animateToRegion(pendingRegion.current, 600);
            pendingRegion.current = null;
          }
        }}
        onRegionChangeComplete={(r) => {
          setRegion(r);
          setMoved(true);
        }}
        onLongPress={(e) => {
          const { latitude, longitude } = e.nativeEvent.coordinate;
          router.push({ pathname: '/(app)/place/new', params: { lat: String(latitude), lng: String(longitude) } });
        }}>
        {visible.map((p) => (
          <Marker key={p.id} coordinate={{ latitude: p.lat, longitude: p.lng }} onPress={() => focus(p, visible.findIndex((v) => v.id === p.id))} tracksViewChanges={false}>
            <Pin kind={p.kind as PlaceKind} active={selected === p.id} pulse={pulses[p.id]} />
          </Marker>
        ))}
      </MapView>

      {/* No layout animations on these wrappers: Liquid Glass stops rendering while an ancestor animates opacity or transform. */}
      <View style={[styles.top, { paddingTop: insets.top + space.sm }]} pointerEvents="box-none">
        <Glass borderRadius={radius.lg} intensity={60} style={styles.topBar}>
          <View style={styles.topHead}>
            <Tap onPress={() => router.back()} haptic="selection" style={[styles.back, { backgroundColor: t.surface }]} accessibilityLabel="Back">
              <Icon name="back" size={18} />
            </Tap>
            <View style={{ gap: 2, flex: 1 }}>
              <Text variant="overline" tone="tertiary">
                Dog Better map
              </Text>
              <Text variant="title">Safe spaces near you</Text>
            </View>
          </View>
          <View style={styles.filters}>
            {FILTERS.map((f) => (
              <Chip key={f} label={f === 'all' ? 'All' : KIND_META[f].plural} selected={filter === f} onPress={() => setFilter(f)} />
            ))}
          </View>
        </Glass>

        {moved && !loading ? (
          <View style={{ alignSelf: 'flex-start' }}>
            <Tap onPress={() => search(region.latitude, region.longitude)} haptic="medium">
              <Glass borderRadius={radius.pill} style={styles.searchHere}>
                <Icon name="refresh" size={16} />
                <Text variant="label">Search this area</Text>
              </Glass>
            </Tap>
          </View>
        ) : null}
        {loading ? (
          <View style={{ alignSelf: 'flex-start' }}>
            <Glass borderRadius={radius.pill} style={styles.searchHere}>
              <ActivityIndicator color={t.brand} />
              <Text variant="label">Finding dog spots</Text>
            </Glass>
          </View>
        ) : null}
      </View>

      <View style={[styles.bottom, { paddingBottom: insets.bottom + space.md }]} pointerEvents="box-none">
        {error && !loading ? (
          <View style={{ paddingHorizontal: space.lg }}>
            <Glass borderRadius={radius.md} style={styles.notice}>
              <Icon name="info" size={16} color={t.textSecondary} />
              <Text variant="caption" tone="secondary" style={{ flex: 1 }}>
                {error}
              </Text>
            </Glass>
          </View>
        ) : null}
        <FlatList
          ref={listRef}
          horizontal
          data={visible as (Place & { km: number })[]}
          keyExtractor={(p) => p.id}
          showsHorizontalScrollIndicator={false}
          snapToInterval={cardW + space.sm}
          decelerationRate="fast"
          contentContainerStyle={{ paddingHorizontal: space.lg, gap: space.sm }}
          getItemLayout={(_, i) => ({ length: cardW + space.sm, offset: (cardW + space.sm) * i, index: i })}
          onMomentumScrollEnd={(e) => {
            const i = Math.round(e.nativeEvent.contentOffset.x / (cardW + space.sm));
            const p = visible[i];
            if (p) focus(p);
          }}
          renderItem={({ item }) => (
            <PlaceCard width={cardW} place={item} km={item.km} pulse={pulses[item.id]} active={selected === item.id} onPress={() => router.push({ pathname: '/(app)/place/[id]', params: { id: item.id } })} />
          )}
        />
      </View>

      {me ? (
        <Tap
          onPress={() => flyTo({ latitude: me.lat, longitude: me.lng, latitudeDelta: 0.04, longitudeDelta: 0.04 }, 500)}
          haptic="selection"
          style={[styles.locate, { bottom: insets.bottom + 190 }]}
          accessibilityLabel="Center on me">
          <Glass borderRadius={22} style={styles.locateInner}>
            <Icon name="pin" size={20} color={t.brand} />
          </Glass>
        </Tap>
      ) : null}
    </View>
  );
}

function Pin({ kind, active, pulse }: { kind: PlaceKind; active: boolean; pulse?: PulseSummary }) {
  const t = useTheme();
  // Only colour the pin when at least two people agree or the report is fresh; one stale report stays neutral.
  const crowdColor = pulse && pulse.confidence !== 'low' ? { empty: t.good, light: t.good, busy: t.warn, packed: t.bad }[pulse.crowd] : null;
  return (
    <View style={styles.pinWrap}>
      <View style={[styles.pin, { backgroundColor: active ? t.brand : t.bgRaised, borderColor: t.brand, transform: [{ scale: active ? 1.15 : 1 }] }]}>
        <Icon name={KIND_ICON[kind]} size={16} color={active ? t.onBrand : t.brand} />
        {crowdColor ? <View style={[styles.pinBadge, { backgroundColor: crowdColor, borderColor: t.bgRaised }]} /> : null}
      </View>
      <View style={[styles.pinTail, { borderTopColor: active ? t.brand : t.bgRaised }]} />
    </View>
  );
}

function PlaceCard({ width, place, km, pulse, active, onPress }: { width: number; place: Place; km: number; pulse?: PulseSummary; active: boolean; onPress: () => void }) {
  const t = useTheme();
  const { weightUnit } = usePreferences();
  const kind = place.kind as PlaceKind;
  return (
    <Tap onPress={onPress} haptic="medium" style={{ width }}>
      {/* Solid, not glass: Liquid Glass does not render inside a horizontal list, and text over a map needs the contrast anyway. */}
      <Surface kind="raised" style={[styles.card, { borderWidth: 1.5, borderColor: active ? t.brand : 'transparent' }]}>
        <View style={styles.cardRow}>
          <View style={[styles.cardIcon, { backgroundColor: t.brand }]}>
            <Icon name={KIND_ICON[kind]} size={20} color={t.onBrand} />
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="headline" numberOfLines={1}>
              {place.name}
            </Text>
            <Text variant="caption" tone="secondary">
              {KIND_META[kind].label} - {formatDistance(km, weightUnit)}
            </Text>
          </View>
          <Icon name="chevron" size={16} color={t.textTertiary} />
        </View>
        <View style={styles.pulseRow}>
          {pulse ? (
            <>
              <Tag label={{ empty: 'Empty', light: 'A few dogs', busy: 'Busy', packed: 'Packed' }[pulse.crowd] ?? pulse.crowd} tone={pulse.crowd === 'packed' ? 'bad' : pulse.crowd === 'busy' ? 'warn' : 'good'} />
              <Tag label={pulse.ground[0].toUpperCase() + pulse.ground.slice(1)} tone={pulse.ground === 'muddy' || pulse.ground === 'icy' ? 'warn' : 'neutral'} />
              {pulse.shade ? <Tag label="Shade" tone="neutral" /> : null}
              <Text variant="caption" tone="tertiary" style={{ marginLeft: 'auto' }} numberOfLines={1}>
                {pulse.count} {pulse.count === 1 ? 'report' : 'reports'} - {relativeTime(pulse.at)}
                {pulse.confidence === 'low' ? ' - unverified' : ''}
              </Text>
            </>
          ) : (
            <Text variant="caption" tone="tertiary">
              No reports in the last 12 hours.
            </Text>
          )}
        </View>
      </Surface>
    </Tap>
  );
}

function Tag({ label, tone }: { label: string; tone: 'neutral' | 'good' | 'warn' | 'bad' }) {
  const t = useTheme();
  const bg = { neutral: t.surfaceStrong, good: t.good, warn: t.warn, bad: t.bad }[tone];
  const fg = tone === 'neutral' ? t.text : '#FFFDF8';
  return (
    <View style={[styles.tag, { backgroundColor: bg }]}>
      <Text variant="caption" style={{ color: fg }}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  // The rail floats at mid-height, so the header can use the full width and keep the filters on one row.
  top: { position: 'absolute', left: 0, right: 0, paddingHorizontal: space.lg, gap: space.sm },
  topBar: { padding: space.lg, gap: space.md },
  topHead: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  back: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  searchHere: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.lg, height: 44 },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, gap: space.sm },
  notice: { flexDirection: 'row', alignItems: 'center', gap: space.sm, padding: space.md },
  card: { gap: space.md },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  cardIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  pulseRow: { flexDirection: 'row', alignItems: 'center', gap: space.xs, flexWrap: 'wrap' },
  tag: { paddingHorizontal: space.sm + 2, height: 24, borderRadius: 12, justifyContent: 'center' },
  pinWrap: { alignItems: 'center' },
  pin: { width: 36, height: 36, borderRadius: 18, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  pinBadge: { position: 'absolute', top: -3, right: -3, width: 12, height: 12, borderRadius: 6, borderWidth: 2 },
  pinTail: { width: 0, height: 0, borderLeftWidth: 6, borderRightWidth: 6, borderTopWidth: 8, borderLeftColor: 'transparent', borderRightColor: 'transparent', marginTop: -2 },
  locate: { position: 'absolute', left: space.lg },
  locateInner: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});
