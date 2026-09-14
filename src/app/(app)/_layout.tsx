import { Stack } from 'expo-router';

import { useTheme } from '@/theme/ThemeProvider';

/**
 * Feature screens push in from the trailing edge, the same edge the Paw Rail lives on,
 * so the spatial model stays consistent: everything new arrives from the right.
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
    </Stack>
  );
}
