import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Glass } from '@/components/ui/Glass';
import { Icon } from '@/components/ui/Icon';
import { Tap } from '@/components/ui/Tap';
import { Text } from '@/components/ui/Text';
import type { DogPhoto } from '@/lib/database.types';
import { signedVaultUrl } from '@/lib/media';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';

export default function PhotoDetail() {
  const t = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [photo, setPhoto] = useState<(DogPhoto & { url: string }) | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('dog_photos').select('*').eq('id', id).single();
      if (!data) return;
      setPhoto({ ...data, url: await signedVaultUrl(data.storage_path) });
    })();
  }, [id]);

  const remove = () => {
    if (!photo) return;
    Alert.alert('Delete this photo?', 'It will be removed from the vault for good.', [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await supabase.storage.from('vault').remove([photo.storage_path]);
          await supabase.from('dog_photos').delete().eq('id', photo.id);
          router.back();
        },
      },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <StatusBar style="light" />
      {photo ? (
        <Animated.View entering={FadeIn.duration(300)} style={StyleSheet.absoluteFill}>
          <Image source={{ uri: photo.url }} style={StyleSheet.absoluteFill} contentFit="contain" />
        </Animated.View>
      ) : null}
      <View style={[styles.top, { paddingTop: insets.top + space.sm }]}>
        <Tap onPress={() => router.back()} haptic="selection" accessibilityLabel="Close">
          <Glass borderRadius={22} style={styles.glassBtn}>
            <Icon name="close" size={18} />
          </Glass>
        </Tap>
        <Tap onPress={remove} haptic="medium" accessibilityLabel="Delete photo">
          <Glass borderRadius={22} style={styles.glassBtn}>
            <Icon name="trash" size={18} color={t.bad} />
          </Glass>
        </Tap>
      </View>
      {photo?.caption ? (
        <View style={[styles.captionWrap, { paddingBottom: insets.bottom + space.lg }]}>
          <Glass borderRadius={radius.lg} style={styles.caption}>
            <Text variant="body">{photo.caption}</Text>
            <Text variant="caption" tone="tertiary">
              {new Date(photo.created_at).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
            </Text>
          </Glass>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  top: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: space.lg },
  glassBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  captionWrap: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: space.lg },
  caption: { padding: space.lg, gap: space.xs },
});
