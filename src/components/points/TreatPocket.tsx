import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { Tap } from '@/components/ui/Tap';
import { Text } from '@/components/ui/Text';
import { pickJarNext } from '@/engine/jarNext';
import { JAR_POCKET } from '@/engine/rewards';
import { usePoints } from '@/lib/points';
import { queueWalkStart } from '@/lib/walkIntent';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';

type MealKind = 'breakfast' | 'dinner' | 'treat';

/** Daily biscuit pocket. Tap starts the next fill, not the lifetime tally. */
export function TreatPocket({
  mealKinds,
  walksToday,
  hasWeight,
  onMeal,
  slots,
}: {
  mealKinds: Iterable<string>;
  walksToday: number;
  hasWeight: boolean;
  onMeal?: (kind: MealKind) => void;
  /** When set, each biscuit follows a Today tab instead of the raw point count. */
  slots?: boolean[];
}) {
  const t = useTheme();
  const router = useRouter();
  const { pocket, todayCounts } = usePoints();
  const filled = slots ?? Array.from({ length: JAR_POCKET }, (_, i) => i < pocket);
  const held = Math.min(JAR_POCKET, filled.filter(Boolean).length);
  const next = pickJarNext({ pocket: held, mealKinds, walksToday, counts: todayCounts, hasWeight });

  const go = () => {
    if (next.meal && onMeal) {
      onMeal(next.meal);
      return;
    }
    if (next.startWalk) queueWalkStart();
    router.push(next.href);
  };

  return (
    <Tap onPress={go} haptic="medium" style={[styles.jar, { backgroundColor: t.bgRaised, borderColor: t.border }]} accessibilityRole="button" accessibilityLabel={`${next.title}. ${next.hint}`}>
      <Icon name={next.icon} size={18} color={t.accentDeep} />
      <View style={styles.copy}>
        <Text variant="bodyStrong">{next.title}</Text>
        <View style={styles.slots}>
          {Array.from({ length: JAR_POCKET }, (_, i) => (
            <View
              key={i}
              style={[
                styles.biscuit,
                filled[i]
                  ? { backgroundColor: t.accent, borderColor: t.accentDeep }
                  : { backgroundColor: 'transparent', borderColor: t.border },
              ]}
            />
          ))}
        </View>
        <Text variant="caption" tone="secondary">
          {next.hint}
        </Text>
      </View>
      <Icon name="chevron" size={14} color={t.textTertiary} />
    </Tap>
  );
}

const styles = StyleSheet.create({
  jar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  copy: { flex: 1, gap: 6 },
  slots: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  biscuit: {
    width: 16,
    height: 11,
    borderRadius: 8,
    borderWidth: 1.5,
    transform: [{ rotate: '-18deg' }],
  },
});
