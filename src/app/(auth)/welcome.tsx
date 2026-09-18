import * as AppleAuthentication from 'expo-apple-authentication';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { OnboardingMascot } from '@/components/brand/OnboardingMascot';
import { Icon, type IconName } from '@/components/ui/Icon';
import { Tap } from '@/components/ui/Tap';
import { Text } from '@/components/ui/Text';
import { humanizeError } from '@/lib/errors';
import { DEV_LOGIN, ProviderUnavailableError, signInAsDevUser, signInWithApple, signInWithGoogle } from '@/lib/signIn';
import { useTheme } from '@/theme/ThemeProvider';
import { palette, radius, space } from '@/theme/tokens';

/**
 * First thing you see. A cartoon stoop and a pup who cycles tricks. Sign-in stays at the bottom.
 */
export default function Welcome() {
  const t = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { preview } = useLocalSearchParams<{ preview?: string }>();
  const previewing = preview === '1';
  const [play, setPlay] = useState(0);
  const [busy, setBusy] = useState<'apple' | 'google' | 'dev' | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [appleAvailable, setAppleAvailable] = useState(false);
  const night = t.scheme === 'dark';

  useEffect(() => {
    if (Platform.OS === 'ios') AppleAuthentication.isAvailableAsync().then(setAppleAvailable);
  }, []);

  useFocusEffect(
    useCallback(() => {
      setPlay((n) => n + 1);
    }, []),
  );

  const run = async (which: 'apple' | 'google' | 'dev') => {
    setBusy(which);
    setNotice(null);
    try {
      if (which === 'dev') {
        await signInAsDevUser();
        return;
      }
      const result = which === 'apple' ? await signInWithApple() : await signInWithGoogle();
      if (result.cancelled) return;
    } catch (e) {
      if (e instanceof ProviderUnavailableError) setNotice(`${which === 'apple' ? 'Apple' : 'Google'} sign-in is unavailable right now. Continue with email instead.`);
      else setNotice(humanizeError(e, 'Could not sign you in. Try again.'));
    } finally {
      setBusy(null);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: night ? palette.night : t.bg }}>
      <StatusBar style={night ? 'light' : 'dark'} />
      <LinearGradient
        colors={night ? [palette.espressoDeep, palette.night, '#0A0705'] : [palette.amberLight, t.furLight, t.bg]}
        locations={[0, 0.38, 1]}
        style={StyleSheet.absoluteFill}
      />
      <Animated.View entering={FadeIn.duration(900)} style={styles.glow} pointerEvents="none">
        <LinearGradient colors={[night ? 'rgba(242,168,29,0.42)' : 'rgba(242,168,29,0.38)', 'rgba(242,168,29,0)']} style={styles.glowInner} />
      </Animated.View>
      <Animated.View entering={FadeIn.duration(700)} style={styles.pawLeft} pointerEvents="none">
        <Image source={require('@/assets/brand/paw-left.png')} style={{ width: 220, height: 220, opacity: night ? 0.16 : 0.42 }} />
      </Animated.View>
      <Animated.View entering={FadeIn.duration(800).delay(120)} style={styles.pawRight} pointerEvents="none">
        <Image source={require('@/assets/brand/paw-right.png')} style={{ width: 180, height: 180, opacity: night ? 0.14 : 0.36 }} />
      </Animated.View>

      <View style={[styles.root, { paddingTop: insets.top + space.md, paddingBottom: insets.bottom + space.lg }]}>
        {previewing ? (
          <Tap onPress={() => router.back()} haptic="selection" style={[styles.back, { backgroundColor: t.surface }]} accessibilityLabel="Back">
            <Icon name="back" size={18} />
          </Tap>
        ) : (
          <View style={styles.back} />
        )}

        <View style={styles.hero}>
          <View style={styles.lockup}>
            <OnboardingMascot key={play} cycle size="lg" labeled />
            <Animated.View entering={FadeInDown.duration(320).delay(1500)}>
              <Image
                source={require('@/assets/brand/wordmark-tagline.png')}
                style={styles.wordmark}
                contentFit="contain"
                tintColor={night ? palette.furLight : undefined}
              />
            </Animated.View>
            <Animated.View entering={FadeInDown.duration(320).delay(1650)}>
              <Text variant="body" tone="secondary" align="center">
                A cartoon pup walks in. Then a sit, a speak, and a flop.
              </Text>
            </Animated.View>
          </View>
        </View>

        {previewing ? (
          <Text variant="caption" tone="tertiary" align="center">
            This is the first-open screen. Sign-in waits under here for new people.
          </Text>
        ) : (
          <Animated.View entering={FadeInUp.duration(400).delay(1700)} style={styles.actions}>
            {appleAvailable ? <AuthButton icon="apple" label="Continue with Apple" onPress={() => run('apple')} busy={busy === 'apple'} disabled={busy !== null} look="dark" /> : null}
            <AuthButton icon="google" label="Continue with Google" onPress={() => run('google')} busy={busy === 'google'} disabled={busy !== null} look="light" />
            <AuthButton icon="mail" label="Continue with email" onPress={() => router.push('/(auth)/sign-in')} disabled={busy !== null} look="accent" />
            {notice ? (
              <Animated.View entering={FadeInUp}>
                <Text variant="caption" tone="warn" align="center">
                  {notice}
                </Text>
              </Animated.View>
            ) : null}
            <Text variant="caption" tone="tertiary" align="center">
              By continuing you agree to the Terms and Privacy Policy. Guidance here never replaces your vet.
            </Text>
            {DEV_LOGIN ? (
              <Tap onPress={() => run('dev')} disabled={busy !== null} haptic="selection" accessibilityLabel="Dev: sign in as QA" style={styles.devLink}>
                <Icon name="key" size={12} color={t.accentDeep} />
                <Text variant="caption" tone="accent">
                  {busy === 'dev' ? 'Signing in' : 'Dev build: skip to the QA account'}
                </Text>
              </Tap>
            ) : null}
          </Animated.View>
        )}
      </View>
    </View>
  );
}

function AuthButton({ icon, label, onPress, busy, disabled, look }: { icon: IconName | 'google'; label: string; onPress: () => void; busy?: boolean; disabled?: boolean; look: 'dark' | 'light' | 'accent' }) {
  const t = useTheme();
  const bg = { dark: palette.espresso, light: t.bgRaised, accent: t.accent }[look];
  const fg = { dark: palette.white, light: t.text, accent: t.onAccent }[look];
  return (
    <Tap
      onPress={onPress}
      disabled={disabled}
      haptic="medium"
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[styles.button, { backgroundColor: bg, opacity: busy ? 0.7 : 1, borderWidth: look === 'light' ? 1 : 0, borderColor: t.borderStrong }]}>
      <View style={styles.buttonIcon}>{icon === 'google' ? <GoogleMark /> : <Icon name={icon} size={20} color={fg} weight="bold" />}</View>
      <Text variant="headline" style={{ color: fg, flex: 1, textAlign: 'center' }}>
        {busy ? 'One moment' : label}
      </Text>
      <View style={styles.buttonIcon} />
    </Tap>
  );
}

function GoogleMark() {
  return (
    <View style={styles.g}>
      <Text style={styles.gText}>G</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: space.xl, overflow: 'visible' },
  back: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  glow: { position: 'absolute', top: -80, left: -60, right: -60, height: 460 },
  glowInner: { flex: 1, borderRadius: 300 },
  pawLeft: { position: 'absolute', left: -80, bottom: 200, transform: [{ rotate: '-14deg' }] },
  pawRight: { position: 'absolute', right: -70, top: 120, transform: [{ rotate: '18deg' }] },
  hero: { flex: 1, alignItems: 'center', justifyContent: 'center', overflow: 'visible' },
  lockup: { alignItems: 'center', gap: space.md, overflow: 'visible' },
  wordmark: { width: 300, height: 72 },
  actions: { gap: space.sm },
  button: { height: 56, borderRadius: radius.pill, flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.md },
  buttonIcon: { width: 32, alignItems: 'center', justifyContent: 'center' },
  devLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: space.sm },
  g: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  gText: { fontFamily: 'Manrope_800ExtraBold', fontSize: 15, color: '#4285F4', lineHeight: 18 },
});
