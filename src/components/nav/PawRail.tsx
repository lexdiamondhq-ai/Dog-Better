import * as Haptics from 'expo-haptics';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { useEffect, useMemo } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { useQuickActions } from './quick-actions-context';
import { Glass } from '@/components/ui/Glass';
import { Icon, type IconName } from '@/components/ui/Icon';
import { Tap } from '@/components/ui/Tap';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/theme/ThemeProvider';
import { RAIL_GUTTER, RAIL_WIDTH, radius, space, springs } from '@/theme/tokens';

const ITEM = 46;
const GAP = 6;
const PAD = 7;
const EDGE_STRIP = 24;

const DESTINATIONS: Record<string, { icon: IconName; label: string }> = {
  today: { icon: 'today', label: 'Today' },
  care: { icon: 'care', label: 'Care' },
  places: { icon: 'places', label: 'Places' },
  pack: { icon: 'pack', label: 'Pack' },
  vault: { icon: 'vault', label: 'Vault' },
};

/**
 * The Paw Rail replaces the bottom tab bar with a vertical dock on the trailing edge, inside the
 * natural thumb arc. Tap to switch, drag along it to scrub between destinations, or pull it (or the
 * screen edge) leftwards to reveal Quick Actions. The active "puck" slides rather than snaps.
 */
export function PawRail({ state, navigation }: BottomTabBarProps) {
  const t = useTheme();
  const qa = useQuickActions();
  const routes = state.routes.filter((r) => DESTINATIONS[r.name]);
  const count = routes.length;
  const railHeight = PAD * 2 + count * ITEM + (count - 1) * GAP;

  const active = useSharedValue(state.index);
  const hover = useSharedValue(-1);
  const labelOpacity = useSharedValue(0);
  const labelIndex = useSharedValue(state.index);
  const lastHaptic = useSharedValue(-1);

  useEffect(() => {
    active.set(withSpring(state.index, springs.snappy));
    labelIndex.set(state.index);
    labelOpacity.set(withSequence(withTiming(1, { duration: 160 }), withDelay(1100, withTiming(0, { duration: 320 }))));
  }, [state.index, active, labelIndex, labelOpacity]);

  const goTo = (index: number) => {
    const route = routes[index];
    if (!route) return;
    Haptics.selectionAsync();
    const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
    if (!event.defaultPrevented) navigation.navigate(route.name);
  };

  const tick = () => {
    Haptics.selectionAsync();
  };

  const screenWidth = Dimensions.get('window').width;
  const trayWidth = Math.min(360, screenWidth * 0.8);

  const railGesture = useMemo(() => {
    const indexAt = (y: number) => {
      'worklet';
      return Math.max(0, Math.min(count - 1, Math.floor((y - PAD) / (ITEM + GAP))));
    };

    const tap = Gesture.Tap()
      .maxDuration(400)
      .onEnd((e) => {
        scheduleOnRN(goTo, indexAt(e.y));
      });

    const pan = Gesture.Pan()
      .activeOffsetX([-12, 12])
      .activeOffsetY([-10, 10])
      .onUpdate((e) => {
        const horizontal = Math.abs(e.translationX) > Math.abs(e.translationY) * 1.2;
        if (horizontal && e.translationX < 0) {
          qa.progress.set(Math.max(0, Math.min(1, -e.translationX / trayWidth)));
          return;
        }
        if (qa.progress.get() > 0) return;
        const idx = indexAt(e.y);
        if (hover.get() !== idx) {
          hover.set(idx);
          active.set(withSpring(idx, springs.snappy));
          labelIndex.set(idx);
          labelOpacity.set(withTiming(1, { duration: 120 }));
          if (lastHaptic.get() !== idx) {
            lastHaptic.set(idx);
            scheduleOnRN(tick);
          }
        }
      })
      .onEnd(() => {
        if (qa.progress.get() > 0) {
          const shouldOpen = qa.progress.get() > 0.35;
          qa.progress.set(withSpring(shouldOpen ? 1 : 0, springs.soft));
          scheduleOnRN(qa.settle, shouldOpen);
          return;
        }
        const target = hover.get();
        hover.set(-1);
        if (target >= 0 && target !== state.index) scheduleOnRN(goTo, target);
        else active.set(withSpring(state.index, springs.snappy));
        labelOpacity.set(withDelay(600, withTiming(0, { duration: 300 })));
      });

    return Gesture.Race(pan, tap);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count, state.index, trayWidth]);

  const edgePan = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-8, 8])
        .failOffsetY([-30, 30])
        .onUpdate((e) => {
          qa.progress.set(Math.max(0, Math.min(1, -e.translationX / trayWidth)));
        })
        .onEnd((e) => {
          const shouldOpen = qa.progress.get() > 0.35 || e.velocityX < -600;
          qa.progress.set(withSpring(shouldOpen ? 1 : 0, springs.soft));
          scheduleOnRN(qa.settle, shouldOpen);
        }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [trayWidth],
  );

  const puckStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: PAD + active.value * (ITEM + GAP) }],
  }));

  const railStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(qa.progress.value, [0, 1], [0, RAIL_WIDTH + RAIL_GUTTER + 20]) }],
    opacity: interpolate(qa.progress.value, [0, 0.6], [1, 0]),
  }));

  const labelName = useDerivedValue(() => routes[Math.round(labelIndex.value)]?.name ?? '');
  const labelStyle = useAnimatedStyle(() => ({
    opacity: labelOpacity.value,
    transform: [
      { translateY: PAD + labelIndex.value * (ITEM + GAP) + ITEM / 2 - 14 },
      { translateX: interpolate(labelOpacity.value, [0, 1], [8, 0]) },
    ],
  }));

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* Full-height edge strip: swipe in from the trailing edge anywhere to open Quick Actions. */}
      <GestureDetector gesture={edgePan}>
        <View style={styles.edgeStrip} />
      </GestureDetector>

      <View style={styles.center} pointerEvents="box-none">
        <Animated.View style={[styles.wrap, railStyle]} pointerEvents="box-none">
          <Animated.View style={[styles.labelWrap, labelStyle]} pointerEvents="none">
            <View style={[styles.label, { backgroundColor: t.brand }]}>
              {routes.map((r) => (
                <LabelLine key={r.key} name={r.name} current={labelName} />
              ))}
            </View>
          </Animated.View>

          <GestureDetector gesture={railGesture}>
            <Glass borderRadius={radius.xl} intensity={50} style={[styles.rail, { height: railHeight }]}>
              <Animated.View style={[styles.puck, { backgroundColor: t.brand }, puckStyle]} />
              {routes.map((route, index) => (
                <RailItem key={route.key} icon={DESTINATIONS[route.name].icon} label={DESTINATIONS[route.name].label} focused={state.index === index} active={active} index={index} />
              ))}
            </Glass>
          </GestureDetector>

          <Tap onPress={qa.open} haptic="medium" scaleTo={0.9} accessibilityRole="button" accessibilityLabel="Quick actions" style={[styles.plus, { backgroundColor: t.accent, shadowColor: t.shadow }]}>
            <Icon name="plus" size={22} color="#3A2A10" weight="bold" />
          </Tap>
        </Animated.View>
      </View>
    </View>
  );
}

function LabelLine({ name, current }: { name: string; current: SharedValue<string> }) {
  const style = useAnimatedStyle(() => ({
    opacity: current.value === name ? 1 : 0,
    position: current.value === name ? 'relative' : 'absolute',
  }));
  return (
    <Animated.View style={style}>
      <Text variant="label" tone="onBrand">
        {DESTINATIONS[name].label}
      </Text>
    </Animated.View>
  );
}

function RailItem({ icon, label, focused, active, index }: { icon: IconName; label: string; focused: boolean; active: SharedValue<number>; index: number }) {
  const t = useTheme();
  const wrap = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(Math.abs(active.value - index), [0, 1], [1.08, 1], 'clamp') }],
  }));
  const on = useAnimatedStyle(() => ({ opacity: interpolate(Math.abs(active.value - index), [0, 0.5], [1, 0], 'clamp') }));
  const off = useAnimatedStyle(() => ({ opacity: interpolate(Math.abs(active.value - index), [0, 0.5], [0, 1], 'clamp') }));

  return (
    <Animated.View accessibilityRole="tab" accessibilityLabel={label} accessibilityState={{ selected: focused }} style={[styles.item, wrap]}>
      <View style={styles.iconStack}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.iconCenter, off]}>
          <Icon name={icon} size={22} color={t.textSecondary} />
        </Animated.View>
        <Animated.View style={[StyleSheet.absoluteFill, styles.iconCenter, on]}>
          <Icon name={icon} size={22} color={t.onBrand} />
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  edgeStrip: { position: 'absolute', right: 0, top: 0, bottom: 0, width: EDGE_STRIP },
  center: { ...StyleSheet.absoluteFill, justifyContent: 'center', alignItems: 'flex-end', paddingTop: 60 },
  wrap: { alignItems: 'center', gap: space.sm, marginRight: RAIL_GUTTER, width: RAIL_WIDTH },
  rail: { width: RAIL_WIDTH - 4, paddingVertical: PAD, alignItems: 'center', gap: GAP },
  puck: { position: 'absolute', top: 0, left: (RAIL_WIDTH - 4 - ITEM) / 2, width: ITEM, height: ITEM, borderRadius: ITEM / 2 },
  item: { width: ITEM, height: ITEM, alignItems: 'center', justifyContent: 'center' },
  iconStack: { width: 24, height: 24 },
  iconCenter: { alignItems: 'center', justifyContent: 'center' },
  labelWrap: { position: 'absolute', right: RAIL_WIDTH + 2, top: 0 },
  label: { paddingHorizontal: space.md, height: 28, borderRadius: 14, justifyContent: 'center' },
  plus: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
});
