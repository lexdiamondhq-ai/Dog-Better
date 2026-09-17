import { useRouter } from 'expo-router';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DogAvatar } from '@/components/ui/DogAvatar';
import { Icon } from '@/components/ui/Icon';
import { Surface } from '@/components/ui/Surface';
import { Tap } from '@/components/ui/Tap';
import { Text } from '@/components/ui/Text';
import { useDogs } from '@/lib/dogs';
import { usePremiumGate } from '@/lib/gates';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';

type Props = { visible: boolean; onClose: () => void };

/**
 * Pick the active dog from the header avatar. Always offers "Add another" so a one-dog
 * household can find the second profile without hunting Settings.
 */
export function DogSwitcher({ visible, onClose }: Props) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { dog, dogs, setActiveDog } = useDogs();
  const gate = usePremiumGate();

  const pick = (id: string) => {
    setActiveDog(id);
    onClose();
  };

  const add = () => {
    onClose();
    gate.openAddDog();
  };

  const openProfile = () => {
    onClose();
    router.navigate('/(app)/(tabs)/profile');
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={[styles.backdrop, { backgroundColor: t.scrim }]} onPress={onClose}>
        <Pressable style={[styles.sheet, { paddingBottom: insets.bottom + space.md }]} onPress={(e) => e.stopPropagation()}>
          <Surface kind="raised" style={styles.card}>
            <Text variant="overline" tone="tertiary">
              Dog Better
            </Text>
            <Text variant="title">Who are we looking after?</Text>
            <Text variant="caption" tone="secondary">
              Each dog has their own plan, score, photos, and records. Tap a face to switch.
            </Text>

            <View style={styles.list}>
              {dogs.map((d) => {
                const active = d.id === dog?.id;
                return (
                  <Tap key={d.id} onPress={() => pick(d.id)} haptic="selection" style={[styles.row, { backgroundColor: active ? t.brand : t.surface }]}>
                    <DogAvatar uri={d.avatar_url} size={48} ring={active} />
                    <View style={{ flex: 1 }}>
                      <Text variant="headline" style={{ color: active ? t.onBrand : t.text }}>
                        {d.name}
                      </Text>
                      <Text variant="caption" style={{ color: active ? t.onBrand : t.textSecondary, opacity: active ? 0.8 : 1 }}>
                        {active ? 'Active profile' : d.breed ?? 'Tap to switch'}
                      </Text>
                    </View>
                    {active ? <Icon name="check" size={18} color={t.onBrand} /> : null}
                  </Tap>
                );
              })}

              <Tap onPress={add} haptic="medium" style={[styles.row, styles.add, { borderColor: t.border }]}>
                <View style={[styles.addIcon, { backgroundColor: t.furLight }]}>
                  <Icon name="plus" size={20} color={t.brand} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text variant="headline">Add another dog</Text>
                  <Text variant="caption" tone="secondary">
                    {gate.allows('multi_dog') ? 'Their own profile, meals, and Better Score' : 'Every dog in the house is part of Premium'}
                  </Text>
                </View>
              </Tap>
            </View>

            <Tap onPress={openProfile} haptic="selection">
              <Text variant="label" tone="brand" align="center">
                Open full profile
              </Text>
            </Tap>
          </Surface>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end' },
  sheet: { paddingHorizontal: space.lg },
  card: { gap: space.md, borderRadius: radius.xl },
  list: { gap: space.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.sm, paddingRight: space.md, borderRadius: radius.lg },
  add: { borderWidth: StyleSheet.hairlineWidth, padding: space.md },
  addIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
});
