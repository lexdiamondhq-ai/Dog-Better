import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { Button } from '@/components/ui/Button';
import { VetSearch } from '@/components/dogs/VetSearch';
import { Chip } from '@/components/ui/Chip';
import { DateField } from '@/components/ui/DateField';
import { DogAvatar } from '@/components/ui/DogAvatar';
import { Field } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { Screen, ScreenHeader, Section } from '@/components/ui/Screen';
import { Surface } from '@/components/ui/Surface';
import { Tap } from '@/components/ui/Tap';
import { Text } from '@/components/ui/Text';
import { useAuth } from '@/lib/auth';
import { useDiscardGuard } from '@/lib/discardGuard';
import { useDogs } from '@/lib/dogs';
import { usePreferences } from '@/lib/preferences';
import { fromKg, parseWeightInput } from '@/lib/units';
import { humanizeError } from '@/lib/errors';
import { pickFromLibrary, uploadImage } from '@/lib/media';
import { publicMediaUrl, supabase } from '@/lib/supabase';
import { useTheme } from '@/theme/ThemeProvider';
import { space } from '@/theme/tokens';

const COMMON_ALLERGIES = ['Chicken', 'Beef', 'Dairy', 'Wheat', 'Soy', 'Egg', 'Lamb', 'Fish', 'Corn', 'Pollen', 'Fleas'];

export default function EditDog() {
  const t = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const { dog, refresh } = useDogs();
  const { weightUnit } = usePreferences();

  const [name, setName] = useState(dog?.name ?? '');
  const [breed, setBreed] = useState(dog?.breed ?? '');
  const [sex, setSex] = useState(dog?.sex === 'male' || dog?.sex === 'female' ? dog.sex : 'unknown');
  const [altered, setAltered] = useState<boolean | null>(dog?.altered ?? null);
  const [coat, setCoat] = useState(dog?.coat ?? '');
  const [weight, setWeight] = useState(dog?.weight_kg != null ? fromKg(Number(dog.weight_kg), weightUnit).toFixed(1) : '');
  const [birthdate, setBirthdate] = useState(dog?.birthdate ?? '');
  const [vetName, setVetName] = useState(dog?.vet_name ?? '');
  const [vetPhone, setVetPhone] = useState(dog?.vet_phone ?? '');
  const [microchip, setMicrochip] = useState(dog?.microchip ?? '');
  const [notes, setNotes] = useState(dog?.notes ?? '');
  const [allergies, setAllergies] = useState<string[]>(dog?.allergies ?? []);
  const [customAllergy, setCustomAllergy] = useState('');
  const avatar = dog?.avatar_url ?? null;
  const [avatarLocal, setAvatarLocal] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const allergyList = useMemo(() => Array.from(new Set([...allergies, ...COMMON_ALLERGIES])), [allergies]);

  const dirty =
    !saved &&
    (name !== (dog?.name ?? '') ||
      breed !== (dog?.breed ?? '') ||
      birthdate !== (dog?.birthdate ?? '') ||
      notes !== (dog?.notes ?? '') ||
      microchip !== (dog?.microchip ?? '') ||
      JSON.stringify(allergies) !== JSON.stringify(dog?.allergies ?? []));
  useDiscardGuard(dirty);

  const toggleAllergy = (a: string) => setAllergies((prev) => (prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]));

  const addCustom = () => {
    const v = customAllergy.trim();
    if (!v) return;
    if (!allergies.includes(v)) setAllergies((p) => [...p, v]);
    setCustomAllergy('');
  };

  const save = async () => {
    if (!dog || !user) return;
    if (name.trim().length < 1) {
      setNameError('Your dog needs a name.');
      return;
    }
    setSaving(true);
    setError(null);
    setNameError(null);
    try {
      let avatar_url = avatar;
      if (avatarLocal) {
        const path = await uploadImage({ bucket: 'media', userId: user.id, folder: 'avatars', uri: avatarLocal });
        avatar_url = publicMediaUrl(path);
      }
      const { error: err } = await supabase
        .from('dogs')
        .update({
          name: name.trim(),
          breed: breed.trim() || null,
          sex,
          altered,
          coat: coat.trim() || null,
          weight_kg: parseWeightInput(weight, weightUnit),
          birthdate: birthdate || null,
          vet_name: vetName.trim() || null,
          vet_phone: vetPhone.trim() || null,
          microchip: microchip.trim() || null,
          notes: notes.trim() || null,
          allergies,
          avatar_url,
        })
        .eq('id', dog.id);
      if (err) throw err;
      await refresh();
      setSaved(true);
      router.back();
    } catch (e) {
      setError(humanizeError(e, 'Could not save these changes.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen keyboardShouldPersistTaps="handled">
      <ScreenHeader eyebrow="Vault" title="Edit profile" onBack={() => router.back()} large={false} />

      <Animated.View entering={FadeInUp.delay(40).duration(260)} style={{ alignItems: 'center', gap: space.sm }}>
        <Tap
          onPress={async () => {
            try {
              const uri = await pickFromLibrary([1, 1]);
              if (uri) {
                setAvatarLocal(uri);
                setError(null);
              }
            } catch (e) {
              setError(humanizeError(e, 'Could not open that photo. Try another one.'));
            }
          }}
          haptic="selection"
          accessibilityLabel="Change photo">
          <View>
            <DogAvatar uri={avatarLocal ?? avatar} size={112} />
            <View style={[styles.editBadge, { backgroundColor: t.brand, borderColor: t.bg }]}>
              <Icon name="camera" size={14} color={t.onBrand} />
            </View>
          </View>
        </Tap>
        <Text variant="caption" tone="tertiary">
          Tap to change photo
        </Text>
      </Animated.View>

      <Section title="Basics">
        <Surface kind="grouped" style={{ gap: space.md }}>
          <Field
            label="Name"
            value={name}
            onChangeText={(v) => {
              setName(v);
              if (nameError) setNameError(null);
            }}
            autoCapitalize="words"
            error={nameError ?? undefined}
          />
          <Field label="Breed" value={breed} onChangeText={setBreed} placeholder="Mixed is a fine answer" autoCapitalize="words" />
          <View style={styles.chips}>
            {(['male', 'female', 'unknown'] as const).map((s) => (
              <Chip key={s} label={s === 'unknown' ? 'Prefer not to say' : s[0].toUpperCase() + s.slice(1)} selected={sex === s} onPress={() => setSex(s)} />
            ))}
          </View>
          <View style={styles.chips}>
            <Chip label={sex === 'female' ? 'Spayed' : 'Neutered'} selected={altered === true} onPress={() => setAltered(true)} />
            <Chip label="Intact" selected={altered === false} onPress={() => setAltered(false)} />
            <Chip label="Not sure" selected={altered == null} onPress={() => setAltered(null)} />
          </View>
          <Field label="Color and markings" value={coat} onChangeText={setCoat} placeholder="Black and tan, white chest" autoCapitalize="sentences" />
          <View style={styles.two}>
            <View style={{ flex: 1 }}>
              <Field label="Weight" value={weight} onChangeText={setWeight} keyboardType="decimal-pad" suffix={weightUnit} />
            </View>
            <View style={{ flex: 1.4 }}>
              <DateField label="Birthday" value={birthdate} onChange={setBirthdate} maximumDate={new Date()} hint="Leave blank if you do not know." />
            </View>
          </View>
        </Surface>
      </Section>

      <Section title="Allergies and sensitivities">
        <Surface kind="grouped" style={{ gap: space.md }}>
          <View style={styles.chips}>
            {allergyList.map((a) => (
              <Chip key={a} label={a} selected={allergies.includes(a)} onPress={() => toggleAllergy(a)} tone="warn" />
            ))}
          </View>
          <View style={styles.two}>
            <View style={{ flex: 1 }}>
              <Field placeholder="Add another" value={customAllergy} onChangeText={setCustomAllergy} onSubmitEditing={addCustom} returnKeyType="done" />
            </View>
            <Button label="Add" kind="secondary" onPress={addCustom} />
          </View>
          <Text variant="caption" tone="tertiary">
            The treat scanner flags these automatically.
          </Text>
        </Surface>
      </Section>

      <Section title="Care team">
        <Surface kind="grouped" style={{ gap: space.md }}>
          <Text variant="caption" tone="secondary">
            Search nearby clinics by zip, city, or your location.
          </Text>
          <VetSearch
            onPick={(v) => {
              setVetName(v.name);
              setVetPhone(v.phone ?? '');
            }}
          />
          <Field label="Vet" value={vetName} onChangeText={setVetName} placeholder="Clinic or doctor" autoCapitalize="words" />
          <Field label="Vet phone" value={vetPhone} onChangeText={setVetPhone} keyboardType="phone-pad" placeholder="+1 555 0100" />
          <Field label="Microchip" value={microchip} onChangeText={setMicrochip} placeholder="15 digit ID, letters ok" autoCapitalize="characters" autoCorrect={false} />
          <Field label="Notes" value={notes} onChangeText={setNotes} placeholder="Medications, quirks, what a sitter should know" multiline style={{ minHeight: 80 }} />
        </Surface>
      </Section>

      {error ? (
        <Text variant="caption" tone="bad">
          {error}
        </Text>
      ) : null}
      <Button label="Save changes" icon="check" onPress={save} loading={saving} size="lg" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  editBadge: { position: 'absolute', right: 2, bottom: 2, width: 30, height: 30, borderRadius: 15, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
  two: { flexDirection: 'row', gap: space.md, alignItems: 'flex-end' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
});
