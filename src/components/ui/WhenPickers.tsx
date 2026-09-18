import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { Tap } from './Tap';
import { Text } from './Text';
import { clockNow, prettyDate, prettyTime, ymd } from '@/lib/reminders';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';

type Wheel = 'date' | 'time';

function combine(date: string, time: string) {
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  return new Date(y, (m || 1) - 1, d || 1, Number.isFinite(hh) ? hh : 8, Number.isFinite(mm) ? mm : 0);
}

type Props = {
  date: string;
  time: string;
  today: string;
  onDate: (date: string) => void;
  onTime: (time: string) => void;
};

/**
 * Date and time as two matching rows that open the system wheels. No typing 08:00.
 */
export function WhenPickers({ date, time, today, onDate, onTime }: Props) {
  const t = useTheme();
  const [wheel, setWheel] = useState<Wheel | null>(null);
  const value = combine(date, time);

  const apply = (event: DateTimePickerEvent, next?: Date) => {
    if (Platform.OS === 'android') setWheel(null);
    if (event.type === 'dismissed' || !next) return;
    if (wheel === 'date') onDate(ymd(next));
    else if (wheel === 'time') onTime(clockNow(next));
  };

  const row = (which: Wheel, label: string, shown: string) => {
    const on = wheel === which;
    return (
      <Tap
        onPress={() => setWheel(on ? null : which)}
        haptic="selection"
        style={[styles.row, { backgroundColor: on ? t.surface : t.bgRaised, borderColor: on ? t.brand : t.border }]}
        accessibilityRole="button"
        accessibilityLabel={`${label}, ${shown}. Double tap to change.`}>
        <Text variant="caption" tone="tertiary">
          {label}
        </Text>
        <Text variant="headline">{shown}</Text>
      </Tap>
    );
  };

  return (
    <View style={{ gap: space.sm }}>
      <View style={styles.pair}>
        {row('date', 'Date', prettyDate(date, today))}
        {row('time', 'Time', prettyTime(time))}
      </View>
      {wheel ? (
        <DateTimePicker
          value={value}
          mode={wheel}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          minuteInterval={wheel === 'time' ? 5 : undefined}
          accentColor={t.brand}
          themeVariant={t.scheme === 'dark' ? 'dark' : 'light'}
          onChange={apply}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  pair: { flexDirection: 'row', gap: space.sm },
  row: { flex: 1, gap: 2, paddingHorizontal: space.md, paddingVertical: space.md, borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth },
});
