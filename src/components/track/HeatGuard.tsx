import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import type { Pavement } from '@/engine/pavement';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';

type Props = {
  heat: Pavement;
  dogName: string;
  onStart: () => void;
  onWait: () => void;
};

/** One thumb: pavement temps, a 7-second hand check, then start or wait for the cool window. */
export function HeatGuard({ heat, dogName, onStart, onWait }: Props) {
  const t = useTheme();
  const [left, setLeft] = useState(7);
  const [running, setRunning] = useState(false);
  const tone = heat.verdict === 'unsafe' ? t.bad : t.warn;
  const band = heat.verdict === 'unsafe' ? t.badSoft : t.warnSoft;

  useEffect(() => {
    if (!running) return;
    if (left <= 0) return;
    const id = setTimeout(() => setLeft((n) => n - 1), 1000);
    return () => clearTimeout(id);
  }, [running, left]);

  return (
    <View style={[styles.card, { backgroundColor: t.bgRaised, borderColor: tone }]}>
      <View style={[styles.band, { backgroundColor: band }]}>
        <Text variant="overline" style={{ color: tone }}>
          {heat.verdict === 'unsafe' ? 'Asphalt is too hot' : 'Pavement is getting hot'}
        </Text>
        <Text variant="headline">
          Asphalt ~{heat.asphaltF}°F · grass ~{heat.grassF}°F
        </Text>
        <Text variant="caption" tone="secondary">
          Air is {heat.airF}°F. Paw burns come from the ground, not the sky.
          {heat.coolsAt ? ` Concrete usually drops below 120°F around ${heat.coolsAt}.` : ''}
        </Text>
      </View>
      {running ? (
        <Text variant="body" tone="secondary">
          Hold the back of your hand on the pavement. {left > 0 ? `${left}s` : 'If you pulled away, stay on grass.'}
        </Text>
      ) : (
        <Button label="7-second hand check" kind="secondary" onPress={() => setRunning(true)} />
      )}
      <View style={styles.row}>
        <Button label={`Walk ${dogName} anyway`} kind="ghost" onPress={onStart} style={{ flex: 1 }} />
        <Button label={heat.coolsAt ? `Wait until ${heat.coolsAt}` : 'Stay in'} onPress={onWait} style={{ flex: 1 }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: space.md, padding: space.md, borderRadius: radius.lg, borderWidth: 1.5 },
  band: { gap: 6, padding: space.md, borderRadius: radius.md },
  row: { flexDirection: 'row', gap: space.sm },
});
