import { Tabs } from 'expo-router/js-tabs';
import { useCallback, useMemo, useState } from 'react';
import { View } from 'react-native';
import { useSharedValue, withSpring } from 'react-native-reanimated';

import { PawRail } from '@/components/nav/PawRail';
import { QuickActionsTray } from '@/components/nav/QuickActionsTray';
import { QuickActionsContext, type QuickActionsApi } from '@/components/nav/quick-actions-context';
import { useTheme } from '@/theme/ThemeProvider';
import { springs } from '@/theme/tokens';

export default function TabsLayout() {
  const t = useTheme();
  const progress = useSharedValue(0);
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => {
    progress.set(withSpring(1, springs.soft));
    setIsOpen(true);
  }, [progress]);
  const close = useCallback(() => {
    progress.set(withSpring(0, springs.soft));
    setIsOpen(false);
  }, [progress]);
  const settle = useCallback((next: boolean) => setIsOpen(next), []);

  const api = useMemo<QuickActionsApi>(() => ({ progress, isOpen, open, close, settle }), [progress, isOpen, open, close, settle]);

  return (
    <QuickActionsContext.Provider value={api}>
      <View style={{ flex: 1, backgroundColor: t.bg }}>
        {/* No scene transition on purpose: Liquid Glass views that mount while an ancestor is fading in never attach their effect. */}
        <Tabs
          tabBar={(props) => <PawRail {...props} />}
          screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: t.bg }, animation: 'none', lazy: true }}>
          <Tabs.Screen name="today" />
          <Tabs.Screen name="care" />
          <Tabs.Screen name="places" />
          <Tabs.Screen name="pack" />
          <Tabs.Screen name="vault" />
        </Tabs>
        <QuickActionsTray />
      </View>
    </QuickActionsContext.Provider>
  );
}
