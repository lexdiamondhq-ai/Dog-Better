import { StyleSheet, View } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { Tap } from '@/components/ui/Tap';
import { Text } from '@/components/ui/Text';
import { courseDayLine, prettyTime, type MedCourse, type Reminder } from '@/lib/reminders';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';

type Props = {
  courses: MedCourse[];
  today: string;
  empty: string;
  onOpen?: (r: Reminder) => void;
  onGive?: (r: Reminder) => void;
};

export function MedCourses({ courses, today, empty, onOpen, onGive }: Props) {
  const t = useTheme();
  if (!courses.length) {
    return (
      <Text variant="body" tone="secondary">
        {empty}
      </Text>
    );
  }
  return (
    <View style={{ gap: space.sm }}>
      {courses.map((c) => {
        const clocks = c.times.map((time) => prettyTime(time)).join(' and ');
        const next = c.next;
        return (
          <Tap
            key={c.key}
            onPress={() => {
              if (next && onOpen) onOpen(next);
            }}
            haptic="selection"
            style={[styles.card, { backgroundColor: t.bgRaised, borderColor: t.border }]}>
            <View style={[styles.swatch, { backgroundColor: t.brand }]}>
              <Icon name="pill" size={16} color={t.onBrand} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text variant="bodyStrong">{c.title}</Text>
              <Text variant="caption" tone="secondary">
                {clocks ? `Give at ${clocks}` : 'Add a time'}
              </Text>
              <Text variant="caption" tone="secondary">
                {courseDayLine(c, today)}
              </Text>
              <Text variant="caption" tone="secondary">
                {c.remaining ? `${c.remaining} of ${c.total} doses left` : 'Course finished'}
              </Text>
            </View>
            {next && onGive ? (
              <Tap onPress={() => onGive(next)} haptic="medium" accessibilityLabel="Mark next dose given">
                <Icon name="check" size={18} color={t.brand} />
              </Tap>
            ) : null}
          </Tap>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth },
  swatch: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
});
