import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';

import { Chip } from '@/components/ui/Chip';
import { Icon } from '@/components/ui/Icon';
import { Screen, ScreenHeader, Section } from '@/components/ui/Screen';
import { GroupedList, Surface } from '@/components/ui/Surface';
import { Tap } from '@/components/ui/Tap';
import { Text } from '@/components/ui/Text';
import { AFFILIATE_DISCLOSURE, SHOP_CATEGORIES, type ShopCategory } from '@/content/partners';
import { track } from '@/lib/analytics';
import { useDogs } from '@/lib/dogs';
import { amazonSearch, shopForDog, sizeBand } from '@/lib/shop';
import { useTheme } from '@/theme/ThemeProvider';
import { space } from '@/theme/tokens';

export default function Shop() {
  const t = useTheme();
  const router = useRouter();
  const { dog } = useDogs();
  const [cat, setCat] = useState<ShopCategory | 'all'>('all');
  const links = useMemo(() => shopForDog(dog), [dog]);
  const shown = cat === 'all' ? links : links.filter((l) => l.category === cat);
  const size = sizeBand(dog?.weight_kg);

  return (
    <Screen>
      <ScreenHeader
        title="Shop"
        subtitle={dog ? `Picked for ${dog.name}${size !== 'any' ? `, ${size} size` : ''}. Opens Amazon.` : 'Opens Amazon.'}
        onBack={() => router.back()}
        large={false}
      />

      <View style={styles.chips}>
        {SHOP_CATEGORIES.map((c) => (
          <Chip key={c.id} label={c.label} selected={cat === c.id} onPress={() => setCat(c.id)} />
        ))}
      </View>

      <Section title="Amazon">
        <GroupedList>
          {shown.map((item, i) => (
            <Tap
              key={item.id}
              onPress={() => {
                void track('shop_click', { placement: 'shop', spot: item.id });
                void Linking.openURL(amazonSearch(item.query));
              }}
              haptic="selection">
              <View style={[styles.row, i < shown.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.border }]}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text variant="bodyStrong">{item.title}</Text>
                  <Text variant="caption" tone="secondary">
                    {item.why}
                  </Text>
                </View>
                <Icon name="link" size={16} color={t.brand} />
              </View>
            </Tap>
          ))}
        </GroupedList>
      </Section>

      <Surface kind="grouped" style={{ gap: space.xs }}>
        <Text variant="caption" tone="tertiary">
          {AFFILIATE_DISCLOSURE}
        </Text>
        <Text variant="caption" tone="tertiary">
          We do not see your cart. Scan a treat in the app before you feed something new.
        </Text>
      </Surface>
    </Screen>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingVertical: space.md },
});
