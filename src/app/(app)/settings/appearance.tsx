import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Icon, type IconName } from '@/components/ui/Icon';
import { Screen, ScreenHeader } from '@/components/ui/Screen';
import { Surface } from '@/components/ui/Surface';
import { Tap } from '@/components/ui/Tap';
import { Text } from '@/components/ui/Text';
import { usePreferences, type Appearance } from '@/lib/preferences';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space, themes } from '@/theme/tokens';

const OPTIONS: { id: Appearance; label: string; detail: string; icon: IconName }[] = [
  { id: 'system', label: 'Match device', detail: 'Follows your iPhone setting', icon: 'refresh' },
  { id: 'light', label: 'Light', detail: 'Cream paper, cocoa ink', icon: 'sun' },
  { id: 'dark', label: 'Dark', detail: 'Espresso, gold, and fur', icon: 'cloud' },
];

export default function AppearanceScreen() {
  const t = useTheme();
  const router = useRouter();
  const prefs = usePreferences();
  return (
    <Screen>
      <ScreenHeader eyebrow="Settings" title="Appearance" onBack={() => router.back()} large={false} />
      <View style={{ gap: space.sm }}>
        {OPTIONS.map((o) => {
          const on = prefs.appearance === o.id;
          const preview = o.id === 'dark' ? themes.dark : o.id === 'light' ? themes.light : t;
          return (
            <Tap key={o.id} onPress={() => prefs.setAppearance(o.id)} haptic="selection" accessibilityRole="radio" accessibilityState={{ selected: on }}>
              <Surface kind="raised" style={[styles.row, on && { borderWidth: 2, borderColor: t.brand }]}>
                <View style={[styles.swatch, { backgroundColor: preview.bg, borderColor: preview.border }]}>
                  <View style={[styles.swatchBar, { backgroundColor: preview.brand }]} />
                  <View style={[styles.swatchDot, { backgroundColor: preview.accent }]} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text variant="bodyStrong">{o.label}</Text>
                  <Text variant="caption" tone="secondary">
                    {o.detail}
                  </Text>
                </View>
                <Icon name={on ? 'check' : o.icon} size={18} color={on ? t.brand : t.textTertiary} />
              </Surface>
            </Tap>
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  swatch: { width: 52, height: 40, borderRadius: radius.xs, borderWidth: StyleSheet.hairlineWidth, padding: 6, justifyContent: 'space-between' },
  swatchBar: { height: 8, borderRadius: 4, width: '70%' },
  swatchDot: { width: 10, height: 10, borderRadius: 5, alignSelf: 'flex-end' },
});
