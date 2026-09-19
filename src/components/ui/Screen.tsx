import { type PropsWithChildren, type ReactNode, type Ref } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View, type ScrollViewProps } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from './Icon';
import { Tap } from './Tap';
import { Text } from './Text';
import { useTheme } from '@/theme/ThemeProvider';
import { space } from '@/theme/tokens';

type Props = PropsWithChildren<{
  /** True on tab destinations: content scrolls under the system tab bar, which reports itself through the bottom safe-area inset. */
  dock?: boolean;
  scroll?: boolean;
  padded?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  contentContainerStyle?: ScrollViewProps['contentContainerStyle'];
  keyboardShouldPersistTaps?: ScrollViewProps['keyboardShouldPersistTaps'];
  scrollRef?: Ref<ScrollView>;
  /** Pinned below the scroll view, above the home indicator. For primary CTAs that must stay reachable. */
  footer?: ReactNode;
  /** Let the first child paint under the status bar (Today portrait, camera, map). */
  flushTop?: boolean;
}>;

export function Screen({
  children,
  dock = false,
  scroll = true,
  padded = true,
  refreshing,
  onRefresh,
  contentContainerStyle,
  keyboardShouldPersistTaps,
  scrollRef,
  footer,
  flushTop = false,
}: Props) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const paddingRight = padded ? space.xl : 0;
  const paddingLeft = padded ? space.xl : 0;
  const bottomInset = insets.bottom + (dock ? space.xl : space.xxxl);

  if (!scroll) {
    return (
      <View style={[styles.fill, { backgroundColor: t.bg, paddingTop: insets.top, paddingLeft, paddingRight }]}>
        {children}
      </View>
    );
  }

  return (
    <View style={[styles.fill, { backgroundColor: t.bg }]}>
      <ScrollView
        ref={scrollRef}
        keyboardShouldPersistTaps={keyboardShouldPersistTaps ?? 'handled'}
        keyboardDismissMode="interactive"
        contentInsetAdjustmentBehavior="never"
        showsVerticalScrollIndicator={false}
        refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={t.brand} /> : undefined}
        contentContainerStyle={[
          { paddingTop: flushTop ? 0 : insets.top + space.md, paddingBottom: footer ? space.lg : bottomInset, paddingLeft, paddingRight, gap: space.lg },
          contentContainerStyle,
        ]}>
        {children}
      </ScrollView>
      {footer ? <View style={{ paddingTop: space.sm, paddingBottom: insets.bottom + space.sm, paddingLeft, paddingRight }}>{footer}</View> : null}
    </View>
  );
}

type HeaderProps = {
  title: string;
  eyebrow?: string;
  subtitle?: string;
  onBack?: () => void;
  trailing?: ReactNode;
  large?: boolean;
  /** Clinical drops the display face. Use on meds, emergency, clinic, and the care sheet. */
  voice?: 'playful' | 'clinical';
};

/** Titles are set in the display face, big and low-tension, and slide up with the content. */
export function ScreenHeader({ title, eyebrow, subtitle, onBack, trailing, large = true, voice = 'playful' }: HeaderProps) {
  const t = useTheme();
  const clinical = voice === 'clinical';
  return (
    <Animated.View entering={t.reduceMotion ? undefined : FadeInDown.duration(260)} style={styles.header}>
      {onBack ? (
        <Tap onPress={onBack} haptic="selection" style={[styles.back, { backgroundColor: t.surface }]} accessibilityLabel="Back">
          <Icon name="back" size={18} />
        </Tap>
      ) : null}
      <View style={styles.headerText}>
        {eyebrow ? (
          <Text variant="overline" tone="secondary">
            {eyebrow}
          </Text>
        ) : null}
        <Text variant={clinical ? (large ? 'clinical' : 'headline') : large ? 'display' : 'title'}>{title}</Text>
        {subtitle ? (
          <Text variant="body" tone="secondary">
            {subtitle}
          </Text>
        ) : null}
      </View>
      {trailing}
    </Animated.View>
  );
}

export function Section({ title, action, children }: PropsWithChildren<{ title: string; action?: ReactNode }>) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionRow}>
        <Text variant="overline" tone="secondary">
          {title}
        </Text>
        {action}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md, paddingBottom: space.xs },
  headerText: { flex: 1, gap: space.xs },
  back: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  section: { gap: space.sm },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
