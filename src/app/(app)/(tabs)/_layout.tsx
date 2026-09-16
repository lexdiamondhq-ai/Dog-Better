import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { useTheme } from '@/theme/ThemeProvider';
import { fonts } from '@/theme/tokens';

/**
 * The system tab bar, not a custom one. On iOS 26 that means Liquid Glass pinned to the bottom edge
 * that minimises as you scroll; on older iOS a translucent bar; on Android Material 3. Five tabs is
 * the platform maximum before iOS inserts "More", so Care team lives one tap inside Profile.
 */
export default function TabsLayout() {
  const t = useTheme();
  return (
    <NativeTabs
      tintColor={t.brand}
      iconColor={t.textTertiary}
      labelStyle={{ fontFamily: fonts.bodySemi, fontSize: 11, color: t.textTertiary }}
      minimizeBehavior="onScrollDown"
      disableTransparentOnScrollEdge={false}>
      <NativeTabs.Trigger name="today">
        <NativeTabs.Trigger.Icon sf={{ default: 'sun.horizon', selected: 'sun.horizon.fill' }} drawable="ic_today" />
        <NativeTabs.Trigger.Label>Today</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="track">
        <NativeTabs.Trigger.Icon sf={{ default: 'square.and.pencil', selected: 'square.and.pencil' }} drawable="ic_track" />
        <NativeTabs.Trigger.Label>Track</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="community">
        <NativeTabs.Trigger.Icon sf={{ default: 'person.3', selected: 'person.3.fill' }} drawable="ic_community" />
        <NativeTabs.Trigger.Label>Community</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="learn">
        <NativeTabs.Trigger.Icon sf={{ default: 'book', selected: 'book.fill' }} drawable="ic_learn" />
        <NativeTabs.Trigger.Label>Learn</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile">
        <NativeTabs.Trigger.Icon sf={{ default: 'pawprint', selected: 'pawprint.fill' }} drawable="ic_profile" />
        <NativeTabs.Trigger.Label>Profile</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
