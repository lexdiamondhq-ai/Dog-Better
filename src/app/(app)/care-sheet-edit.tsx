import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { VetSearch } from '@/components/dogs/VetSearch';
import { Chip } from '@/components/ui/Chip';
import { Field } from '@/components/ui/Field';
import { Screen, ScreenHeader, Section } from '@/components/ui/Screen';
import { Surface } from '@/components/ui/Surface';
import { Text } from '@/components/ui/Text';
import { useAuth } from '@/lib/auth';
import { useDogs } from '@/lib/dogs';
import { humanizeError } from '@/lib/errors';
import { usePreferences } from '@/lib/preferences';
import { fromKg, parseWeightInput } from '@/lib/units';
import { supabase } from '@/lib/supabase';
import { space } from '@/theme/tokens';

const COMMON_ALLERGIES = ['Chicken', 'Beef', 'Dairy', 'Wheat', 'Soy', 'Egg', 'Lamb', 'Fish', 'Corn', 'Pollen', 'Fleas', 'Grapes', 'Chocolate'];
const SEX: { id: 'male' | 'female' | 'unknown'; label: string }[] = [
  { id: 'male', label: 'Male' },
  { id: 'female', label: 'Female' },
  { id: 'unknown', label: 'Prefer not to say' },
];

/**
 * Walks through every field that lands on the sitter sheet. Saving writes the profile,
 * so Send on the care sheet stays current.
 */
export default function CareSheetEdit() {
  const router = useRouter();
  const { user } = useAuth();
  const { dog, refresh } = useDogs();
  const { weightUnit } = usePreferences();

  const [name, setName] = useState(dog?.name ?? '');
  const [breed, setBreed] = useState(dog?.breed ?? '');
  const [sex, setSex] = useState(dog?.sex === 'male' || dog?.sex === 'female' ? dog.sex : 'unknown');
  const [weight, setWeight] = useState(dog?.weight_kg != null ? fromKg(Number(dog.weight_kg), weightUnit).toFixed(1) : '');
  const [allergies, setAllergies] = useState<string[]>(dog?.allergies ?? []);
  const [customAllergy, setCustomAllergy] = useState('');
  const [notes, setNotes] = useState(dog?.notes ?? '');
  const [vetName, setVetName] = useState(dog?.vet_name ?? '');
  const [vetPhone, setVetPhone] = useState(dog?.vet_phone ?? '');
  const [microchip, setMicrochip] = useState(dog?.microchip ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      setError('The sheet needs their name at the top.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const { error: err } = await supabase
        .from('dogs')
        .update({
          name: name.trim(),
          breed: breed.trim() || null,
          sex,
          weight_kg: parseWeightInput(weight, weightUnit),
          allergies,
          notes: notes.trim() || null,
          vet_name: vetName.trim() || null,
          vet_phone: vetPhone.trim() || null,
          microchip: microchip.trim() || null,
        })
        .eq('id', dog.id);
      if (err) throw err;
      await refresh();
      router.back();
    } catch (e) {
      setError(humanizeError(e, 'Could not save the sheet.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen keyboardShouldPersistTaps="handled">
      <ScreenHeader
        title="Edit care sheet"
        subtitle="Five stops. Each one is a block the sitter will read."
        onBack={() => router.back()}
        large={false}
      />

      <Section title="1. Who they are">
        <Surface kind="grouped" style={{ gap: space.md }}>
          <Text variant="caption" tone="secondary">
            Name, breed, and sex sit at the top of the sheet so a new person can introduce themselves.
          </Text>
          <Field label="Name" value={name} onChangeText={setName} autoCapitalize="words" />
          <Field label="Breed" value={breed} onChangeText={setBreed} placeholder="Mixed is a fine answer" autoCapitalize="words" />
          <View style={styles.chips}>
            {SEX.map((s) => (
              <Chip key={s.id} label={s.label} selected={sex === s.id} onPress={() => setSex(s.id)} />
            ))}
          </View>
        </Surface>
      </Section>

      <Section title="2. Feeding">
        <Surface kind="grouped" style={{ gap: space.md }}>
          <Text variant="caption" tone="secondary">
            Weight sets the daily calorie line and the treat budget. Amounts and times go in Good to know below.
          </Text>
          <Field label="Weight" value={weight} onChangeText={setWeight} keyboardType="decimal-pad" suffix={weightUnit} />
        </Surface>
      </Section>

      <Section title="3. Do not give">
        <Surface kind="grouped" style={{ gap: space.md }}>
          <Text variant="caption" tone="secondary">
            Allergies and anything they must never eat. The treat scanner uses this list too.
          </Text>
          <View style={styles.chips}>
            {Array.from(new Set([...COMMON_ALLERGIES, ...allergies])).map((a) => (
              <Chip key={a} label={a} selected={allergies.includes(a)} onPress={() => toggleAllergy(a)} tone="warn" />
            ))}
          </View>
          <View style={styles.two}>
            <View style={{ flex: 1 }}>
              <Field placeholder="Add another" value={customAllergy} onChangeText={setCustomAllergy} onSubmitEditing={addCustom} returnKeyType="done" />
            </View>
            <Button label="Add" kind="secondary" onPress={addCustom} />
          </View>
        </Surface>
      </Section>

      <Section title="4. Medications and good to know">
        <Surface kind="grouped" style={{ gap: space.md }}>
          <Text variant="caption" tone="secondary">
            Quirks, harness, walking rules, meal amounts, and meds a sitter should see. A clinic visit photo on the care sheet can also pull meds onto this block.
          </Text>
          <Field
            label="Good to know"
            value={notes}
            onChangeText={setNotes}
            placeholder="Two cups at 7 and 5. Red harness. Do not greet dogs on leash. Rimadyl with dinner."
            multiline
            style={{ minHeight: 100 }}
          />
        </Surface>
      </Section>

      <Section title="5. Emergency">
        <Surface kind="grouped" style={{ gap: space.md }}>
          <Text variant="caption" tone="secondary">
            Clinic name, phone, and microchip. Your account email is added as the owner line automatically.
          </Text>
          <VetSearch
            onPick={(v) => {
              setVetName(v.name);
              setVetPhone(v.phone ?? '');
            }}
          />
          <Field label="Vet" value={vetName} onChangeText={setVetName} placeholder="Clinic or doctor" autoCapitalize="words" />
          <Field label="Vet phone" value={vetPhone} onChangeText={setVetPhone} keyboardType="phone-pad" placeholder="+1 555 0100" />
          <Field label="Microchip" value={microchip} onChangeText={setMicrochip} placeholder="15 digit ID" keyboardType="number-pad" />
        </Surface>
      </Section>

      {error ? (
        <Text variant="caption" tone="bad">
          {error}
        </Text>
      ) : null}
      <Button label="Save sheet" icon="check" onPress={save} loading={saving} size="lg" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  two: { flexDirection: 'row', gap: space.md, alignItems: 'flex-end' },
});
