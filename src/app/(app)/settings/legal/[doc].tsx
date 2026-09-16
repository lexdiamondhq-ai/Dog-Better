import { useLocalSearchParams, useRouter } from 'expo-router';
import { View } from 'react-native';

import { Screen, ScreenHeader } from '@/components/ui/Screen';
import { Surface } from '@/components/ui/Surface';
import { Text } from '@/components/ui/Text';
import { LEGAL } from '@/content/legal';
import { space } from '@/theme/tokens';

export default function LegalScreen() {
  const router = useRouter();
  const { doc } = useLocalSearchParams<{ doc: string }>();
  const content = LEGAL[doc === 'terms' ? 'terms' : 'privacy'];
  return (
    <Screen>
      <ScreenHeader eyebrow={`Updated ${content.updated}`} title={content.title} onBack={() => router.back()} large={false} />
      <Surface kind="raised" style={{ gap: space.lg }}>
        {content.sections.map((s) => (
          <View key={s.heading} style={{ gap: space.xs }}>
            <Text variant="headline">{s.heading}</Text>
            <Text variant="body" tone="secondary">
              {s.body}
            </Text>
          </View>
        ))}
      </Surface>
    </Screen>
  );
}
