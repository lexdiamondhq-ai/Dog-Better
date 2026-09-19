import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { VetSearch } from '@/components/dogs/VetSearch';
import { Chip } from '@/components/ui/Chip';
import { DateField } from '@/components/ui/DateField';
import { Field } from '@/components/ui/Field';
import { Screen, ScreenHeader, Section } from '@/components/ui/Screen';
import { Surface } from '@/components/ui/Surface';
import { Text } from '@/components/ui/Text';
import { mergeSheetReads, remindersFromSheet, sheetReadFromNotes, sheetShotsFromNotes, writeShotsBlock } from '@/engine/sheetMeds';
import { useAuth } from '@/lib/auth';
import { useDiscardGuard } from '@/lib/discardGuard';
import { useDogs } from '@/lib/dogs';
import { humanizeError } from '@/lib/errors';
import { usePreferences } from '@/lib/preferences';
import { useReminders } from '@/lib/reminders';
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
  const reminders = useReminders(dog?.id);
  const savedShots = sheetShotsFromNotes(dog?.notes ?? null).followUps;
  const shotDate = (needle: string) => savedShots.find((s) => s.title.toLowerCase().includes(needle))?.date ?? '';

  const [name, setName] = useState(dog?.name ?? '');
  const [breed, setBreed] = useState(dog?.breed ?? '');
  const [sex, setSex] = useState(dog?.sex === 'male' || dog?.sex === 'female' ? dog.sex : 'unknown');
  const [altered, setAltered] = useState<boolean | null>(dog?.altered ?? null);
  const [coat, setCoat] = useState(dog?.coat ?? '');
  const [birthdate, setBirthdate] = useState(dog?.birthdate ?? '');
  const [weight, setWeight] = useState(dog?.weight_kg != null ? fromKg(Number(dog.weight_kg), weightUnit).toFixed(1) : '');
  const [allergies, setAllergies] = useState<string[]>(dog?.allergies ?? []);
  const [customAllergy, setCustomAllergy] = useState('');
  const [notes, setNotes] = useState(dog?.notes ?? '');
  const [rabies, setRabies] = useState(shotDate('rabies'));
  const [dhpp, setDhpp] = useState(shotDate('dhpp') || shotDate('distemper'));
  const [bordetella, setBordetella] = useState(shotDate('bordetella') || shotDate('kennel'));
  const [vetName, setVetName] = useState(dog?.vet_name ?? '');
  const [vetPhone, setVetPhone] = useState(dog?.vet_phone ?? '');
  const [microchip, setMicrochip] = useState(dog?.microchip ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const allergyList = useMemo(() => Array.from(new Set([...allergies, ...COMMON_ALLERGIES])), [allergies]);
  const dirty =
    !saved &&
    (name !== (dog?.name ?? '') ||
      birthdate !== (dog?.birthdate ?? '') ||
      notes !== (dog?.notes ?? '') ||
      rabies !== shotDate('rabies') ||
      dhpp !== (shotDate('dhpp') || shotDate('distemper')) ||
      bordetella !== (shotDate('bordetella') || shotDate('kennel')));
  useDiscardGuard(dirty, 'Leave the care sheet?');

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
      setNameError('The sheet needs their name at the top.');
      return;
    }
    setSaving(true);
    setError(null);
    setNameError(null);
    try {
      const nextNotes = writeShotsBlock(notes.trim() || null, [
        { title: 'Rabies', date: rabies },
        { title: 'DHPP', date: dhpp },
        { title: 'Bordetella', date: bordetella },
      ]);
      const { error: err } = await supabase
        .from('dogs')
        .update({
          name: name.trim(),
          breed: breed.trim() || null,
          sex,
          altered,
          coat: coat.trim() || null,
          birthdate: birthdate || null,
          weight_kg: parseWeightInput(weight, weightUnit),
          allergies,
          notes: nextNotes,
          vet_name: vetName.trim() || null,
          vet_phone: vetPhone.trim() || null,
          microchip: microchip.trim() || null,
        })
        .eq('id', dog.id);
      if (err) throw err;
      const calendar = mergeSheetReads([sheetReadFromNotes(nextNotes), sheetShotsFromNotes(nextNotes)]);
      reminders.replaceSheetReminders(dog.id, remindersFromSheet(dog.id, calendar));
      await refresh();
      setSaved(true);
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
        voice="clinical"
        title="Edit care sheet"
        subtitle="The facts a sitter or clinic should not have to guess."
        onBack={() => router.back()}
        large={false}
      />

      <Section title="1. Who they are">
        <Surface kind="grouped" style={{ gap: space.md }}>
          <Text variant="caption" tone="secondary">
            Name, breed, birthday, and how they look. A new person should be able to pick them out of a group.
          </Text>
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
          <Field label="Color and markings" value={coat} onChangeText={setCoat} placeholder="Black and tan, white chest" autoCapitalize="sentences" />
          <DateField label="Birthday" value={birthdate} onChange={setBirthdate} maximumDate={new Date()} hint="Leave blank if you do not know." />
        </Surface>
      </Section>

      <Section title="2. Body">
        <Surface kind="grouped" style={{ gap: space.md }}>
          <Text variant="caption" tone="secondary">
            Sex, whether they are neutered or spayed, and weight. Clinics ask these first.
          </Text>
          <View style={styles.chips}>
            {SEX.map((s) => (
              <Chip key={s.id} label={s.label} selected={sex === s.id} onPress={() => setSex(s.id)} />
            ))}
          </View>
          <View style={styles.chips}>
            <Chip label={sex === 'female' ? 'Spayed' : 'Neutered'} selected={altered === true} onPress={() => setAltered(true)} />
            <Chip label="Intact" selected={altered === false} onPress={() => setAltered(false)} />
            <Chip label="Not sure" selected={altered == null} onPress={() => setAltered(null)} />
          </View>
          <Field label="Weight" value={weight} onChangeText={setWeight} keyboardType="decimal-pad" suffix={weightUnit} />
        </Surface>
      </Section>

      <Section title="3. Do not give">
        <Surface kind="grouped" style={{ gap: space.md }}>
          <Text variant="caption" tone="secondary">
            Allergies and anything they must never eat. The treat scanner uses this list too.
          </Text>
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
        </Surface>
      </Section>

      <Section title="4. Shots">
        <Surface kind="grouped" style={{ gap: space.md }}>
          <Text variant="caption" tone="secondary">
            Next due dates go on the calendar. Leave blank if you do not know.
          </Text>
          <DateField label="Rabies due" value={rabies} onChange={setRabies} />
          <DateField label="DHPP due" value={dhpp} onChange={setDhpp} />
          <DateField label="Bordetella due" value={bordetella} onChange={setBordetella} />
        </Surface>
      </Section>

      <Section title="5. Medications and good to know">
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

      <Section title="6. Emergency">
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
          <Field label="Microchip" value={microchip} onChangeText={setMicrochip} placeholder="15 digit ID, letters ok" autoCapitalize="characters" autoCorrect={false} />
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
