import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, type IconName } from '@/components/ui/Icon';
import { Tap } from '@/components/ui/Tap';
import { useTheme } from '@/theme/ThemeProvider';

const SIZE = 80;

type Props = {
  icon?: IconName;
  label?: string;
  onPress?: () => void;
};

/** Half-moon sits on the top edge of the tab bar. */
export function LookOrb({ icon = 'sparkle', label, onPress }: Props) {
  const t = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View pointerEvents="box-none" style={[styles.clip, { bottom: insets.bottom }]}>
      <Tap
        onPress={onPress ?? (() => router.push('/(app)/look'))}
        haptic="medium"
        style={[styles.orb, { backgroundColor: t.brand, borderColor: t.bg }]}
        accessibilityLabel={label ?? 'Look at a photo of your dog'}>
        <Icon name={icon} size={22} color={t.onBrand} />
      </Tap>
    </View>
  );
}

const styles = StyleSheet.create({
  clip: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: SIZE / 2 + 4,
    alignItems: 'center',
    overflow: 'hidden',
    zIndex: 80,
    elevation: 80,
  },
  orb: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    alignItems: 'center',
    paddingTop: 14,
    borderWidth: 3,
  },
});
