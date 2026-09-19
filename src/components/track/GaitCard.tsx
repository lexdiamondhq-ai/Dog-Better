import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { Surface } from '@/components/ui/Surface';
import { Text } from '@/components/ui/Text';
import { gaitFromWalks } from '@/engine/gaitWatch';
import type { Walk } from '@/lib/database.types';
import { fetchRecentWalks } from '@/lib/walks';
import { useTheme } from '@/theme/ThemeProvider';
import { space } from '@/theme/tokens';

export function GaitCard({ dogId, dogName }: { dogId: string; dogName: string }) {
  const t = useTheme();
  const [walks, setWalks] = useState<Walk[]>([]);

  useEffect(() => {
    fetchRecentWalks(dogId, 30)
      .then(setWalks)
      .catch(() => setWalks([]));
  }, [dogId]);

  const note = gaitFromWalks(walks, dogName);
  if (!note) return null;
  const color = { good: t.good, warn: t.warn, neutral: t.brand }[note.tone];

  return (
    <Surface kind="grouped" style={styles.card}>
      <Icon name={note.tone === 'warn' ? 'warning' : 'walk'} size={20} color={color} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="overline" tone="secondary">
          Walk watch
        </Text>
        <Text variant="bodyStrong">{note.line}</Text>
        <Text variant="caption" tone="secondary">
          {note.detail}
        </Text>
      </View>
    </Surface>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
});
