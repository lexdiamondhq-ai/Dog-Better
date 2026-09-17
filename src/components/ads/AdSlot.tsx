import { useRouter } from 'expo-router';
import { Linking, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { IconWell } from '@/components/ui/IconWell';
import { Tap } from '@/components/ui/Tap';
import { Text } from '@/components/ui/Text';
import { pickAdSpot, type AdPlacement } from '@/content/adSpots';
import type { Tip } from '@/engine/guidance';
import { track } from '@/lib/analytics';
import { useEntitlements } from '@/lib/entitlements';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';

/**
 * The only place a partner slot can render. Premium removes it. Emergency, triage, and the
 * vet summary never mount this. Real AdMob needs an app ID, a native build, and Expo Go
 * cannot show those units, so this is the live inventory: affiliate shop, insurance, and
 * local walker / groom / patio listings with a disclosure on every card.
 */
export function AdSlot({
  placement,
  size = 'banner',
  topic,
}: {
  placement: AdPlacement | 'today' | 'track-mid';
  size?: 'banner' | 'card';
  topic?: Tip['topic'];
}) {
  const t = useTheme();
  const router = useRouter();
  const { isPremium, loaded } = useEntitlements();
  if (!loaded || isPremium) return null;

  const key = placement === 'today' || placement === 'track-mid' ? 'track' : placement;
  const spot = pickAdSpot(key, topic);

  const open = () => {
    void track('shop_click', { placement, spot: spot.id });
    if (spot.open.kind === 'shop') router.push('/(app)/shop');
    else void Linking.openURL(spot.open.url);
  };

  return (
    <View style={[size === 'card' ? styles.card : styles.slot, { backgroundColor: t.bgRaised, borderColor: t.border }]}>
      <Text variant="micro" tone="tertiary" style={styles.tag}>
        PARTNER
      </Text>
      <Tap onPress={open} haptic="selection" style={styles.main} accessibilityLabel={`${spot.title}. Partner listing`}>
        <IconWell name={spot.icon} tone="accent" />
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <Text variant="label" numberOfLines={1}>
            {spot.title}
          </Text>
          <Text variant="caption" tone="secondary" numberOfLines={2}>
            {spot.line}
          </Text>
        </View>
        <Icon name="chevron" size={14} color={t.textTertiary} />
      </Tap>
      <View style={styles.foot}>
        <Text variant="micro" tone="tertiary" style={{ flex: 1 }} numberOfLines={2}>
          {spot.disclosure}
        </Text>
        <Tap onPress={() => router.push({ pathname: '/paywall', params: { from: placement } })} haptic="selection" accessibilityLabel="Go ad-free with Premium">
          <Text variant="micro" tone="brand">
            Ad-free
          </Text>
        </Tap>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  slot: { borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth, paddingTop: space.sm, paddingBottom: space.sm, paddingHorizontal: space.md, gap: space.xs },
  card: { borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, paddingTop: space.md, paddingBottom: space.md, paddingHorizontal: space.lg, gap: space.sm },
  tag: { letterSpacing: 0.7, alignSelf: 'flex-end' },
  main: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  foot: { flexDirection: 'row', alignItems: 'center', gap: space.md },
});
