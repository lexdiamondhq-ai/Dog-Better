import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

type Props = { uri?: string | null; size?: number; ring?: boolean };

/** Falls back to the brand mascot so a dog without a photo still feels like *a dog*, not a placeholder. */
export function DogAvatar({ uri, size = 56, ring = true }: Props) {
  const t = useTheme();
  return (
    <View
      style={[
        styles.wrap,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: t.furLight,
          borderWidth: ring ? Math.max(2, size * 0.04) : 0,
          borderColor: t.bgRaised,
        },
      ]}>
      {uri ? (
        <Image source={{ uri }} style={{ width: '100%', height: '100%' }} contentFit="cover" transition={200} />
      ) : (
        <Image
          source={require('@/assets/brand/mascot.png')}
          style={{ width: '82%', height: '82%', marginTop: size * 0.06 }}
          contentFit="contain"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
});
