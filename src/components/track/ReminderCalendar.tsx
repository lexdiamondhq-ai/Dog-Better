import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Field } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { Surface } from '@/components/ui/Surface';
import { Tap } from '@/components/ui/Tap';
import { Text } from '@/components/ui/Text';
import { kindMeta, monthDays, reminderColor, REMINDER_KINDS, useReminders, type ReminderKind } from '@/lib/reminders';
import { useTheme } from '@/theme/ThemeProvider';
import { palette, radius, space } from '@/theme/tokens';

const WEEK = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const SWATCHES = [palette.amber, palette.forest, palette.lapis, palette.terracotta, palette.garnet, palette.cocoa, palette.garnetLight, palette.sand];

export function ReminderCalendar({ dogId }: { dogId: string }) {
  const t = useTheme();
  const reminders = useReminders(dogId);
  const [cursor, setCursor] = useState(() => new Date());
  const [picked, setPicked] = useState(reminders.today);
  const [adding, setAdding] = useState(false);
  const [kind, setKind] = useState<ReminderKind>('treat');
  const [title, setTitle] = useState('');
  const [time, setTime] = useState('08:00');
  const [notes, setNotes] = useState('');
  const [color, setColor] = useState<string | null>(null);

  const days = useMemo(() => monthDays(cursor), [cursor]);
  const onPicked = reminders.onDay(picked);
  const monthLabel = cursor.toLocaleString(undefined, { month: 'long', year: 'numeric' });
  const meta = kindMeta(kind);

  const save = () => {
    const label = title.trim() || meta.label;
    reminders.add({ dogId, kind, title: label, time: time.trim() || '08:00', date: picked, notes: notes.trim() || undefined, color: color ?? meta.color });
    setTitle('');
    setNotes('');
    setAdding(false);
  };

  const shift = (delta: number) => {
    setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + delta, 1));
  };

  return (
    <View style={{ gap: space.lg }}>
      <Surface kind="grouped" style={{ gap: space.md }}>
        <View style={styles.head}>
          <Tap onPress={() => shift(-1)} haptic="selection" accessibilityLabel="Previous month">
            <Icon name="back" size={16} color={t.brand} />
          </Tap>
          <Text variant="bodyStrong">{monthLabel}</Text>
          <Tap onPress={() => shift(1)} haptic="selection" accessibilityLabel="Next month">
            <Icon name="chevron" size={16} color={t.brand} />
          </Tap>
        </View>
        <View style={styles.week}>
          {WEEK.map((d, i) => (
            <Text key={`${d}${i}`} variant="micro" tone="tertiary" style={styles.cell}>
              {d}
            </Text>
          ))}
        </View>
        <View style={styles.grid}>
          {days.map((d) => {
            const on = d.date === picked;
            const marks = reminders.marked.get(d.date) ?? [];
            return (
              <Tap key={d.date} onPress={() => setPicked(d.date)} haptic="selection" style={[styles.cell, on && { backgroundColor: t.brand, borderRadius: radius.sm }]}>
                <Text variant="label" style={{ color: on ? t.onBrand : d.inMonth ? t.text : t.textTertiary }}>
                  {d.day}
                </Text>
                <View style={styles.dots}>
                  {marks.slice(0, 3).map((c) => (
                    <View key={c} style={[styles.dot, { backgroundColor: on ? t.onBrand : c }]} />
                  ))}
                </View>
              </Tap>
            );
          })}
        </View>
      </Surface>

      <View style={{ gap: space.sm }}>
        <Text variant="overline" tone="tertiary">
          {picked === reminders.today ? 'Today' : picked}
        </Text>
        {onPicked.length === 0 ? (
          <Text variant="body" tone="secondary">
            Nothing on this day yet.
          </Text>
        ) : (
          onPicked.map((r) => {
            const k = kindMeta(r.kind);
            const c = reminderColor(r);
            return (
              <View key={r.id} style={[styles.event, { backgroundColor: t.bgRaised, borderColor: t.border }]}>
                <View style={[styles.swatch, { backgroundColor: c }]}>
                  <Icon name={k.icon} size={16} color={t.onMeaning} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text variant="bodyStrong">{r.title}</Text>
                  <Text variant="caption" tone="secondary">
                    {r.time} · {k.label}
                    {r.notes ? ` · ${r.notes}` : ''}
                  </Text>
                </View>
                <Tap onPress={() => reminders.remove(r.id)} haptic="selection" accessibilityLabel="Remove event">
                  <Icon name="trash" size={16} color={t.textTertiary} />
                </Tap>
              </View>
            );
          })
        )}
      </View>

      {adding ? (
        <Surface kind="grouped" style={{ gap: space.md }}>
          <Text variant="headline">Add an event</Text>
          <View style={styles.kinds}>
            {REMINDER_KINDS.map((k) => (
              <Chip key={k.id} label={k.label} selected={kind === k.id} onPress={() => { setKind(k.id); setColor(k.color); }} />
            ))}
          </View>
          <Field label="What" placeholder="Heart pill, nail trim, daycare drop-off" value={title} onChangeText={setTitle} />
          <Field label="Time" placeholder="08:00" value={time} onChangeText={setTime} keyboardType="numbers-and-punctuation" />
          <Field label="Notes" placeholder="Dose, who is picking up, crate note" value={notes} onChangeText={setNotes} />
          <Text variant="caption" tone="tertiary">
            Color
          </Text>
          <View style={styles.kinds}>
            {SWATCHES.map((c) => (
              <Tap key={c} onPress={() => setColor(c)} haptic="selection" style={[styles.color, { backgroundColor: c, borderColor: (color ?? meta.color) === c ? t.text : 'transparent' }]} />
            ))}
          </View>
          <View style={styles.head}>
            <Button label="Save event" onPress={save} style={{ flex: 1 }} />
            <Button label="Cancel" kind="ghost" onPress={() => setAdding(false)} />
          </View>
        </Surface>
      ) : (
        <Button label="Add an event" icon="plus" onPress={() => { setColor(meta.color); setAdding(true); }} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm },
  week: { flexDirection: 'row' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: '14.28%', alignItems: 'center', justifyContent: 'center', minHeight: 40, gap: 3 },
  dots: { flexDirection: 'row', gap: 2, minHeight: 5 },
  dot: { width: 5, height: 5, borderRadius: 2.5 },
  event: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth },
  swatch: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  kinds: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  color: { width: 28, height: 28, borderRadius: 14, borderWidth: 2 },
});
