import { Fredoka_500Medium, Fredoka_600SemiBold, Fredoka_700Bold } from '@expo-google-fonts/fredoka';
import { Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold, Manrope_800ExtraBold } from '@expo-google-fonts/manrope';
import { useFonts } from 'expo-font';
import { Stack, useGlobalSearchParams, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import { space } from '@/theme/tokens';

import { AuthProvider, useAuth } from '@/lib/auth';
import { DogsProvider, useDogs } from '@/lib/dogs';
import { EntitlementsProvider, useEntitlements } from '@/lib/entitlements';
import { PointsProvider } from '@/lib/points';
import { PreferencesProvider } from '@/lib/preferences';
import { CirclesProvider } from '@/lib/circles';
import { InboxProvider } from '@/lib/inbox';
import { RemindersProvider } from '@/lib/reminders';
import { WalksProvider } from '@/lib/WalksProvider';
import { LevelUp } from '@/components/points/LevelUp';
import { PointsToast } from '@/components/points/PointsToast';
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
        <PreferencesProvider>
          <ThemeProvider>
            <AuthProvider>
              <DogsProvider>
                <EntitlementsProvider>
                  <PointsProvider>
                    <RemindersProvider>
                    <WalksProvider>
                    <CirclesProvider>
                      <InboxProvider>
                        <Gate />
                        <PointsToast />
                        <LevelUp />
                      </InboxProvider>
                    </CirclesProvider>
                    </WalksProvider>
                    </RemindersProvider>
                  </PointsProvider>
                </EntitlementsProvider>
              </DogsProvider>
            </AuthProvider>
          </ThemeProvider>
        </PreferencesProvider>
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
  const { dogs, loaded, offline, refresh } = useDogs();
  const ent = useEntitlements();
  const segments = useSegments();
  const params = useGlobalSearchParams<{ mode?: string | string[]; preview?: string | string[] }>();
  const router = useRouter();
  const addMode = (Array.isArray(params.mode) ? params.mode[0] : params.mode) === 'add';
  const previewWelcome = (Array.isArray(params.preview) ? params.preview[0] : params.preview) === '1';
  const [stalled, setStalled] = useState(false);

  const decided = ready && (!session || loaded) && ent.loaded;

  // Signed in, no network, and no cached roster: do not guess. Show a retry instead of onboarding.
  const waiting = !decided && ready && !!session;
  useEffect(() => {
    if (!waiting) return;
    const id = setTimeout(() => {
      setStalled(true);
      SplashScreen.hideAsync();
    }, 6000);
    return () => {
      clearTimeout(id);
      setStalled(false);
    };
  }, [waiting]);

  useEffect(() => {
    if (!decided) return;
    const root = segments[0];
    const inAuth = root === '(auth)';
    const inOnboarding = root === 'onboarding';
    const inPaywall = root === 'paywall';
    const addingAnother = inOnboarding && addMode;

    if (!session) {
      if (!inAuth) router.replace('/(auth)/welcome');
    } else if (dogs.length === 0) {
      if (!inOnboarding) router.replace('/onboarding');
    } else if (addingAnother) {
      // Household already has a dog and asked to add one. Stay on onboarding.
    } else if (inAuth && previewWelcome) {
      // Founder preview of the first-open welcome. Do not bounce to Today.
    } else if (inOnboarding || (inAuth && !ent.paywallSeen)) {
      // First dog just created: show the trial offer once, with Skip, before landing in the app.
      router.replace(ent.paywallSeen ? '/(app)/(tabs)/today' : { pathname: '/paywall', params: { from: 'onboarding' } });
    } else if (inAuth || (root === undefined && !inPaywall)) {
      router.replace('/(app)/(tabs)/today');
    }
    SplashScreen.hideAsync();
  }, [decided, session, dogs.length, segments, router, ent.paywallSeen, addMode, previewWelcome]);

  return (
    <>
      <StatusBar style={t.scheme === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: t.bg }, animation: 'fade' }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="(app)" />
        <Stack.Screen name="paywall" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
      </Stack>
      {stalled && !decided ? (
        <View style={[StyleSheet.absoluteFill, styles.offline, { backgroundColor: t.bg }]}>
          <Icon name="info" size={36} color={t.brand} />
          <Text variant="title" align="center">
            {offline ? 'You look offline' : 'Still connecting'}
          </Text>
          <Text variant="body" tone="secondary" align="center">
            Your dogs and records are safe in your account. Reconnect and try again.
          </Text>
          <Button label="Try again" onPress={() => void refresh()} />
        </View>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  offline: { alignItems: 'center', justifyContent: 'center', padding: space.xl, gap: space.md },
});
