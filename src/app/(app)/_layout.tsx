import { Stack } from 'expo-router';

import { useTheme } from '@/theme/ThemeProvider';

/**
 * Feature screens push in from the right. Emergency is the exception: it rises from the bottom
 * as a modal, because it is a mode you enter, not a place you browse to.
 */
export default function AppLayout() {
  const t = useTheme();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: t.bg },
        animation: 'slide_from_right',
        gestureEnabled: true,
        fullScreenGestureEnabled: true,
      }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="scan" options={{ gestureEnabled: false, fullScreenGestureEnabled: false }} />
      <Stack.Screen name="emergency" options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }} />
    </Stack>
  );
}
