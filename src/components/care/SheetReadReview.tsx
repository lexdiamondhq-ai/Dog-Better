import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, StyleSheet, Switch, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Field } from '@/components/ui/Field';
import { Surface } from '@/components/ui/Surface';
import { Tap } from '@/components/ui/Tap';
import { Text } from '@/components/ui/Text';
import { type SheetMeal, type SheetMed, type SheetRead } from '@/engine/sheetMeds';
import { clockNow, nextClockSlot, prettyTime } from '@/lib/reminders';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';

const COURSE = [3, 5, 7, 10, 14] as const;

type Props = {
  read: SheetRead;
  onChange: (next: SheetRead) => void;
  onConfirm: () => void;
  onDiscard: () => void;
  confirming: boolean;
};

/**
 * Nothing from a visit sheet writes to the dog or the calendar until the owner checks the times.
 * The reader never invents 08:00 or a 7-day course; those fields stay empty until someone sets them.
 */
export function SheetReadReview({ read, onChange, onConfirm, onDiscard, confirming }: Props) {
  const t = useTheme();

  const setMeds = (medications: SheetMed[]) => onChange({ ...read, medications, found: medications.length > 0 || read.meals.length > 0 });
  const setMeals = (meals: SheetMeal[]) => onChange({ ...read, meals, found: read.medications.length > 0 || meals.length > 0 });

  const patchMed = (i: number, patch: Partial<SheetMed>) => setMeds(read.medications.map((m, idx) => (idx === i ? { ...m, ...patch } : m)));
  const patchMeal = (i: number, patch: Partial<SheetMeal>) => setMeals(read.meals.map((m, idx) => (idx === i ? { ...m, ...patch } : m)));

  return (
    <Surface kind="grouped" style={{ gap: space.md }}>
      <View style={{ gap: space.xs }}>
        <Text variant="headline">Check before we save</Text>
        <Text variant="caption" tone="secondary">
          Times and days come from the sheet or from you. Nothing is guessed, and nothing is scheduled until you confirm. Confirming replaces earlier reminders from a visit sheet.
        </Text>
      </View>

      {read.medications.map((med, i) => (
        <View key={`${med.name}-${i}`} style={[styles.card, { backgroundColor: t.surface, borderColor: t.border }]}>
          <Field label="Medication" value={med.name} onChangeText={(name) => patchMed(i, { name })} />
          <Field label="Dose" value={med.dose ?? ''} onChangeText={(dose) => patchMed(i, { dose: dose.trim() || null })} placeholder="1 tablet (75 mg)" />
          <TimesRow
            times={med.times}
            emptyHint={med.note ?? 'No clock time was on the sheet. Add one to remind.'}
            onAdd={(time) => patchMed(i, { times: med.times.includes(time) ? med.times : [...med.times, time].slice(0, 4) })}
            onRemove={(time) => patchMed(i, { times: med.times.filter((x) => x !== time) })}
          />
          <DaysRow days={med.days} onChange={(days) => patchMed(i, { days })} />
          <View style={styles.food}>
            <Text variant="bodyStrong">With food</Text>
            <Switch value={med.withFood} onValueChange={(withFood) => patchMed(i, { withFood })} trackColor={{ true: t.brand }} />
          </View>
          <Tap onPress={() => setMeds(read.medications.filter((_, idx) => idx !== i))} haptic="selection">
            <Text variant="label" tone="bad">
              Remove this medication
            </Text>
          </Tap>
        </View>
      ))}

      {read.meals.map((meal, i) => (
        <View key={`${meal.label}-${i}`} style={[styles.card, { backgroundColor: t.surface, borderColor: t.border }]}>
          <Field label="Meal" value={meal.label} onChangeText={(label) => patchMeal(i, { label })} />
          <TimesRow
            times={[meal.time]}
            emptyHint="Add a meal time to remind."
            replace
            onAdd={(time) => patchMeal(i, { time })}
            onRemove={() => patchMeal(i, { time: '' })}
          />
          <DaysRow days={meal.days} onChange={(days) => patchMeal(i, { days })} />
          <Tap onPress={() => setMeals(read.meals.filter((_, idx) => idx !== i))} haptic="selection">
            <Text variant="label" tone="bad">
              Remove this meal
            </Text>
          </Tap>
        </View>
      ))}

      <Button label={confirming ? 'Saving' : 'Save to profile and calendar'} icon="check" onPress={onConfirm} loading={confirming} disabled={!read.found} />
      <Button label="Discard this read" kind="ghost" onPress={onDiscard} disabled={confirming} />
    </Surface>
  );
}

function DaysRow({ days, onChange }: { days: number | null; onChange: (days: number | null) => void }) {
  return (
    <View style={{ gap: space.xs }}>
      <Text variant="caption" tone="tertiary">
        How many days
      </Text>
      <View style={styles.chips}>
        <Chip label="Not listed" selected={days == null} onPress={() => onChange(null)} size="sm" />
        {COURSE.map((n) => (
          <Chip key={n} label={`${n}`} selected={days === n} onPress={() => onChange(n)} size="sm" />
        ))}
      </View>
    </View>
  );
}

function TimesRow({
  times,
  emptyHint,
  onAdd,
  onRemove,
  replace,
}: {
  times: string[];
  emptyHint: string;
  onAdd: (time: string) => void;
  onRemove: (time: string) => void;
  replace?: boolean;
}) {
  const t = useTheme();
  const [open, setOpen] = useState(false);
  const shown = times.filter(Boolean);
  const seed = shown[0] ?? nextClockSlot();
  const [hh, mm] = seed.split(':').map(Number);
  const value = new Date();
  value.setHours(Number.isFinite(hh) ? hh : 8, Number.isFinite(mm) ? mm : 0, 0, 0);

  const apply = (event: DateTimePickerEvent, next?: Date) => {
    if (Platform.OS === 'android') setOpen(false);
    if (event.type !== 'set' || !next) return;
    onAdd(clockNow(next));
  };

  return (
    <View style={{ gap: space.xs }}>
      <Text variant="caption" tone="tertiary">
        Time
      </Text>
      {shown.length ? (
        <View style={styles.chips}>
          {shown.map((time) => (
            <Chip key={time} label={prettyTime(time)} selected onPress={() => onRemove(time)} size="sm" />
          ))}
        </View>
      ) : (
        <Text variant="caption" tone="secondary">
          {emptyHint}
        </Text>
      )}
      <Tap
        onPress={() => setOpen((v) => !v)}
        haptic="selection"
        style={[styles.addTime, { backgroundColor: t.bgRaised, borderColor: open ? t.brand : t.border }]}
        accessibilityRole="button"
        accessibilityLabel="Add a time">
        <Text variant="label" tone="brand">
          {replace && shown.length ? 'Change time' : 'Add a time'}
        </Text>
      </Tap>
      {open ? (
        <DateTimePicker
          value={value}
          mode="time"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          minuteInterval={5}
          accentColor={t.brand}
          themeVariant={t.scheme === 'dark' ? 'dark' : 'light'}
          onChange={apply}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: space.md, padding: space.md, borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
  food: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  addTime: { alignSelf: 'flex-start', paddingHorizontal: space.md, paddingVertical: space.sm, borderRadius: radius.pill, borderWidth: StyleSheet.hairlineWidth },
});
