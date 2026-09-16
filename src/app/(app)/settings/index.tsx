import * as Application from 'expo-application';
import { useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import { Alert, Linking, StyleSheet, View } from 'react-native';

import { DogAvatar } from '@/components/ui/DogAvatar';
import { Icon } from '@/components/ui/Icon';
import { Screen, ScreenHeader, Section } from '@/components/ui/Screen';
import { SettingsRow } from '@/components/ui/SettingsRow';
import { Surface } from '@/components/ui/Surface';
import { Tap } from '@/components/ui/Tap';
import { Text } from '@/components/ui/Text';
import { useAuth } from '@/lib/auth';
import { ADD_DOG_HREF, useDogs } from '@/lib/dogs';
import { usePoints } from '@/lib/points';
import { PLANS, trialDaysLeft, useEntitlements } from '@/lib/entitlements';
import { humanizeError } from '@/lib/errors';
import { exportAllData } from '@/lib/exportData';
import { changeDogPhoto } from '@/lib/media';
import { usePreferences } from '@/lib/preferences';
import { supabase } from '@/lib/supabase';
import { contactSupport, SUPPORT_EMAIL } from '@/lib/support';
import { useTheme } from '@/theme/ThemeProvider';
import { space } from '@/theme/tokens';

const APPEARANCE_LABEL = { system: 'Match device', light: 'Light', dark: 'Dark' } as const;

export default function Settings() {
  const t = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const { dog, dogs, refresh, setActiveDog } = useDogs();
  const points = usePoints();
  const prefs = usePreferences();
  const ent = useEntitlements();
  const [busy, setBusy] = useState<'photo' | 'export' | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const onChangePhoto = async () => {
    if (!dog || !user) return;
    setBusy('photo');
    setNotice(null);
    try {
      const url = await changeDogPhoto(dog.id, user.id);
      if (url) await refresh();
    } catch (e) {
      setNotice(humanizeError(e, 'Could not update the photo.'));
    } finally {
      setBusy(null);
    }
  };

  const onExport = async () => {
    if (!user) return;
    setBusy('export');
    setNotice(null);
    try {
      await exportAllData(user.id, user.email);
    } catch (e) {
      setNotice(humanizeError(e, 'Could not build the export.'));
    } finally {
      setBusy(null);
    }
  };

  const onDeleteAccount = () => {
    Alert.alert('Delete your account?', 'This removes your account and every dog, log, and photo in it. We confirm by email before anything is deleted.', [
      { text: 'Keep my account', style: 'cancel' },
      { text: 'Request deletion', style: 'destructive', onPress: () => contactSupport('Delete my Dog Better account', `Account: ${user?.email ?? user?.id}`) },
    ]);
  };

  const onSignOut = () => {
    Alert.alert('Sign out?', 'Your data stays safe in your account.', [
      { text: 'Stay', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => supabase.auth.signOut() },
    ]);
  };

  const enabledPushes = Object.values(prefs.notifications).filter(Boolean).length;

  return (
    <Screen>
      <ScreenHeader title="Settings" onBack={() => router.back()} large={false} />

      {dog ? (
        <Surface kind="fur" style={styles.dogCard}>
          <Tap onPress={onChangePhoto} disabled={busy !== null} haptic="selection" accessibilityLabel="Change profile picture">
            <View>
              <DogAvatar uri={dog.avatar_url} size={72} />
              <View style={[styles.camBadge, { backgroundColor: t.brand, borderColor: t.furLight }]}>
                <Icon name="camera" size={12} color={t.onBrand} />
              </View>
            </View>
          </Tap>
          <View style={{ flex: 1, gap: 2 }}>
            <Text variant="title">{dog.name}</Text>
            <Text variant="caption" tone="secondary">
              {busy === 'photo' ? 'Uploading photo' : 'Tap the photo to change it. It shows on Today and Profile.'}
            </Text>
          </View>
          <Tap onPress={() => router.push('/(app)/dog/edit')} haptic="selection" style={[styles.editBtn, { backgroundColor: t.bgRaised }]} accessibilityLabel="Edit profile">
            <Icon name="edit" size={16} color={t.brand} />
          </Tap>
        </Surface>
      ) : null}

      <Section title="Dogs">
        <View style={styles.switcher}>
          {dogs.map((d) => (
            <Tap key={d.id} onPress={() => setActiveDog(d.id)} haptic="selection" style={[styles.dogChip, { backgroundColor: d.id === dog?.id ? t.brand : t.surface }]}>
              <DogAvatar uri={d.avatar_url} size={24} ring={false} />
              <Text variant="label" style={{ color: d.id === dog?.id ? t.onBrand : t.text }}>
                {d.name}
              </Text>
            </Tap>
          ))}
        </View>
        <Surface kind="grouped" padding={0} style={{ overflow: 'hidden' }}>
          <SettingsRow icon="plus" label="Add another dog" detail="New profile, own plan, own photos" onPress={() => router.push(ADD_DOG_HREF)} last />
        </Surface>
      </Section>

      <Section title="Treat jar">
        <Surface kind="grouped" padding={0} style={{ overflow: 'hidden' }}>
          <SettingsRow
            icon="sparkle"
            label={`${points.total.toLocaleString()} treats`}
            detail={`${points.today} today · walks, meals, photos, tips, community`}
            onPress={() => router.push('/(app)/settings/points' as Href)}
            last
          />
        </Surface>
      </Section>

      <Section title="Premium">
        <Surface kind="grouped" padding={0} style={{ overflow: 'hidden' }}>
          {ent.isPremium ? (
            <>
              <SettingsRow
                icon="sparkle"
                label={ent.entitlement.trial ? `Free trial, ${trialDaysLeft(ent.entitlement.expiresAt)} days left` : `Premium, ${ent.entitlement.plan === 'yearly' ? 'yearly' : 'monthly'}`}
                detail={ent.entitlement.trial ? `Then ${PLANS[ent.entitlement.plan ?? 'yearly'].price} per ${PLANS[ent.entitlement.plan ?? 'yearly'].per}. Cancel any time.` : 'Plan, detective insights, medication, vet PDF, all dogs, no ads.'}
              />
              <SettingsRow icon="link" label="Manage subscription" detail="Opens your Apple subscriptions" onPress={() => Linking.openURL('https://apps.apple.com/account/subscriptions')} last={!__DEV__} />
              {__DEV__ ? <SettingsRow icon="refresh" label="Dev: reset entitlement" tone="danger" onPress={() => ent.reset()} last /> : null}
            </>
          ) : (
            <>
              <SettingsRow icon="sparkle" label="Try Premium free for 7 days" detail="Adaptive plan, trick library, medication, clinic pack, every dog, no ads" onPress={() => router.push({ pathname: '/paywall', params: { from: 'settings' } })} />
              <SettingsRow icon="refresh" label="Restore purchase" onPress={() => ent.restore()} last />
            </>
          )}
        </Surface>
        <Text variant="caption" tone="tertiary">
          Records, emergency mode, the care sheet, and community are free forever, on every plan.
        </Text>
      </Section>

      <Section title="Preferences">
        <Surface kind="grouped" padding={0} style={{ overflow: 'hidden' }}>
          <SettingsRow icon="bell" label="Notifications" detail={`${enabledPushes} of ${Object.keys(prefs.notifications).length} on`} onPress={() => router.push('/(app)/settings/notifications')} />
          <SettingsRow icon="sun" label="Appearance" value={APPEARANCE_LABEL[prefs.appearance]} onPress={() => router.push('/(app)/settings/appearance')} />
          <SettingsRow
            icon="weight"
            label="Weight units"
            value={prefs.weightUnit === 'lb' ? 'Pounds' : 'Kilograms'}
            onPress={() => prefs.setWeightUnit(prefs.weightUnit === 'lb' ? 'kg' : 'lb')}
            last
          />
        </Surface>
      </Section>

      <Section title="Help">
        <Surface kind="grouped" padding={0} style={{ overflow: 'hidden' }}>
          <SettingsRow icon="sparkle" label="Welcome screen" detail="The cartoon first-open. Tap the pup to change tricks." onPress={() => router.push({ pathname: '/(auth)/welcome', params: { preview: '1' } })} />
          <SettingsRow icon="learn" label="Help center" detail="How the score, detective, and care sheet work" onPress={() => router.push('/(app)/settings/help')} />
          <SettingsRow icon="mail" label="Contact support" detail={SUPPORT_EMAIL} onPress={() => contactSupport()} />
          <SettingsRow icon="sparkle" label="Suggest a feature" detail="Tell us what would make Dog Better better" onPress={() => contactSupport('Feature idea for Dog Better')} last />
        </Surface>
      </Section>

      <Section title="Your data">
        <Surface kind="grouped" padding={0} style={{ overflow: 'hidden' }}>
          <SettingsRow icon="share" label={busy === 'export' ? 'Preparing export' : 'Export everything'} detail="All dogs, logs, and records as a file you own" onPress={busy ? undefined : onExport} />
          <SettingsRow icon="shield" label="Privacy policy" onPress={() => router.push({ pathname: '/(app)/settings/legal/[doc]', params: { doc: 'privacy' } })} />
          <SettingsRow icon="document" label="Terms of use" onPress={() => router.push({ pathname: '/(app)/settings/legal/[doc]', params: { doc: 'terms' } })} last />
        </Surface>
      </Section>

      <Section title="Account">
        <Surface kind="grouped" padding={0} style={{ overflow: 'hidden' }}>
          <SettingsRow icon="person" label="Signed in as" detail={user?.email ?? user?.id ?? ''} />
          <SettingsRow icon="logout" label="Sign out" onPress={onSignOut} />
          <SettingsRow icon="trash" label="Delete account" detail="Confirmed by email before anything is removed" tone="danger" onPress={onDeleteAccount} last />
        </Surface>
      </Section>

      {notice ? (
        <Text variant="caption" tone="bad" align="center">
          {notice}
        </Text>
      ) : null}

      <Text variant="caption" tone="tertiary" align="center">
        Dog Better {Application.nativeApplicationVersion ?? ''} ({Application.nativeBuildVersion ?? 'dev'})
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  dogCard: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  camBadge: { position: 'absolute', right: -2, bottom: -2, width: 26, height: 26, borderRadius: 13, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  editBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  switcher: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  dogChip: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingLeft: 6, paddingRight: space.md, height: 38, borderRadius: 999 },
});
