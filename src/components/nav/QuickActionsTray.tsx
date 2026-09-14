import { useRouter, type Href } from 'expo-router';
import { useMemo } from 'react';
import { Dimensions, Pressable, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { interpolate, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useQuickActions } from './quick-actions-context';
import { Glass } from '@/components/ui/Glass';
import { Icon, type IconName } from '@/components/ui/Icon';
import { Tap } from '@/components/ui/Tap';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space, springs } from '@/theme/tokens';

type Action = { icon: IconName; title: string; subtitle: string; href: Href; tint: 'brand' | 'accent' | 'good' | 'bad' | 'info' };

const ACTIONS: Action[] = [
  { icon: 'bark', title: 'Listen', subtitle: 'Translate a bark or whine', href: '/(app)/bark', tint: 'brand' },
  { icon: 'symptoms', title: 'Check', subtitle: 'Log a symptom, get guidance', href: '/(app)/symptoms', tint: 'bad' },
  { icon: 'scan', title: 'Scan', subtitle: 'Is this treat safe?', href: '/(app)/scan', tint: 'good' },
  { icon: 'camera', title: 'Snap', subtitle: 'Capture a moment', href: '/(app)/snap', tint: 'accent' },
  { icon: 'pack', title: 'Post', subtitle: 'Share with the pack', href: '/(app)/new-post', tint: 'info' },
];

/**
 * A glass tray that slides in from the trailing edge. It is the app's "do something now" surface,
 * reachable from anywhere in the main destinations with a single edge swipe.
 */
export function QuickActionsTray() {
  const t = useTheme();
  const qa = useQuickActions();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const width = Math.min(360, Dimensions.get('window').width * 0.8);

  const drag = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([10, 10])
        .onUpdate((e) => {
          qa.progress.set(Math.max(0, Math.min(1, 1 - e.translationX / width)));
        })
        .onEnd((e) => {
          const stayOpen = qa.progress.get() > 0.6 && e.velocityX < 500;
          qa.progress.set(withSpring(stayOpen ? 1 : 0, springs.soft));
          scheduleOnRN(qa.settle, stayOpen);
        }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [width],
  );

  const backdrop = useAnimatedStyle(() => ({ opacity: interpolate(qa.progress.value, [0, 1], [0, 0.42]) }));
  const panel = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(qa.progress.value, [0, 1], [width + 24, 0]) }],
  }));

  const go = (href: Href) => {
    qa.close();
    setTimeout(() => router.push(href), 80);
  };

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents={qa.isOpen ? 'auto' : 'none'}>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: t.espressoOverlay }, backdrop]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={qa.close} accessibilityLabel="Close quick actions" />
      </Animated.View>

      <GestureDetector gesture={drag}>
        <Animated.View style={[styles.panelWrap, { width, paddingTop: insets.top + space.md, paddingBottom: insets.bottom + space.lg }, panel]}>
          <Glass borderRadius={radius.xl} intensity={70} style={styles.panel}>
            <View style={styles.header}>
              <View>
                <Text variant="overline" tone="tertiary">
                  Quick actions
                </Text>
                <Text variant="title">Right now</Text>
              </View>
              <Tap onPress={qa.close} haptic="selection" style={[styles.close, { backgroundColor: t.surfaceStrong }]} accessibilityLabel="Close">
                <Icon name="close" size={16} />
              </Tap>
            </View>

            <View style={styles.list}>
              {ACTIONS.map((a, i) => (
                <ActionRow key={a.title} action={a} index={i} onPress={() => go(a.href)} />
              ))}
            </View>

            <Text variant="caption" tone="tertiary" style={styles.hint}>
              Tip: swipe in from the right edge of any screen to open this tray.
            </Text>
          </Glass>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

function ActionRow({ action, index, onPress }: { action: Action; index: number; onPress: () => void }) {
  const t = useTheme();
  const qa = useQuickActions();
  const tint = { brand: t.brand, accent: t.accent, good: t.good, bad: t.bad, info: t.info }[action.tint];
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(qa.progress.value, [0.3 + index * 0.08, 1], [0, 1], 'clamp'),
    transform: [{ translateX: interpolate(qa.progress.value, [0.3 + index * 0.08, 1], [40, 0], 'clamp') }],
  }));
  return (
    <Animated.View style={style}>
      <Tap onPress={onPress} haptic="medium" style={[styles.row, { backgroundColor: t.bgRaised, borderColor: t.border }]}>
        <View style={[styles.rowIcon, { backgroundColor: tint }]}>
          <Icon name={action.icon} size={22} color="#FFFDF8" />
        </View>
        <View style={{ flex: 1 }}>
          <Text variant="headline">{action.title}</Text>
          <Text variant="caption" tone="secondary">
            {action.subtitle}
          </Text>
        </View>
        <Icon name="chevron" size={16} color={t.textTertiary} />
      </Tap>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  panelWrap: { position: 'absolute', right: 0, top: 0, bottom: 0, paddingRight: space.sm, paddingLeft: 0 },
  panel: { flex: 1, padding: space.lg, gap: space.lg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md },
  close: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  list: { gap: space.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth },
  rowIcon: { width: 46, height: 46, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  hint: { marginTop: 'auto' },
});
