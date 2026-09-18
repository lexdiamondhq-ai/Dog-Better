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
import { track } from '@/lib/analytics';
import { useAuth } from '@/lib/auth';
import { useDogs } from '@/lib/dogs';
import { usePremiumGate } from '@/lib/gates';
import { usePoints } from '@/lib/points';
import { forgetStoreIdentity, PLANS, trialDaysLeft, useEntitlements } from '@/lib/entitlements';
import { humanizeError } from '@/lib/errors';
import { exportAllData } from '@/lib/exportData';
import { wipeRemindersForUser } from '@/lib/reminders';
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
  const gate = usePremiumGate();
  const [busy, setBusy] = useState<'photo' | 'export' | 'delete' | 'restore' | null>(null);
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

  const deleteNow = async () => {
    if (!user) return;
    setBusy('delete');
    setNotice(null);
    try {
      const { data, error } = await supabase.functions.invoke<{ ok?: boolean; error?: string }>('delete-account', { method: 'POST' });
      if (error || !data?.ok) throw error ?? new Error(data?.error ?? 'delete_failed');
      void track('account_deleted');
      await wipeRemindersForUser(user.id);
      await forgetStoreIdentity();
      await supabase.auth.signOut();
    } catch (e) {
      setNotice(humanizeError(e, 'Could not delete the account. Try again, or email support and we will do it by hand.'));
    } finally {
      setBusy(null);
    }
  };

  const onDeleteAccount = () => {
    Alert.alert(
      'Delete your account?',
      `This permanently removes your account, every dog, log, photo, and post in it${ent.isPremium ? ', and it does not cancel your subscription. Cancel that in your Apple ID settings first' : ''}. It cannot be undone.`,
      [
        { text: 'Keep my account', style: 'cancel' },
        {
          text: 'Delete everything',
          style: 'destructive',
          onPress: () =>
            Alert.alert('Last check', 'Delete the account and all of its data now?', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Delete', style: 'destructive', onPress: () => void deleteNow() },
            ]),
        },
      ],
    );
  };

  const onRestore = async () => {
    setBusy('restore');
    setNotice(null);
    try {
      const ok = await ent.restore();
      setNotice(ok ? 'Premium restored.' : 'No active Dog Better subscription is on this Apple ID.');
    } catch (e) {
      setNotice(humanizeError(e, 'Could not reach the App Store.'));
    } finally {
      setBusy(null);
    }
  };

  const onSignOut = () => {
    Alert.alert('Sign out?', 'Your data stays safe in your account.', [
      { text: 'Stay', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: () => {
          void forgetStoreIdentity().finally(() => supabase.auth.signOut());
        },
      },
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
          <SettingsRow icon="plus" label="Add another dog" detail={gate.allows('multi_dog') ? 'New profile, own plan, own photos' : 'Every dog in the house is part of Premium'} onPress={gate.openAddDog} last />
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
                detail={
                  ent.entitlement.trial
                    ? `Then ${ent.offers[ent.entitlement.plan ?? 'yearly']?.priceString ?? PLANS[ent.entitlement.plan ?? 'yearly'].price} per ${PLANS[ent.entitlement.plan ?? 'yearly'].per}. ${ent.entitlement.willRenew ? 'Renews automatically.' : 'Will not renew.'}`
                    : `Medication reader, clinic pack, every dog, forty Looks a day, full Learn, no partner cards. ${ent.entitlement.willRenew ? 'Renews automatically.' : 'Ends at the period end.'}`
                }
              />
              <SettingsRow
                icon="link"
                label="Manage subscription"
                detail="Opens your Apple subscriptions"
                onPress={() => Linking.openURL(ent.entitlement.managementURL ?? 'https://apps.apple.com/account/subscriptions')}
                last={!__DEV__}
              />
              {__DEV__ ? <SettingsRow icon="refresh" label="Dev: show paywall again" onPress={() => ent.reset()} last /> : null}
            </>
          ) : (
            <>
              <SettingsRow
                icon="sparkle"
                label="Dog Better Premium"
                detail="Medication reader, clinic pack, every dog, forty Looks a day, full Learn, no partner cards"
                onPress={() => router.push({ pathname: '/paywall', params: { from: 'settings' } })}
              />
              <SettingsRow icon="refresh" label={busy === 'restore' ? 'Checking the App Store' : 'Restore purchase'} onPress={busy ? undefined : () => void onRestore()} last />
            </>
          )}
        </Surface>
        <Text variant="caption" tone="tertiary">
          Records, emergency mode, the care sheet, and community are free forever, on every plan.
        </Text>
      </Section>

      <Section title="Preferences">
        <Surface kind="grouped" padding={0} style={{ overflow: 'hidden' }}>
          <SettingsRow
            icon="paw"
            label="Watch the welcome walk-in"
            detail="The first-open pup, Apple and Google still hidden"
            onPress={() => router.push({ pathname: '/(auth)/welcome', params: { preview: '1' } })}
          />
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
          <SettingsRow icon="learn" label="Help center" detail="How the score, detective, and care sheet work" onPress={() => router.push('/(app)/settings/help')} />
          <SettingsRow icon="mail" label="Contact support" detail={SUPPORT_EMAIL} onPress={() => contactSupport()} />
          <SettingsRow icon="sparkle" label="Suggest a feature" detail="Tell us what would make Dog Better better" onPress={() => contactSupport('Feature idea for Dog Better')} last />
        </Surface>
      </Section>

      <Section title="Your data">
        <Surface kind="grouped" padding={0} style={{ overflow: 'hidden' }}>
          <SettingsRow icon="share" label={busy === 'export' ? 'Preparing export' : 'Export everything'} detail="All dogs, logs, records, walks, and posts as a file you own" onPress={busy ? undefined : onExport} />
          <SettingsRow icon="person" label="Blocked people" detail="Who you have hidden from Community and Barks" onPress={() => router.push('/(app)/settings/blocked' as Href)} />
          <SettingsRow icon="shield" label="Privacy policy" onPress={() => router.push({ pathname: '/(app)/settings/legal/[doc]', params: { doc: 'privacy' } })} />
          <SettingsRow icon="document" label="Terms of use" onPress={() => router.push({ pathname: '/(app)/settings/legal/[doc]', params: { doc: 'terms' } })} last />
        </Surface>
      </Section>

      <Section title="Account">
        <Surface kind="grouped" padding={0} style={{ overflow: 'hidden' }}>
          <SettingsRow icon="person" label="Signed in as" detail={user?.email ?? user?.id ?? ''} />
          <SettingsRow icon="logout" label="Sign out" onPress={onSignOut} />
          <SettingsRow
            icon="trash"
            label={busy === 'delete' ? 'Deleting your account' : 'Delete account'}
            detail="Removes every dog, log, photo, and post. Cannot be undone."
            tone="danger"
            onPress={busy ? undefined : onDeleteAccount}
            last
          />
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
