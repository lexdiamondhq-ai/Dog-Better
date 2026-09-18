import { useRouter, type Href } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import type { FilmFrame } from '@/engine/dayFilm';
import { Icon } from '@/components/ui/Icon';
import { Tap } from '@/components/ui/Tap';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';

export function DayFilm({
  frames,
  onMeal,
}: {
  frames: FilmFrame[];
  onMeal?: (kind: 'breakfast' | 'dinner') => void;
}) {
  const t = useTheme();
  const router = useRouter();

  return (
    <View style={styles.row}>
      {frames.map((f) => {
        const ring = { empty: t.border, good: t.good, warn: t.warn, bad: t.bad }[f.tone];
        const ink = { empty: t.textTertiary, good: t.goodDeep, warn: t.warnDeep, bad: t.badDeep }[f.tone];
        return (
          <Tap
            key={f.id}
            onPress={() => {
              if ((f.id === 'breakfast' || f.id === 'dinner') && onMeal) {
                onMeal(f.id);
                return;
              }
              router.push(f.href as Href);
            }}
            haptic="selection"
            style={[styles.frame, { backgroundColor: t.bgRaised, borderColor: ring }]}
            accessibilityLabel={`${f.label}, ${f.detail}`}>
            <Icon name={f.icon} size={16} color={ink} />
            <Text variant="micro" numberOfLines={1} style={{ color: ink }}>
              {f.label}
            </Text>
            <Text variant="micro" tone="tertiary" numberOfLines={1}>
              {f.detail}
            </Text>
          </Tap>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: space.xs },
  frame: {
    flex: 1,
    minWidth: 0,
    minHeight: 76,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: space.sm,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 2,
  },
});
