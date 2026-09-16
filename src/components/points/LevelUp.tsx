import { Image } from 'expo-image';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';

import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { usePoints } from '@/lib/points';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';

/** Full-screen welcome when the treat jar crosses a named rank. */
export function LevelUp() {
  const t = useTheme();
  const { lastLevelUp, clearLevelUp } = usePoints();
  if (!lastLevelUp) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={clearLevelUp}>
      <Pressable style={styles.scrim} onPress={clearLevelUp}>
        <Animated.View entering={FadeIn.duration(200)} style={StyleSheet.absoluteFill} />
        <Animated.View entering={ZoomIn.duration(320).springify()} style={[styles.card, { backgroundColor: t.bgRaised }]}>
          <View style={[styles.lamp, { backgroundColor: `${t.accent}33` }]}>
            <Image source={require('@/assets/brand/mascot.png')} style={styles.mascot} contentFit="contain" />
          </View>
          <Text variant="overline" tone="accent" align="center">
            New rank
          </Text>
          <Text variant="hero" align="center">
            {lastLevelUp.name}
          </Text>
          <Text variant="body" tone="secondary" align="center">
            Welcome to {lastLevelUp.name}. {lastLevelUp.line}
          </Text>
          <Button label="Keep going" onPress={clearLevelUp} kind="accent" size="lg" />
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: 'rgba(20,14,11,0.72)', alignItems: 'center', justifyContent: 'center', padding: space.xl },
  card: {
    width: '100%',
    maxWidth: 360,
    borderRadius: radius.xl,
    padding: space.xl,
    alignItems: 'center',
    gap: space.md,
  },
  lamp: { width: 160, height: 160, borderRadius: 80, alignItems: 'center', justifyContent: 'center' },
  mascot: { width: 140, height: 108 },
});
