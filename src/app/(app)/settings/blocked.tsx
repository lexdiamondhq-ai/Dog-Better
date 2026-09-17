import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Screen, ScreenHeader, Section } from '@/components/ui/Screen';
import { Surface } from '@/components/ui/Surface';
import { Text } from '@/components/ui/Text';
import { relativeTime } from '@/lib/activity';
import { useAuth } from '@/lib/auth';
import { listBlocked, unblockUser } from '@/lib/moderation';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/theme/ThemeProvider';
import { space } from '@/theme/tokens';

type Row = { blocked_id: string; created_at: string; name: string | null };

export default function BlockedPeople() {
  const t = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[] | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    const blocks = await listBlocked(user.id);
    const ids = blocks.map((b) => b.blocked_id);
    const { data: profiles } = ids.length ? await supabase.from('profiles').select('id, display_name').in('id', ids) : { data: [] };
    const nameById = new Map((profiles ?? []).map((p) => [p.id, p.display_name]));
    setRows(blocks.map((b) => ({ ...b, name: nameById.get(b.blocked_id) ?? null })));
  }, [user]);

  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);

  const unblock = async (id: string) => {
    if (!user) return;
    setRows((prev) => prev?.filter((r) => r.blocked_id !== id) ?? null);
    await unblockUser(user.id, id);
  };

  return (
    <Screen>
      <ScreenHeader eyebrow="Settings" title="Blocked people" subtitle="You do not see each other in Community or Barks." onBack={() => router.back()} large={false} />
      <Section title={rows?.length ? `${rows.length} blocked` : 'Nobody blocked'}>
        {rows === null ? null : rows.length === 0 ? (
          <Text variant="body" tone="secondary">
            Tap the warning icon on any post or comment to report it or block the person who wrote it.
          </Text>
        ) : (
          <Surface kind="grouped" padding={0} style={{ overflow: 'hidden' }}>
            {rows.map((r, i) => (
              <View key={r.blocked_id} style={[styles.row, i < rows.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.border }]}>
                <View style={{ flex: 1 }}>
                  <Text variant="bodyStrong">{r.name ?? 'A Dog Better member'}</Text>
                  <Text variant="caption" tone="tertiary">
                    Blocked {relativeTime(r.created_at)}
                  </Text>
                </View>
                <Button label="Unblock" kind="secondary" size="sm" onPress={() => void unblock(r.blocked_id)} />
              </View>
            ))}
          </Surface>
        )}
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingVertical: space.md },
});
