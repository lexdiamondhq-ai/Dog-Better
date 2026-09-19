import { useRouter } from 'expo-router';

import { ReminderCalendar } from '@/components/track/ReminderCalendar';
import { Screen, ScreenHeader } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useDogs } from '@/lib/dogs';

export default function CalendarScreen() {
  const router = useRouter();
  const { dog } = useDogs();

  return (
    <Screen>
      <ScreenHeader voice="clinical" title="Calendar" subtitle={dog ? `${dog.name}'s meds, walks, vet days` : 'Pick a dog first'} onBack={() => router.back()} />
      {dog ? (
        <ReminderCalendar dogId={dog.id} />
      ) : (
        <Text variant="body" tone="secondary">
          Add a dog to keep a calendar.
        </Text>
      )}
    </Screen>
  );
}
