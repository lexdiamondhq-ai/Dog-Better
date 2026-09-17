import * as Clipboard from 'expo-clipboard';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Share, StyleSheet, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { Icon, type IconName } from '@/components/ui/Icon';
import { Screen, ScreenHeader, Section } from '@/components/ui/Screen';
import { Surface } from '@/components/ui/Surface';
import { Tap } from '@/components/ui/Tap';
import { Text } from '@/components/ui/Text';
import { applySheetRead } from '@/lib/applySheetRead';
import { useAuth } from '@/lib/auth';
import { useDogs } from '@/lib/dogs';
import { useEntitlements } from '@/lib/entitlements';
import { humanizeError } from '@/lib/errors';
import { buildHandoffSheet } from '@/lib/handoff';
import { usePreferences } from '@/lib/preferences';
import { readVisitSheet } from '@/lib/readVisitSheet';
import { useReminders } from '@/lib/reminders';
import { isImagePath } from '@/lib/media';
import { askVetVisitSource, uploadVetVisit, useVetVisits, type VisitSource } from '@/lib/visits';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';

const ROLES: { icon: IconName; title: string; sees: string }[] = [
  { icon: 'person', title: 'Partner or family', sees: 'Everything, including the health timeline' },
  { icon: 'walk', title: 'Dog walker', sees: 'Walking rules, triggers, harness, emergency contacts' },
  { icon: 'clock', title: 'Sitter or daycare', sees: 'Feeding, meds, routine, do-not list, vet' },
  { icon: 'vet', title: 'Vet', sees: 'Records, weight trend, symptom history' },
];

/**
 * The dog is cared for by more than one person. This tab is the single sheet they all work from.
 * V1 ships the sheet as text you can send anywhere; role-based live links come in a later phase.
 */
export default function CareTeam() {
  const t = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const { dog, refresh } = useDogs();
  const { isPremium } = useEntitlements();
  const { weightUnit } = usePreferences();
  const visits = useVetVisits(dog?.id);
  const reminders = useReminders(dog?.id);
  const [copied, setCopied] = useState(false);
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);
  const [reading, setReading] = useState(false);
  const [readNote, setReadNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sheet = dog ? buildHandoffSheet(dog, user?.email, weightUnit) : '';

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
        if (!saved) return;
        const today = new Date();
        const date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        reminders.add({
          dogId: dog.id,
          kind: 'vet',
          title: saved.caption,
          time: `${String(today.getHours()).padStart(2, '0')}:${String(today.getMinutes()).padStart(2, '0')}`,
          date,
        });
        setTitle('');
        await visits.reload();
        if (!isPremium) {
          setReadNote('Saved on the profile. Premium reads the sheet for meds and dose reminders.');
          return;
        }
        setReading(true);
        const read = await readVisitSheet({ uri: saved.localUri, path: saved.storage_path, dog });
        if (!read.found) {
          setReadNote('Saved. No medications or meal times were on that page. Photograph the meds list if this was a PDF.');
          return;
        }
        const summary = await applySheetRead({ dog, read, replaceSheetReminders: reminders.replaceSheetReminders });
        await refresh();
        setReadNote(summary);
        Alert.alert('On the profile', summary);
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

  return (
    <Screen>
      <ScreenHeader title={dog ? `${dog.name}'s people` : 'Care team'} subtitle={dog ? 'Whoever has them should never have to guess.' : undefined} onBack={() => router.back()} />

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
            <Button label="Send sheet" icon="share" onPress={share} style={{ flex: 1 }} />
            <Button label={copied ? 'Copied' : 'Copy'} icon={copied ? 'check' : 'document'} kind="secondary" onPress={copy} />
          </View>
          <Button label="Clinic pack for the vet" icon="vet" kind="ghost" onPress={() => router.push('/(app)/clinic')} />
        </Surface>
      </Animated.View>

      <Section title="Vet visits">
        <Surface kind="grouped" style={{ gap: space.md }}>
          <Text variant="caption" tone="secondary">
            Upload a photo or a text file (visit summary, vaccine card). It lands on {dog?.name ?? 'this dog'}&apos;s profile.
            {isPremium
              ? ' Premium reads the page for medications, writes them on the profile, and sets dose and meal reminders.'
              : ' Reading the sheet for meds is Premium.'}
          </Text>
          <Field label="What was this visit" placeholder="Annual, vaccines, teeth" value={title} onChangeText={setTitle} />
          <View style={styles.actions}>
            <Button label="Photo" icon="camera" onPress={upload} loading={busy} disabled={!dog} style={{ flex: 1 }} />
            <Button label="File" icon="document" kind="secondary" onPress={uploadFile} loading={busy} disabled={!dog} style={{ flex: 1 }} />
          </View>
          {reading ? (
            <Text variant="caption" tone="secondary">
              Reading the sheet for medications and meal times.
            </Text>
          ) : null}
          {!isPremium ? <Button label="Unlock sheet reading with Premium" icon="sparkle" kind="ghost" onPress={() => router.push({ pathname: '/paywall', params: { from: 'sheet-meds' } })} /> : null}
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
                <Tap key={v.id} onPress={() => router.push({ pathname: '/(app)/photo/[id]', params: { id: v.id } })} haptic="selection">
                  <View style={styles.visit}>
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
                    <Icon name="chevron" size={14} color={t.textTertiary} />
                  </View>
                </Tap>
              ))}
            </View>
          ) : (
            <Text variant="caption" tone="tertiary">
              Nothing uploaded yet.
            </Text>
          )}
        </Surface>
      </Section>

      <Tap onPress={() => router.push('/(app)/dog/edit')} haptic="selection">
        <Text variant="label" tone="brand" align="center">
          Something missing? Edit the profile
        </Text>
      </Tap>

      <Section title="Who sees what">
        <Surface kind="grouped" padding={0} style={{ overflow: 'hidden' }}>
          {ROLES.map((r, i) => (
            <View key={r.title} style={[styles.role, i < ROLES.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.border }]}>
              <View style={[styles.roleIcon, { backgroundColor: t.surfaceStrong }]}>
                <Icon name={r.icon} size={16} color={t.brand} />
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="bodyStrong">{r.title}</Text>
                <Text variant="caption" tone="secondary">
                  {r.sees}
                </Text>
              </View>
            </View>
          ))}
        </Surface>
        <Text variant="caption" tone="tertiary">
          Send the sheet to whoever has {dog?.name ?? 'your dog'} today. It is built from the profile, so it is always current.
        </Text>
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
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
});
