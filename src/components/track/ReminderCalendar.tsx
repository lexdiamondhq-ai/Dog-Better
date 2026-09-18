import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Field } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { Surface } from '@/components/ui/Surface';
import { Tap } from '@/components/ui/Tap';
import { Text } from '@/components/ui/Text';
import { WhenPickers } from '@/components/ui/WhenPickers';
import { requestNotifications } from '@/lib/notify';
import { nextClockSlot, prettyTime, kindMeta, monthDays, reminderColor, REMINDER_KINDS, useReminders, type Reminder, type ReminderKind } from '@/lib/reminders';
import { useTheme } from '@/theme/ThemeProvider';
import { palette, radius, space } from '@/theme/tokens';

const WEEK = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const SWATCHES: { color: string; name: string }[] = [
  { color: palette.amber, name: 'Amber' },
  { color: palette.forest, name: 'Forest' },
  { color: palette.lapis, name: 'Lapis' },
  { color: palette.terracotta, name: 'Terracotta' },
  { color: palette.garnet, name: 'Garnet' },
  { color: palette.cocoa, name: 'Cocoa' },
  { color: palette.garnetLight, name: 'Rose' },
  { color: palette.sand, name: 'Sand' },
];

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
  const [focusId, setFocusId] = useState<string | null>(null);
  const [landed, setLanded] = useState(false);
  const [scheduleNote, setScheduleNote] = useState<string | null>(null);

  const days = useMemo(() => monthDays(cursor), [cursor]);
  const onPicked = reminders.onDay(picked);
  const monthLabel = cursor.toLocaleString(undefined, { month: 'long', year: 'numeric' });
  const meta = kindMeta(kind);
  const nextDose = reminders.nextMed;

  const showDose = (r: Reminder | null) => {
    if (!r) {
      setFocusId(null);
      return;
    }
    setPicked(r.date);
    setFocusId(r.id);
    const d = new Date(`${r.date}T12:00:00`);
    if (!Number.isNaN(d.getTime())) setCursor(new Date(d.getFullYear(), d.getMonth(), 1));
  };

  // Highlight the next dose if it is in this month. Do not jump the grid to another month on open.
  useEffect(() => {
    if (landed || !nextDose) return;
    const id = setTimeout(() => {
      const d = new Date(`${nextDose.date}T12:00:00`);
      const here =
        !Number.isNaN(d.getTime()) && d.getFullYear() === cursor.getFullYear() && d.getMonth() === cursor.getMonth();
      if (here) showDose(nextDose);
      setLanded(true);
    }, 0);
    return () => clearTimeout(id);
  }, [cursor, landed, nextDose]);

  const markGiven = (r: Reminder) => {
    showDose(reminders.complete(r.id, 'medication'));
  };

  const save = () => {
    const label = title.trim() || meta.label;
    const when = time.trim() || nextClockSlot();
    reminders.add({ dogId, kind, title: label, time: when, date: picked, notes: notes.trim() || undefined, color: color ?? meta.color });
    const [hh, mm] = when.split(':').map(Number);
    const [y, mo, d] = picked.split('-').map(Number);
    const at = new Date(y, mo - 1, d, hh, mm, 0, 0);
    void (async () => {
      const allowed = await requestNotifications();
      if (!allowed) {
        setScheduleNote('Notifications are off for Dog Better. Allow them in iPhone Settings so this dose can ring.');
        return;
      }
      if (at.getTime() <= Date.now() - 90_000) {
        setScheduleNote('That date and time already passed, so this phone will not notify.');
        return;
      }
      setScheduleNote(`This phone will notify at ${prettyTime(when)}. Lock the screen and wait.`);
    })();
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
            <View key={`${d}${i}`} style={styles.cellWrap}>
              <Text variant="micro" tone="tertiary" style={styles.cellLabel}>
                {d}
              </Text>
            </View>
          ))}
        </View>
        <View style={styles.grid}>
          {days.map((d) => {
            const on = d.date === picked;
            const marks = reminders.marked.get(d.date) ?? [];
            return (
              <View key={d.date} style={styles.cellWrap}>
                <Tap onPress={() => setPicked(d.date)} haptic="selection" style={[styles.cell, on && { backgroundColor: t.brand, borderRadius: radius.sm }]}>
                  <Text variant="label" style={{ color: on ? t.onBrand : d.inMonth ? t.text : t.textTertiary }}>
                    {d.day}
                  </Text>
                  <View style={styles.dots}>
                    {marks.slice(0, 3).map((c, idx) => (
                      <View key={`${c}-${idx}`} style={[styles.dot, { backgroundColor: on ? t.onBrand : c }]} />
                    ))}
                  </View>
                </Tap>
              </View>
            );
          })}
        </View>
      </Surface>

      {nextDose && focusId === nextDose.id ? (
        <Surface kind="raised" style={{ gap: space.sm }}>
          <Text variant="overline" tone="tertiary">
            Give this dose
          </Text>
          <Text variant="headline">{nextDose.title}</Text>
          <Text variant="body" tone="secondary">
            {nextDose.date === reminders.today ? 'Today' : nextDose.date} · {nextDose.time}
            {nextDose.notes && !nextDose.notes.startsWith('sheet:') ? ` · ${nextDose.notes}` : ''}
          </Text>
          <Button label="Given. Next dose" icon="check" onPress={() => markGiven(nextDose)} />
        </Surface>
      ) : nextDose && nextDose.date !== picked ? (
        <Tap onPress={() => showDose(nextDose)} haptic="selection">
          <Text variant="caption" tone="secondary">
            Next dose is {nextDose.title} on {nextDose.date === reminders.today ? 'today' : nextDose.date}. Jump there.
          </Text>
        </Tap>
      ) : !nextDose && landed ? (
        <Text variant="caption" tone="secondary">
          Every dose on the calendar is given. Add the next one when the clinic writes a new sheet.
        </Text>
      ) : null}

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
            const done = Boolean(r.completedAt);
            const focused = r.id === focusId;
            return (
              <View
                key={r.id}
                style={[
                  styles.event,
                  { backgroundColor: t.bgRaised, borderColor: focused ? t.brand : t.border, opacity: done ? 0.55 : 1 },
                ]}>
                <View style={[styles.swatch, { backgroundColor: done ? t.textTertiary : c }]}>
                  <Icon name={done ? 'check' : k.icon} size={16} color={t.onMeaning} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text variant="bodyStrong">{r.title}</Text>
                  <Text variant="caption" tone="secondary">
                    {done ? 'Given' : r.time} · {k.label}
                    {r.notes && !r.notes.startsWith('sheet:') ? ` · ${r.notes}` : ''}
                  </Text>
                </View>
                {r.kind === 'medication' && !done ? (
                  <Tap onPress={() => markGiven(r)} haptic="medium" accessibilityLabel="Mark dose given">
                    <Icon name="check" size={18} color={t.brand} />
                  </Tap>
                ) : null}
                {done && r.kind === 'medication' ? (
                  <Tap onPress={() => reminders.reopen(r.id)} haptic="selection" accessibilityLabel="Undo given">
                    <Text variant="micro" tone="secondary">
                      Undo
                    </Text>
                  </Tap>
                ) : null}
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
          <WhenPickers
            date={picked}
            time={time}
            today={reminders.today}
            onDate={(date) => {
              setPicked(date);
              const d = new Date(`${date}T12:00:00`);
              if (!Number.isNaN(d.getTime())) setCursor(new Date(d.getFullYear(), d.getMonth(), 1));
            }}
            onTime={setTime}
          />
          <Field label="Notes" placeholder="Dose, who is picking up, crate note" value={notes} onChangeText={setNotes} />
          <Text variant="caption" tone="tertiary">
            Color
          </Text>
          <View style={styles.kinds}>
            {SWATCHES.map((s) => {
              const selected = (color ?? meta.color) === s.color;
              return (
                <Tap
                  key={s.color}
                  onPress={() => setColor(s.color)}
                  haptic="selection"
                  accessibilityLabel={`${s.name} color`}
                  accessibilityState={{ selected }}
                  style={[styles.color, { backgroundColor: s.color, borderColor: selected ? t.text : 'transparent' }]}
                />
              );
            })}
          </View>
          <View style={styles.head}>
            <Button label="Save event" onPress={save} style={{ flex: 1 }} />
            <Button label="Cancel" kind="ghost" onPress={() => setAdding(false)} />
          </View>
        </Surface>
      ) : (
        <Button
          label="Add an event"
          icon="plus"
          onPress={() => {
            setColor(meta.color);
            setTime(nextClockSlot());
            setScheduleNote(null);
            setAdding(true);
          }}
        />
      )}
      {scheduleNote ? (
        <Text variant="caption" tone="secondary">
          {scheduleNote}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm },
  week: { flexDirection: 'row' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cellWrap: { width: '14.2857%' },
  cell: { width: '100%', alignItems: 'center', justifyContent: 'center', minHeight: 44, gap: 3, paddingVertical: 4 },
  cellLabel: { textAlign: 'center', width: '100%' },
  dots: { flexDirection: 'row', gap: 2, minHeight: 5 },
  dot: { width: 5, height: 5, borderRadius: 2.5 },
  event: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth },
  swatch: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  kinds: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  color: { width: 28, height: 28, borderRadius: 14, borderWidth: 2 },
});
