import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { Tap } from '@/components/ui/Tap';
import { Text } from '@/components/ui/Text';
import { useEntitlements } from '@/lib/entitlements';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';

/**
 * The only place an ad can render. Premium removes it entirely. It is never mounted on Emergency,
 * the detective result, or the vet summary; those screens simply do not include it.
 *
 * Until AdMob is configured (needs the app ID in app.json and a native build), this renders a
 * clearly labelled house placeholder that promotes Premium, so layout and gating can be tuned now.
 */
export function AdSlot({ placement, size = 'banner' }: { placement: 'today' | 'track' | 'learn' | 'community' | 'track-mid' | 'track-end'; size?: 'banner' | 'card' }) {
  const t = useTheme();
  const router = useRouter();
  const { isPremium, loaded } = useEntitlements();
  if (!loaded || isPremium) return null;

  return (
    <Tap onPress={() => router.push({ pathname: '/paywall', params: { from: placement } })} haptic="selection" accessibilityLabel="Sponsored. Go ad-free with Premium">
      <View style={[size === 'card' ? styles.card : styles.slot, { backgroundColor: t.surface, borderColor: t.border }]}>
        <Text variant="micro" tone="tertiary" style={styles.tag}>
          SPONSORED
        </Text>
        <Icon name="sparkle" size={18} color={t.accentDeep} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="label">{placement === 'community' ? 'A walker two streets over' : 'Go ad-free with Premium'}</Text>
          <Text variant="caption" tone="secondary">
            {placement === 'community'
              ? 'Local walkers, grooms, and daycares. Premium drops these.'
              : size === 'card'
                ? 'This slot is reserved for a partner. Premium removes every ad.'
                : '7 days free, then $39.99 a year.'}
          </Text>
        </View>
        <Icon name="chevron" size={14} color={t.textTertiary} />
      </View>
    </Tap>
  );
}

const styles = StyleSheet.create({
  slot: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, borderRadius: radius.sm, borderWidth: StyleSheet.hairlineWidth, minHeight: 56 },
  card: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg, borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, minHeight: 96 },
  tag: { position: 'absolute', top: 4, right: space.sm, letterSpacing: 0.6 },
});
