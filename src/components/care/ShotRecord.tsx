import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Surface } from '@/components/ui/Surface';
import { Tap } from '@/components/ui/Tap';
import { Text } from '@/components/ui/Text';
import { buildShotRecord, shotRecordHeadline, type ShotStatus } from '@/engine/shotRecord';
import { useTheme } from '@/theme/ThemeProvider';
import { space } from '@/theme/tokens';

type Props = {
  notes: string | null;
  today: string;
  extras?: { title: string; date: string }[];
  onEdit?: () => void;
  onOpenDate?: (date: string) => void;
};

/** Rabies, DHPP, Bordetella, and any other shot a visit sheet put on the profile. */
export function ShotRecord({ notes, today, extras, onEdit, onOpenDate }: Props) {
  const t = useTheme();
  const rows = buildShotRecord(notes, today, extras);
  const headline = shotRecordHeadline(rows);
  const urgent = rows.some((r) => r.tone === 'bad' || r.tone === 'warn');

  return (
    <Surface kind="grouped" style={[styles.card, urgent ? { borderColor: t.warn, borderWidth: 1.5 } : null]}>
      <View style={styles.head}>
        <Icon name="vaccine" size={20} color={urgent ? t.warn : t.brand} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="overline" tone="tertiary">
            Shots
          </Text>
          <Text variant="headline">{headline}</Text>
          <Text variant="caption" tone="secondary">
            From the care sheet and any visit form we have read.
          </Text>
        </View>
      </View>
      {rows.map((row) => (
        <ShotRow key={row.key} row={row} onPress={row.date && onOpenDate ? () => onOpenDate(row.date!) : undefined} />
      ))}
      {onEdit ? <Button label="Edit shot dates" icon="edit" kind="ghost" onPress={onEdit} /> : null}
    </Surface>
  );
}

function ShotRow({ row, onPress }: { row: ShotStatus; onPress?: () => void }) {
  const t = useTheme();
  const color = { good: t.good, warn: t.warn, bad: t.bad, neutral: t.textTertiary }[row.tone];
  const body = (
    <View style={styles.row}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <View style={{ flex: 1 }}>
        <Text variant="bodyStrong">{row.title}</Text>
        <Text variant="caption" tone="secondary">
          {row.line}
        </Text>
      </View>
    </View>
  );
  if (!onPress) return body;
  return (
    <Tap onPress={onPress} haptic="selection" accessibilityLabel={`${row.title}. ${row.line}`}>
      {body}
    </Tap>
  );
}

const styles = StyleSheet.create({
  card: { gap: space.md },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  dot: { width: 10, height: 10, borderRadius: 5 },
});
