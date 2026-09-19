import * as Location from 'expo-location';
import * as Sharing from 'expo-sharing';
import { Directory, File, Paths } from 'expo-file-system';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Share, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Screen, ScreenHeader, Section } from '@/components/ui/Screen';
import { Surface } from '@/components/ui/Surface';
import { Text } from '@/components/ui/Text';
import { buildLostPacket, lostPosterHtml } from '@/engine/lostPacket';
import { useAuth } from '@/lib/auth';
import { useDogs } from '@/lib/dogs';
import { humanizeError } from '@/lib/errors';
import { usePreferences } from '@/lib/preferences';
import { useReminders } from '@/lib/reminders';
import { fetchRecentWalks } from '@/lib/walks';
import type { Walk } from '@/lib/database.types';
import { useTheme } from '@/theme/ThemeProvider';
import { space } from '@/theme/tokens';

export default function LostDog() {
  const t = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const { dog } = useDogs();
  const { weightUnit } = usePreferences();
  const reminders = useReminders(dog?.id);
  const [lastWalk, setLastWalk] = useState<Walk | null>(null);
  const [here, setHere] = useState<{ latitude: number; longitude: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!dog) return;
    fetchRecentWalks(dog.id, 1)
      .then((rows) => setLastWalk(rows[0] ?? null))
      .catch(() => setLastWalk(null));
    Location.getForegroundPermissionsAsync()
      .then((perm) => (perm.granted ? Location.getLastKnownPositionAsync() : null))
      .then((pos) => {
        if (pos) setHere({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
      })
      .catch(() => {});
  }, [dog]);

  const body = dog
    ? buildLostPacket({
        dog,
        ownerEmail: user?.email,
        weightUnit,
        openMeds: reminders.openMeds,
        lastWalk,
        here,
      })
    : '';

  const shareText = async () => {
    if (!dog) return;
    await Share.share({ message: body, title: `Lost dog: ${dog.name}` });
  };

  const sharePoster = async () => {
    if (!dog) return;
    setBusy(true);
    setError(null);
    try {
      const dir = new Directory(Paths.cache, 'lost');
      if (!dir.exists) dir.create();
      const file = new File(dir, `${dog.name.replace(/[^\w]+/g, '-').toLowerCase()}-lost.html`);
      file.write(lostPosterHtml(dog.name, body, dog.avatar_url));
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.uri, { mimeType: 'text/html', dialogTitle: `Lost ${dog.name}` });
      }
    } catch (e) {
      setError(humanizeError(e, 'Could not build the poster.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen
      footer={
        <View style={styles.footer}>
          <Button label="Send poster" icon="share" kind="danger" size="lg" onPress={sharePoster} loading={busy} disabled={!dog} style={{ flex: 1 }} />
          <Button label="Copy text" icon="document" kind="secondary" size="lg" onPress={shareText} disabled={!dog} style={{ flex: 1 }} />
        </View>
      }>
      <ScreenHeader
        voice="clinical"
        eyebrow="Emergency"
        title={dog ? `Lost: ${dog.name}` : 'Lost dog packet'}
        subtitle="Offline facts a finder needs, including meds due. Long-press Emergency on Today to get here faster."
        onBack={() => router.back()}
        large={false}
      />

      <Surface kind="raised" style={[styles.banner, { borderColor: t.bad, borderWidth: 1.5 }]}>
        <Text variant="headline">Do not wait to print this</Text>
        <Text variant="caption" tone="secondary">
          Send the poster, then walk the last route. A finder needs the coat, the chip, and what medicine they are on.
        </Text>
      </Surface>

      <Section title="Packet">
        <Surface kind="tonal">
          <Text variant="caption" style={{ fontFamily: 'Menlo', lineHeight: 18 }}>
            {body || 'Add a dog first.'}
          </Text>
        </Surface>
      </Section>

      {error ? (
        <Text variant="caption" tone="bad">
          {error}
        </Text>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  footer: { flexDirection: 'row', gap: space.sm },
  banner: { gap: space.sm },
});
