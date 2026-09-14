import { Fredoka_500Medium, Fredoka_600SemiBold, Fredoka_700Bold } from '@expo-google-fonts/fredoka';
import { Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold, Manrope_800ExtraBold } from '@expo-google-fonts/manrope';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider, useAuth } from '@/lib/auth';
import { DogsProvider, useDogs } from '@/lib/dogs';
import { ThemeProvider, useTheme } from '@/theme/ThemeProvider';

SplashScreen.preventAutoHideAsync();
SplashScreen.setOptions({ fade: true, duration: 350 });

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Fredoka_500Medium,
    Fredoka_600SemiBold,
    Fredoka_700Bold,
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
  });

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AuthProvider>
            <DogsProvider>
              <Gate />
            </DogsProvider>
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

/**
 * Routes the user to exactly one of three worlds: signed out, signed in without a dog,
 * or the app. Nothing renders until we know which, so there is never a flash of the wrong screen.
 */
function Gate() {
  const t = useTheme();
  const { session, ready } = useAuth();
  const { dogs, loaded } = useDogs();
  const segments = useSegments();
  const router = useRouter();

  const decided = ready && (!session || loaded);

  useEffect(() => {
    if (!decided) return;
    const root = segments[0];
    const inAuth = root === '(auth)';
    const inOnboarding = root === 'onboarding';

    if (!session) {
      if (!inAuth) router.replace('/(auth)/welcome');
    } else if (dogs.length === 0) {
      if (!inOnboarding) router.replace('/onboarding');
    } else if (inAuth || inOnboarding || root === undefined) {
      router.replace('/(app)/(tabs)/today');
    }
    SplashScreen.hideAsync();
  }, [decided, session, dogs.length, segments, router]);

  return (
    <>
      <StatusBar style={t.scheme === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: t.bg }, animation: 'fade' }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="(app)" />
      </Stack>
    </>
  );
}
