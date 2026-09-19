import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { Tap } from './Tap';
import { Text } from './Text';
import { prettyDate, ymd } from '@/lib/reminders';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';

type Props = {
  label: string;
  value: string;
  onChange: (next: string) => void;
  hint?: string;
  error?: string;
  placeholder?: string;
  maximumDate?: Date;
  minimumDate?: Date;
};

function parse(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return new Date();
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Date as a tappable row that opens the system wheel. No typing YYYY-MM-DD. */
export function DateField({ label, value, onChange, hint, error, placeholder = 'Choose a date', maximumDate, minimumDate }: Props) {
  const t = useTheme();
  const [open, setOpen] = useState(false);
  const today = ymd(new Date());
  const shown = value ? prettyDate(value, today) : placeholder;
  const borderColor = error ? t.bad : open ? t.brand : t.border;

  const apply = (event: DateTimePickerEvent, next?: Date) => {
    if (Platform.OS === 'android') setOpen(false);
    if (event.type === 'dismissed' || !next) return;
    onChange(ymd(next));
  };

  return (
    <View style={styles.wrap}>
      <Text variant="label" tone="secondary">
        {label}
      </Text>
      <View style={styles.row}>
        <Tap
          onPress={() => setOpen((v) => !v)}
          haptic="selection"
          accessibilityRole="button"
          accessibilityLabel={`${label}, ${shown}. Double tap to change.`}
          style={[styles.box, { backgroundColor: t.bgRaised, borderColor, flex: 1 }]}>
          <Text variant="headline" tone={value ? 'primary' : 'tertiary'}>
            {shown}
          </Text>
        </Tap>
        {value ? (
          <Tap
            onPress={() => onChange('')}
            haptic="selection"
            accessibilityLabel={`Clear ${label}`}
            style={[styles.clear, { backgroundColor: t.surface }]}>
            <Text variant="label" tone="secondary">
              Clear
            </Text>
          </Tap>
        ) : null}
      </View>
      {open ? (
        <DateTimePicker
          value={parse(value)}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          accentColor={t.brand}
          themeVariant={t.scheme === 'dark' ? 'dark' : 'light'}
          maximumDate={maximumDate}
          minimumDate={minimumDate}
          onChange={apply}
        />
      ) : null}
      {error ? (
        <Text variant="caption" tone="bad">
          {error}
        </Text>
      ) : hint ? (
        <Text variant="caption" tone="secondary">
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.xs + 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  box: {
    minHeight: 54,
    borderWidth: 1.5,
    borderRadius: radius.md,
    paddingHorizontal: space.lg,
    justifyContent: 'center',
  },
  clear: { height: 44, paddingHorizontal: space.md, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
});
