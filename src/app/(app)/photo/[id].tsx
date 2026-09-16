import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { Glass } from '@/components/ui/Glass';
import { Icon } from '@/components/ui/Icon';
import { Tap } from '@/components/ui/Tap';
import { Text } from '@/components/ui/Text';
import type { DogPhoto } from '@/lib/database.types';
import { extOf, isImagePath, signedVaultUrl } from '@/lib/media';
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
    Alert.alert('Delete this record?', 'It will be removed from the vault for good.', [
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

  const image = photo ? isImagePath(photo.storage_path) : true;

  return (
    <View style={{ flex: 1, backgroundColor: image ? '#000' : t.bg }}>
      <StatusBar style={image ? 'light' : t.scheme === 'dark' ? 'light' : 'dark'} />
      {photo && image ? (
        <Animated.View entering={FadeIn.duration(300)} style={StyleSheet.absoluteFill}>
          <Image source={{ uri: photo.url }} style={StyleSheet.absoluteFill} contentFit="contain" />
        </Animated.View>
      ) : null}
      {photo && !image ? (
        <Animated.View entering={FadeIn.duration(240)} style={[styles.fileBody, { paddingTop: insets.top + 72 }]}>
          <View style={[styles.fileIcon, { backgroundColor: t.surface }]}>
            <Icon name="document" size={36} color={t.brand} />
          </View>
          <Text variant="title" align="center">
            {photo.caption ?? 'Visit file'}
          </Text>
          <Text variant="caption" tone="secondary" align="center">
            {extOf(photo.storage_path).toUpperCase() || 'FILE'}
          </Text>
          <Button label="Open file" icon="share" onPress={() => void WebBrowser.openBrowserAsync(photo.url)} />
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
      {photo?.caption && image ? (
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
  fileBody: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.xl, gap: space.md },
  fileIcon: { width: 80, height: 80, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
});
