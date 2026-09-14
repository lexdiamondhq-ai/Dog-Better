import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/theme/ThemeProvider';
import { space } from '@/theme/tokens';

const PILLARS = ['Translate barks', 'Check symptoms', 'Scan treats', 'Find safe spaces'];

export default function Welcome() {
  const t = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { backgroundColor: t.bg, paddingTop: insets.top + space.xxl, paddingBottom: insets.bottom + space.xl }]}>
      <Animated.View entering={FadeIn.duration(600)} style={styles.pawLeft}>
        <Image source={require('@/assets/brand/paw-left.png')} style={{ width: 220, height: 220, opacity: 0.55 }} />
      </Animated.View>
      <Animated.View entering={FadeIn.duration(600).delay(120)} style={styles.pawRight}>
        <Image source={require('@/assets/brand/paw-right.png')} style={{ width: 260, height: 260, opacity: 0.5 }} />
      </Animated.View>

      <View style={styles.hero}>
        <Animated.View entering={FadeInDown.duration(700).springify().damping(16)} style={styles.lockupWrap}>
          {t.scheme === 'dark' ? (
            // The espresso wordmark disappears on the night background, so in dark mode the
            // mascot stays full colour and the wordmark is re-inked in cream.
            <>
              <Image source={require('@/assets/brand/mascot.png')} style={styles.mascot} contentFit="contain" />
              <Image source={require('@/assets/brand/wordmark-tagline.png')} style={styles.wordmark} contentFit="contain" tintColor={t.brandDeep} />
            </>
          ) : (
            <Image source={require('@/assets/brand/lockup-stacked.png')} style={styles.lockup} contentFit="contain" />
          )}
        </Animated.View>

        <Animated.View entering={FadeInUp.duration(600).delay(300)} style={styles.pills}>
          {PILLARS.map((p, i) => (
            <Animated.View key={p} entering={FadeInUp.duration(500).delay(400 + i * 80)} style={[styles.pill, { backgroundColor: t.furLight }]}>
              <Text variant="label" tone="brand">
                {p}
              </Text>
            </Animated.View>
          ))}
        </Animated.View>
      </View>

      <Animated.View entering={FadeInUp.duration(600).delay(600)} style={styles.actions}>
        <Button label="Get started" size="lg" onPress={() => router.push({ pathname: '/(auth)/sign-in', params: { mode: 'signup' } })} />
        <Button label="I already have an account" kind="ghost" onPress={() => router.push({ pathname: '/(auth)/sign-in', params: { mode: 'signin' } })} />
        <Text variant="caption" tone="tertiary" align="center">
          Guidance in this app is general and never replaces your vet.
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: space.xl, overflow: 'hidden' },
  pawLeft: { position: 'absolute', left: -70, top: 90, transform: [{ rotate: '-12deg' }] },
  pawRight: { position: 'absolute', right: -90, bottom: 140, transform: [{ rotate: '14deg' }] },
  hero: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.xxl },
  lockupWrap: { alignItems: 'center', gap: space.md },
  lockup: { width: 300, height: 190 },
  mascot: { width: 170, height: 130 },
  wordmark: { width: 300, height: 72 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: space.sm, maxWidth: 320 },
  pill: { paddingHorizontal: space.md + 2, height: 34, borderRadius: 17, justifyContent: 'center' },
  actions: { gap: space.md },
});
