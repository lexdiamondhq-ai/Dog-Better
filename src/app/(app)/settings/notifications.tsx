import { useRouter } from 'expo-router';

import { Screen, ScreenHeader, Section } from '@/components/ui/Screen';
import { SettingsRow } from '@/components/ui/SettingsRow';
import { Surface } from '@/components/ui/Surface';
import { Text } from '@/components/ui/Text';
import { usePreferences, type NotificationPrefs } from '@/lib/preferences';

const ROWS: { key: keyof NotificationPrefs; label: string; detail: string }[] = [
  { key: 'checkIn', label: 'Daily check-in', detail: 'One morning nudge. Skipped automatically if you already logged.' },
  { key: 'medication', label: 'Medication', detail: 'Doses due and refill countdowns.' },
  { key: 'planChanges', label: 'Plan changes', detail: 'Only when the plan actually changes: weather, a flagged disruption, a new pattern.' },
  { key: 'symptomFollowUp', label: 'Symptom follow-ups', detail: 'A "how are they now?" 12 hours after you log something.' },
  { key: 'recalls', label: 'Recall alerts', detail: 'Safety notices for products you have saved.' },
];

/** Only relevant pushes exist here. There is no "marketing" or "tips" toggle because we do not send those. */
export default function Notifications() {
  const router = useRouter();
  const prefs = usePreferences();
  return (
    <Screen>
      <ScreenHeader eyebrow="Settings" title="Notifications" subtitle="Every push is tied to an action. Nothing promotional, ever." onBack={() => router.back()} large={false} />
      <Section title="Send me">
        <Surface kind="grouped" padding={0} style={{ overflow: 'hidden' }}>
          {ROWS.map((r, i) => (
            <SettingsRow key={r.key} icon="bell" label={r.label} detail={r.detail} toggle={{ value: prefs.notifications[r.key], onChange: (v) => prefs.setNotification(r.key, v) }} last={i === ROWS.length - 1} />
          ))}
        </Surface>
      </Section>
      <Text variant="caption" tone="tertiary">
        These preferences are saved on this phone now and take effect when push delivery ships. You will be asked for iOS permission at that point, not before.
      </Text>
    </Screen>
  );
}
