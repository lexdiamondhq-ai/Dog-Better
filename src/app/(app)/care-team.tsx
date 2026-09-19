import * as Clipboard from 'expo-clipboard';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, Share, StyleSheet, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { Screen, ScreenHeader, Section } from '@/components/ui/Screen';
import { Surface } from '@/components/ui/Surface';
import { Tap } from '@/components/ui/Tap';
import { Text } from '@/components/ui/Text';
import { CareSeatCard } from '@/components/care/CareSeatCard';
import { HouseRoster } from '@/components/today/HouseRoster';
import { SheetReadReview } from '@/components/care/SheetReadReview';
import { ShotRecord } from '@/components/care/ShotRecord';
import { applySheetRead } from '@/lib/applySheetRead';
import { isShotTitle, type SheetRead } from '@/engine/sheetMeds';
import { requestNotifications } from '@/lib/notify';
import { useDogActivity } from '@/lib/activity';
import { useAuth } from '@/lib/auth';
import { useDogs } from '@/lib/dogs';
import { humanizeError } from '@/lib/errors';
import { buildHandoffSheet } from '@/lib/handoff';
import { usePreferences } from '@/lib/preferences';
import { readVisitSheet, readVisitSheets, sheetReadFailNote } from '@/lib/readVisitSheet';
import { rosterMedLabel, useReminders } from '@/lib/reminders';
import { useSyncNotesMeds } from '@/lib/syncNotesMeds';
import { isImagePath } from '@/lib/media';
import { askVetVisitSource, materializeVisitForRead, uploadVetVisit, useVetVisits, type VisitSource } from '@/lib/visits';
import type { VaultPhoto } from '@/lib/vault';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';

/**
 * The dog is cared for by more than one person. The sheet is the handoff.
 * Care Seat puts a name and a clock on this phone so doses say who gave them.
 */
export default function CareTeam() {
  const t = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const { dog, refresh } = useDogs();
  const { weightUnit } = usePreferences();
  const visits = useVetVisits(dog?.id);
  const reminders = useReminders(dog?.id);
  useSyncNotesMeds(dog);
  const activity = useDogActivity(dog);
  const meals = activity.mealsToday.filter((m) => m.kind === 'breakfast' || m.kind === 'dinner').length;
  const overdue = reminders.dueToday.filter((r) => {
    const [h, m] = r.time.split(':').map((n) => parseInt(n, 10));
    return h * 60 + m < new Date().getHours() * 60 + new Date().getMinutes();
  });
  const cards = visits.visits.filter((v) => isImagePath(v.storage_path));
  const [copied, setCopied] = useState(false);
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);
  const [reading, setReading] = useState(false);
  const [readNote, setReadNote] = useState<string | null>(null);
  const [draft, setDraft] = useState<SheetRead | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sheet = dog ? buildHandoffSheet(dog, user?.email, weightUnit) : '';

  const landRead = (read: SheetRead) => {
    if (!dog) return;
    if (read.found) {
      setDraft(read);
      setReadNote('Check medications and upcoming shots, then save to put them on the calendar.');
      return;
    }
    setReadNote('Nothing to put on the calendar yet. Photograph the meds list or the vaccine card and tap Read.');
  };

  const share = async () => {
    if (!dog) return;
    await Share.share({ message: sheet, title: `${dog.name} care sheet` });
  };

  const copy = async () => {
    await Clipboard.setStringAsync(sheet);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const runUpload = (from: VisitSource) => {
    if (!dog || !user) return;
    void (async () => {
      setBusy(true);
      setError(null);
      try {
        const saved = await uploadVetVisit({ dogId: dog.id, userId: user.id, title, from });
        if (!saved?.length) return;
        setTitle('');
        await visits.reload();
        setReading(true);
        const read = await readVisitSheets(saved.map((row) => ({ uri: row.localUri, path: row.storage_path, mime: row.mime })), dog);
        if (!read.found) {
          setReadNote(sheetReadFailNote(read.reason));
          return;
        }
        landRead(read);
      } catch (e) {
        setError(humanizeError(e, 'Could not save that visit.'));
      } finally {
        setBusy(false);
        setReading(false);
      }
    })();
  };

  const upload = () => {
    if (!dog || !user) return;
    askVetVisitSource((from) => runUpload(from));
  };

  const uploadFile = () => runUpload('file');

  const readExisting = (visit: VaultPhoto) => {
    if (!dog) return;
    void (async () => {
      setBusy(true);
      setReading(true);
      setError(null);
      try {
        const local = await materializeVisitForRead(visit);
        const read = await readVisitSheet({ uri: local.uri, path: local.path, mime: local.mime, dog });
        if (!read.found) {
          setReadNote(sheetReadFailNote(read.reason));
          return;
        }
        landRead(read);
      } catch (e) {
        setError(humanizeError(e, 'Could not read that visit.'));
      } finally {
        setBusy(false);
        setReading(false);
      }
    })();
  };

  const confirmRead = () => {
    if (!dog || !draft) return;
    void (async () => {
      setConfirming(true);
      setError(null);
      try {
        await requestNotifications();
        const summary = await applySheetRead({ dog, read: draft, replaceSheetReminders: reminders.replaceSheetReminders });
        await refresh();
        setDraft(null);
        setReadNote(summary);
        Alert.alert('Saved', summary, [
          { text: 'Stay here' },
          { text: 'Open calendar', onPress: () => router.push('/(app)/calendar') },
        ]);
      } catch (e) {
        setError(humanizeError(e, 'Could not save those details.'));
      } finally {
        setConfirming(false);
      }
    })();
  };

  return (
    <Screen>
      <ScreenHeader
        voice="clinical"
        title={dog ? `${dog.name}'s people` : 'Care team'}
        subtitle={dog ? 'Whoever has them should never have to guess.' : undefined}
        onBack={() => router.back()}
        trailing={
          dog ? (
            <Tap onPress={() => router.push('/(app)/care-sheet-edit')} haptic="selection" style={[styles.editBtn, { backgroundColor: t.surface }]} accessibilityLabel="Edit care sheet">
              <Icon name="edit" size={18} />
            </Tap>
          ) : undefined
        }
      />

      <HouseRoster
        dots={[
          { icon: 'meal', label: 'Fed', value: meals ? `${meals}/2` : 'Not yet', tone: meals >= 2 ? 'good' : meals ? 'warn' : 'neutral' },
          { icon: 'pill', label: 'Dose', value: rosterMedLabel(reminders.nextMed), tone: reminders.nextMed ? 'warn' : 'good' },
          { icon: 'clock', label: 'Due', value: overdue.length ? `${overdue.length} late` : 'Clear', tone: overdue.length ? 'bad' : 'good' },
        ]}
      />

      {dog ? (
        <ShotRecord
          notes={dog.notes}
          today={reminders.today}
          extras={reminders.all
            .filter((r) => (r.kind === 'vaccine' || isShotTitle(r.title)) && !r.completedAt)
            .map((r) => ({ title: r.title, date: r.date }))}
          onEdit={() => router.push('/(app)/care-sheet-edit')}
          onOpenDate={() => router.push('/(app)/calendar')}
        />
      ) : null}

      {cards.length ? (
        <Section title="Cards and visits">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.film}>
            {cards.map((v) => (
              <Tap key={v.id} onPress={() => router.push({ pathname: '/(app)/photo/[id]', params: { id: v.id } })} haptic="selection">
                <Image source={{ uri: v.url }} style={styles.card} contentFit="cover" />
              </Tap>
            ))}
          </ScrollView>
        </Section>
      ) : null}

      <Animated.View entering={FadeInUp.delay(60).duration(260)}>
        <Surface kind="grouped" style={{ gap: space.md }}>
          <View style={styles.sheetHead}>
            <View style={[styles.sheetIcon, { backgroundColor: t.furLight }]}>
              <Icon name="document" size={22} color={t.brand} />
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="headline">{dog?.name ?? 'Dog'} care sheet</Text>
              <Text variant="caption" tone="secondary">
                Feeding, do-not list, quirks, vet, emergency signs. Built from the profile, always current.
              </Text>
            </View>
          </View>
          <View style={[styles.preview, { backgroundColor: t.surface }]}>
            <Text variant="caption" style={{ fontFamily: 'Menlo', lineHeight: 17 }} numberOfLines={12}>
              {sheet}
            </Text>
          </View>
          <View style={styles.actions}>
            <Button label="Send sheet" icon="share" onPress={share} disabled={!dog} style={{ flex: 1 }} />
            <Button label={copied ? 'Copied' : 'Copy'} icon={copied ? 'check' : 'document'} kind="secondary" onPress={copy} disabled={!dog} style={{ flex: 1 }} />
          </View>
          <Button label="Clinic pack for the vet" icon="vet" kind="ghost" onPress={() => router.push('/(app)/clinic')} />
        </Surface>
      </Animated.View>

      <Section title="Vet visits">
        <Surface kind="grouped" style={{ gap: space.md }}>
          <Text variant="caption" tone="secondary">
            Upload a photo or files (PDF, text, visit summary, vaccine card). We read medications and upcoming shots such as rabies, then you save them onto the calendar.
          </Text>
          <Field label="What was this visit" placeholder="Annual, vaccines, teeth" value={title} onChangeText={setTitle} />
          <View style={styles.actions}>
            <Button label="Photo" icon="camera" onPress={upload} loading={busy} disabled={!dog} style={{ flex: 1 }} />
            <Button label="File" icon="document" kind="secondary" onPress={uploadFile} loading={busy} disabled={!dog} style={{ flex: 1 }} />
          </View>
          {reading ? (
            <Text variant="caption" tone="secondary">
              Reading the sheet for shots, clinic details, and medications.
            </Text>
          ) : null}
          {draft ? (
            <SheetReadReview read={draft} onChange={setDraft} onConfirm={confirmRead} onDiscard={() => setDraft(null)} confirming={confirming} />
          ) : null}
          {readNote ? (
            <Text variant="caption" tone="secondary">
              {readNote}
            </Text>
          ) : null}
          {error ? (
            <Text variant="caption" tone="bad">
              {error}
            </Text>
          ) : null}
          {visits.visits.length ? (
            <View style={styles.visits}>
              {visits.visits.map((v) => (
                <View key={v.id} style={styles.visit}>
                  <Tap onPress={() => router.push({ pathname: '/(app)/photo/[id]', params: { id: v.id } })} haptic="selection" style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.md }}>
                    {isImagePath(v.storage_path) ? (
                      <Image source={{ uri: v.url }} style={styles.visitImg} contentFit="cover" />
                    ) : (
                      <View style={[styles.visitImg, styles.visitFile, { backgroundColor: t.surface }]}>
                        <Icon name="document" size={20} color={t.brand} />
                      </View>
                    )}
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text variant="bodyStrong" numberOfLines={1}>
                        {v.caption ?? 'Vet visit'}
                      </Text>
                      <Text variant="caption" tone="tertiary">
                        {new Date(v.created_at).toLocaleDateString()}
                      </Text>
                    </View>
                  </Tap>
                  <Tap onPress={() => readExisting(v)} haptic="medium" disabled={busy} accessibilityLabel="Read medications from this visit">
                    <Text variant="label" tone="brand">
                      Read
                    </Text>
                  </Tap>
                </View>
              ))}
            </View>
          ) : (
            <Text variant="caption" tone="tertiary">
              Nothing uploaded yet.
            </Text>
          )}
        </Surface>
      </Section>


      <CareSeatCard dog={dog} ownerEmail={user?.email} weightUnit={weightUnit} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  editBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  sheetHead: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  sheetIcon: { width: 46, height: 46, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  preview: { padding: space.md, borderRadius: radius.sm },
  actions: { flexDirection: 'row', gap: space.sm },
  role: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingVertical: space.md },
  roleIcon: { width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  visits: { gap: space.sm },
  visit: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  visitImg: { width: 52, height: 52, borderRadius: 12 },
  visitFile: { alignItems: 'center', justifyContent: 'center' },
  film: { gap: space.sm, paddingRight: space.sm },
  card: { width: 148, height: 96, borderRadius: radius.md },
});
