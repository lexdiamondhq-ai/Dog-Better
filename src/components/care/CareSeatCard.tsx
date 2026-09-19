import { useState } from 'react';
import { Share, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Field } from '@/components/ui/Field';
import { Text } from '@/components/ui/Text';
import { Surface } from '@/components/ui/Surface';
import { CARE_ROLES, roleLabel, useCareSeat, type CareRole } from '@/lib/careSeat';
import { buildHandoffSheet } from '@/lib/handoff';
import type { Dog } from '@/lib/database.types';
import type { WeightUnit } from '@/lib/preferences';
import { space } from '@/theme/tokens';

const HOURS = [2, 4, 8, 12];

/** Time-boxed named seat on this phone. Doses and the sheet go out with a clock. */
export function CareSeatCard({
  dog,
  ownerEmail,
  weightUnit,
}: {
  dog: Dog | null;
  ownerEmail?: string | null;
  weightUnit: WeightUnit;
}) {
  const seat = useCareSeat(dog?.id);
  const [name, setName] = useState('');
  const [role, setRole] = useState<CareRole>('sitter');
  const [hours, setHours] = useState(4);
  const [busy, setBusy] = useState(false);

  const begin = async () => {
    if (!dog || name.trim().length < 2) return;
    setBusy(true);
    try {
      const next = await seat.start({ sitterName: name.trim(), role, hours });
      if (!next) return;
      await Share.share({
        message: `${next.sitterName} has ${dog.name} until ${new Date(next.endsAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}.\n\n${buildHandoffSheet(dog, ownerEmail, weightUnit)}`,
        title: `${dog.name} care seat`,
      });
      setName('');
    } finally {
      setBusy(false);
    }
  };

  if (seat.seat) {
    return (
      <Surface kind="grouped" style={{ gap: space.md }}>
        <Text variant="overline" tone="tertiary">
          Care seat
        </Text>
        <Text variant="headline">
          {seat.seat.sitterName} · {roleLabel(seat.seat.role)}
        </Text>
        <Text variant="body" tone="secondary">
          Until {new Date(seat.seat.endsAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}. Meals,
          doses, and walks marked on this phone say their name. The sheet is what they hold.
        </Text>
        <Button label="End the seat" icon="check" kind="secondary" onPress={() => void seat.end()} />
      </Surface>
    );
  }

  return (
    <Surface kind="grouped" style={{ gap: space.md }}>
      <Text variant="overline" tone="tertiary">
        Care seat
      </Text>
      <Text variant="headline">Someone else has {dog?.name ?? 'them'}</Text>
      <Text variant="caption" tone="secondary">
        A clock, a name, and the sheet. This phone still does the logging. Their name lands on every dose until the seat ends.
      </Text>
      <Field label="Who" placeholder="Maya" value={name} onChangeText={setName} autoCapitalize="words" />
      <View style={styles.chips}>
        {CARE_ROLES.map((r) => (
          <Chip key={r.id} label={r.label} selected={role === r.id} onPress={() => setRole(r.id)} />
        ))}
      </View>
      <Text variant="caption" tone="secondary">
        {CARE_ROLES.find((r) => r.id === role)?.line}
      </Text>
      <View style={styles.chips}>
        {HOURS.map((h) => (
          <Chip key={h} label={`${h}h`} selected={hours === h} onPress={() => setHours(h)} />
        ))}
      </View>
      <Button
        label="Start seat and send the sheet"
        icon="share"
        onPress={() => void begin()}
        loading={busy}
        disabled={!dog || name.trim().length < 2}
      />
    </Surface>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
});
