import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Linking } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Screen, ScreenHeader, Section } from '@/components/ui/Screen';
import { SettingsRow } from '@/components/ui/SettingsRow';
import { Surface } from '@/components/ui/Surface';
import { Text } from '@/components/ui/Text';
import { notificationsAllowed, requestNotifications } from '@/lib/notify';
import { usePreferences, type NotificationPrefs } from '@/lib/preferences';

/** Only toggles that control a real delivery exist here. Both drive local notifications from the calendar. */
const ROWS: { key: keyof NotificationPrefs; label: string; detail: string }[] = [
  { key: 'medication', label: 'Medication', detail: 'A notification for every dose on the calendar, at the time it is due.' },
  { key: 'checkIn', label: 'Calendar reminders', detail: 'Meals, walks, vet visits, and anything else you put on the calendar.' },
];

export default function Notifications() {
  const router = useRouter();
  const prefs = usePreferences();
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    void notificationsAllowed().then(setAllowed);
  }, []);

  const enable = async () => {
    const ok = await requestNotifications();
    setAllowed(ok);
    if (!ok) void Linking.openSettings();
  };

  return (
    <Screen>
      <ScreenHeader eyebrow="Settings" title="Notifications" subtitle="Every notification is tied to something on the calendar. Nothing promotional, ever." onBack={() => router.back()} large={false} />
      <Section title="Send me">
        <Surface kind="grouped" padding={0} style={{ overflow: 'hidden' }}>
          {ROWS.map((r, i) => (
            <SettingsRow key={r.key} icon="bell" label={r.label} detail={r.detail} toggle={{ value: prefs.notifications[r.key], onChange: (v) => prefs.setNotification(r.key, v) }} last={i === ROWS.length - 1} />
          ))}
        </Surface>
      </Section>
      {allowed === false ? (
        <Surface kind="tonal" style={{ gap: 8 }}>
          <Text variant="bodyStrong">iOS is blocking notifications for Dog Better</Text>
          <Text variant="caption" tone="secondary">
            Doses and calendar items will still show in the app, but the phone will not ring for them until you allow it.
          </Text>
          <Button label="Allow notifications" kind="secondary" onPress={() => void enable()} />
        </Surface>
      ) : (
        <Text variant="caption" tone="tertiary">
          Reminders are scheduled on this phone from your calendar. They do not need an internet connection to fire.
        </Text>
      )}
    </Screen>
  );
}
