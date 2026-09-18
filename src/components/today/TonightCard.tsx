import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { EarnBadge } from '@/components/points/EarnBadge';
import { Icon } from '@/components/ui/Icon';
import { Tap } from '@/components/ui/Tap';
import { Text } from '@/components/ui/Text';
import { REWARDS } from '@/engine/rewards';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';

export function TonightCard({ done }: { done: boolean }) {
  const t = useTheme();
  const router = useRouter();

  return (
    <Tap
      onPress={() => router.push('/(app)/(tabs)/learn')}
      haptic="medium"
      style={[styles.card, { backgroundColor: t.bgRaised, borderColor: done ? t.good : t.border }]}
      accessibilityLabel={done ? 'Pack game is done. Open Learn.' : 'Open Learn and flip the pack'}>
      <Icon name="learn" size={18} color={done ? t.good : t.brand} />
      <View style={{ flex: 1 }}>
        <Text variant="overline" tone={done ? 'good' : 'tertiary'}>
          {done ? 'Pack · done' : 'Play · 5 cards'}
        </Text>
        <Text variant="bodyStrong" numberOfLines={1}>
          Flip the pack
        </Text>
      </View>
      {done ? <Icon name="check" size={16} color={t.good} /> : <EarnBadge points={REWARDS.tip.points} />}
    </Tap>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
  },
});
