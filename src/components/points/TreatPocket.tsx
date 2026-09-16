import { StyleSheet, View } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { Tap } from '@/components/ui/Tap';
import { Text } from '@/components/ui/Text';
import { JAR_POCKET } from '@/engine/rewards';
import { useBetterLevel, usePoints } from '@/lib/points';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';

function pocketLine(filled: number) {
  if (filled <= 0) return 'Jar is empty';
  if (filled >= JAR_POCKET) return 'Jar is full';
  return `${filled} in the jar today`;
}

/** Daily biscuit pocket. Lifetime totals live on the points screen. */
export function TreatPocket({ onPress }: { onPress: () => void }) {
  const t = useTheme();
  const { pocket } = usePoints();
  const level = useBetterLevel();

  return (
    <Tap onPress={onPress} haptic="selection" style={[styles.jar, { backgroundColor: t.bgRaised, borderColor: t.border }]} accessibilityLabel={`${pocketLine(pocket)}. ${level.name}`}>
      <Icon name="paw" size={18} color={t.accentDeep} />
      <View style={styles.copy}>
        <Text variant="bodyStrong">{pocketLine(pocket)}</Text>
        <View style={styles.slots}>
          {Array.from({ length: JAR_POCKET }, (_, i) => (
            <View
              key={i}
              style={[
                styles.biscuit,
                i < pocket
                  ? { backgroundColor: t.accent, borderColor: t.accentDeep }
                  : { backgroundColor: 'transparent', borderColor: t.border },
              ]}
            />
          ))}
        </View>
        <Text variant="caption" tone="secondary">
          {level.name}
        </Text>
      </View>
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
