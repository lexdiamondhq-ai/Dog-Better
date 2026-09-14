import { type PropsWithChildren, type ReactNode, type Ref } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View, type ScrollViewProps } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from './Icon';
import { Tap } from './Tap';
import { Text } from './Text';
import { useTheme } from '@/theme/ThemeProvider';
import { CONTENT_INSET_END, space } from '@/theme/tokens';

type Props = PropsWithChildren<{
  /** Leave room on the trailing edge for the Paw Rail (true on top-level destinations). */
  rail?: boolean;
  scroll?: boolean;
  padded?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  contentContainerStyle?: ScrollViewProps['contentContainerStyle'];
  keyboardShouldPersistTaps?: ScrollViewProps['keyboardShouldPersistTaps'];
  scrollRef?: Ref<ScrollView>;
  /** Pinned below the scroll view, above the home indicator. For primary CTAs that must stay reachable. */
  footer?: ReactNode;
}>;

export function Screen({
  children,
  rail = false,
  scroll = true,
  padded = true,
  refreshing,
  onRefresh,
  contentContainerStyle,
  keyboardShouldPersistTaps,
  scrollRef,
  footer,
}: Props) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const paddingRight = padded ? (rail ? CONTENT_INSET_END : space.xl) : 0;
  const paddingLeft = padded ? space.xl : 0;

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
        keyboardShouldPersistTaps={keyboardShouldPersistTaps}
        contentInsetAdjustmentBehavior="never"
        showsVerticalScrollIndicator={false}
        refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={t.brand} /> : undefined}
        contentContainerStyle={[
          { paddingTop: insets.top + space.md, paddingBottom: footer ? space.lg : insets.bottom + space.xxxl, paddingLeft, paddingRight, gap: space.lg },
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
};

/** Titles are set in the display face, big and low-tension, and slide up with the content. */
export function ScreenHeader({ title, eyebrow, subtitle, onBack, trailing, large = true }: HeaderProps) {
  const t = useTheme();
  return (
    <Animated.View entering={FadeInDown.duration(420).springify().damping(18)} style={styles.header}>
      {onBack ? (
        <Tap onPress={onBack} haptic="selection" style={[styles.back, { backgroundColor: t.surface }]} accessibilityLabel="Back">
          <Icon name="back" size={18} />
        </Tap>
      ) : null}
      <View style={styles.headerText}>
        {eyebrow ? (
          <Text variant="overline" tone="tertiary">
            {eyebrow}
          </Text>
        ) : null}
        <Text variant={large ? 'display' : 'title'}>{title}</Text>
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
        <Text variant="overline" tone="tertiary">
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
  back: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  section: { gap: space.sm },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
