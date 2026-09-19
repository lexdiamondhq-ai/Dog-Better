import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeInRight, FadeOutLeft } from 'react-native-reanimated';

import { OnboardingMascot, type MascotPose } from '@/components/brand/OnboardingMascot';
import { VetSearch } from '@/components/dogs/VetSearch';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { DateField } from '@/components/ui/DateField';
import { DogAvatar } from '@/components/ui/DogAvatar';
import { Field } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { Screen } from '@/components/ui/Screen';
import { Tap } from '@/components/ui/Tap';
import { Text } from '@/components/ui/Text';
import { useAuth } from '@/lib/auth';
import { useDogs } from '@/lib/dogs';
import { usePremiumGate } from '@/lib/gates';
import { usePoints } from '@/lib/points';
import { humanizeError } from '@/lib/errors';
import { pickFromLibrary, uploadImage } from '@/lib/media';
import { usePreferences } from '@/lib/preferences';
import { publicMediaUrl, supabase } from '@/lib/supabase';
import { parseWeightInput } from '@/lib/units';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';

const BREEDS = ['Mixed breed', 'Labrador', 'Golden Retriever', 'French Bulldog', 'German Shepherd', 'Poodle', 'Dachshund', 'Beagle', 'Corgi', 'Shih Tzu', 'Husky', 'Border Collie'];

type Step = 'name' | 'about' | 'body' | 'vet' | 'photo';
const STEPS: Step[] = ['name', 'about', 'body', 'vet', 'photo'];
const DRAFT_KEY = 'dogbetter.onboarding.draft.v1';
type BirthMode = 'exact' | 'estimate';
const POSE: Record<Step, MascotPose> = {
  name: 'walk',
  about: 'bark',
  body: 'sit',
  vet: 'down',
  photo: 'sit',
};

export default function Onboarding() {
  const t = useTheme();
  const router = useRouter();
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const adding = mode === 'add';
  const { user } = useAuth();
  const { refresh, setActiveDog } = useDogs();
  const gate = usePremiumGate();
  const { award } = usePoints();
  const { weightUnit, setWeightUnit, loaded: prefsLoaded } = usePreferences();

  const [step, setStep] = useState<Step>('name');
  const [name, setName] = useState('');
  const [breed, setBreed] = useState('');
  const [sex, setSex] = useState<'male' | 'female' | 'unknown'>('unknown');
  const [years, setYears] = useState('');
  const [months, setMonths] = useState('');
  const [birthMode, setBirthMode] = useState<BirthMode>('estimate');
  const [exactBirth, setExactBirth] = useState('');
  const [weight, setWeight] = useState('');
  // Preferences load async; until then the unit falls back to the stored default at first render.
  const [unit, setUnit] = useState<'kg' | 'lb' | null>(prefsLoaded ? weightUnit : null);
  const unitResolved: 'kg' | 'lb' = unit ?? weightUnit;

  // A second dog is Premium. Deep links into add mode get the same gate as the buttons.
  useEffect(() => {
    if (adding && !gate.allows('multi_dog')) router.replace({ pathname: '/paywall', params: { from: 'multi_dog' } });
  }, [adding, gate, router]);
  const [vetName, setVetName] = useState('');
  const [vetPhone, setVetPhone] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draftReady, setDraftReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(DRAFT_KEY)
      .then((raw) => {
        if (!raw || cancelled) return;
        const d = JSON.parse(raw) as {
          step?: Step;
          name?: string;
          breed?: string;
          sex?: 'male' | 'female' | 'unknown';
          years?: string;
          months?: string;
          birthMode?: BirthMode;
          exactBirth?: string;
          weight?: string;
          vetName?: string;
          vetPhone?: string;
          photo?: string | null;
        };
        if (d.step && STEPS.includes(d.step)) setStep(d.step);
        if (d.name) setName(d.name);
        if (d.breed) setBreed(d.breed);
        if (d.sex) setSex(d.sex);
        if (d.years) setYears(d.years);
        if (d.months) setMonths(d.months);
        if (d.birthMode) setBirthMode(d.birthMode);
        if (d.exactBirth) setExactBirth(d.exactBirth);
        if (d.weight) setWeight(d.weight);
        if (d.vetName) setVetName(d.vetName);
        if (d.vetPhone) setVetPhone(d.vetPhone);
        if (d.photo) setPhoto(d.photo);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setDraftReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!draftReady) return;
    const id = setTimeout(() => {
      AsyncStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({ step, name, breed, sex, years, months, birthMode, exactBirth, weight, vetName, vetPhone, photo }),
      ).catch(() => {});
    }, 250);
    return () => clearTimeout(id);
  }, [draftReady, step, name, breed, sex, years, months, birthMode, exactBirth, weight, vetName, vetPhone, photo]);

  const idx = STEPS.indexOf(step);
  const next = () => setStep(STEPS[Math.min(STEPS.length - 1, idx + 1)]);
  const back = () => {
    if (idx === 0) {
      if (adding) router.back();
      return;
    }
    setStep(STEPS[idx - 1]);
  };

  const weightKg = parseWeightInput(weight, unitResolved);

  const birthdate = (() => {
    if (birthMode === 'exact') return exactBirth || null;
    const y = parseInt(years || '0', 10);
    const m = parseInt(months || '0', 10);
    if (!y && !m) return null;
    const d = new Date();
    d.setMonth(d.getMonth() - (y * 12 + m));
    return d.toISOString().slice(0, 10);
  })();
  const birthdateEstimated = birthMode === 'estimate' && Boolean(birthdate);

  const finish = async () => {
    if (!user) return;
    setBusy(true);
    setError(null);
    try {
      let avatar_url: string | null = null;
      if (photo) {
        const path = await uploadImage({ bucket: 'media', userId: user.id, folder: 'avatars', uri: photo });
        avatar_url = publicMediaUrl(path);
      }
      const { data, error: err } = await supabase
        .from('dogs')
        .insert({
          owner_id: user.id,
          name: name.trim(),
          breed: breed || null,
          sex,
          birthdate,
          birthdate_estimated: birthdateEstimated,
          weight_kg: weightKg ? Math.round(weightKg * 10) / 10 : null,
          avatar_url,
          vet_name: vetName.trim() || null,
          vet_phone: vetPhone.trim() || null,
        })
        .select()
        .single();
      if (err) throw err;
      if (weightKg) await supabase.from('weight_entries').insert({ dog_id: data.id, owner_id: user.id, weight_kg: Math.round(weightKg * 10) / 10 });
      setWeightUnit(unitResolved);
      setActiveDog(data.id);
      await refresh();
      await AsyncStorage.removeItem(DRAFT_KEY);
      await award({ kind: 'dog', key: `dog:${data.id}`, dogId: data.id });
      // First dog: land on the trial offer. Gate also sends here. Do not replace to Today or Skip is never seen.
      router.replace(adding ? '/(app)/(tabs)/profile' : { pathname: '/paywall', params: { from: 'onboarding' } });
    } catch (e) {
      setError(humanizeError(e, 'Could not save your dog.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen keyboardShouldPersistTaps="handled">
        <View style={styles.top}>
          <OnboardingMascot pose={POSE[step]} />
          <View style={styles.dots}>
            {STEPS.map((s, i) => (
              <View key={s} style={[styles.dot, { backgroundColor: i <= idx ? t.brand : t.surfaceStrong, width: i === idx ? 22 : 8 }]} />
            ))}
          </View>
        </View>

        {step === 'name' ? (
          <Animated.View key="name" entering={FadeInRight.duration(320)} exiting={FadeOutLeft.duration(200)} style={styles.card}>
            <Text variant="overline" tone="tertiary">
              {adding ? 'Dog Better · another profile' : 'Dog Better · meet your dog'}
            </Text>
            <Text variant="hero">{adding ? 'Who else is in the house?' : 'Who are we dogging better for?'}</Text>
            <Field placeholder="Dog's name" value={name} onChangeText={setName} autoFocus autoCapitalize="words" returnKeyType="next" onSubmitEditing={() => name.trim() && next()} />
            {adding ? (
              <View style={styles.row}>
                <Button label="Cancel" kind="secondary" onPress={() => router.back()} />
                <Button label="Continue" style={{ flex: 1 }} disabled={!name.trim()} onPress={next} />
              </View>
            ) : (
              <Button label="Continue" size="lg" disabled={!name.trim()} onPress={next} />
            )}
          </Animated.View>
        ) : null}

        {step === 'about' ? (
          <Animated.View key="about" entering={FadeInRight.duration(320)} exiting={FadeOutLeft.duration(200)} style={styles.card}>
            <Text variant="overline" tone="tertiary">
              About {name}
            </Text>
            <Text variant="display">Breed and sex</Text>
            <Field placeholder="Breed (type or pick)" value={breed} onChangeText={setBreed} autoCapitalize="words" />
            <View style={styles.chips}>
              {BREEDS.filter((b) => !breed || b.toLowerCase().includes(breed.toLowerCase())).slice(0, 8).map((b) => (
                <Chip key={b} label={b} selected={breed === b} onPress={() => setBreed(b)} />
              ))}
            </View>
            <View style={styles.chips}>
              {(['male', 'female', 'unknown'] as const).map((s) => (
                <Chip key={s} label={s === 'unknown' ? 'Prefer not to say' : s[0].toUpperCase() + s.slice(1)} selected={sex === s} onPress={() => setSex(s)} />
              ))}
            </View>
            <View style={styles.row}>
              <Button label="Back" kind="secondary" onPress={back} />
              <Button label="Continue" style={{ flex: 1 }} onPress={next} />
            </View>
          </Animated.View>
        ) : null}

        {step === 'body' ? (
          <Animated.View key="body" entering={FadeInRight.duration(320)} exiting={FadeOutLeft.duration(200)} style={styles.card}>
            <Text variant="overline" tone="tertiary">
              Age and weight
            </Text>
            <Text variant="display">Sizing everything to {name}</Text>
            <Text variant="body" tone="secondary">
              Treat portions and toxicity thresholds are calculated from weight, so this matters more than it looks.
            </Text>
            <View style={styles.chips}>
              <Chip label="I know the exact date" selected={birthMode === 'exact'} onPress={() => setBirthMode('exact')} />
              <Chip label="Estimate by age" selected={birthMode === 'estimate'} onPress={() => setBirthMode('estimate')} />
            </View>
            {birthMode === 'exact' ? (
              <DateField label="Birthday" value={exactBirth} onChange={setExactBirth} maximumDate={new Date()} hint="This is the date we keep. Age will not drift." />
            ) : (
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Field label="Years" placeholder="0" value={years} onChangeText={setYears} keyboardType="number-pad" />
                </View>
                <View style={{ flex: 1 }}>
                  <Field label="Months" placeholder="0" value={months} onChangeText={setMonths} keyboardType="number-pad" />
                </View>
              </View>
            )}
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Field label="Weight" placeholder="0" value={weight} onChangeText={setWeight} keyboardType="decimal-pad" suffix={unitResolved} />
              </View>
              <View style={[styles.unitToggle, { backgroundColor: t.surface }]}>
                {(['kg', 'lb'] as const).map((u) => (
                  <Tap key={u} onPress={() => setUnit(u)} haptic="selection" accessibilityLabel={`Weight in ${u}`} accessibilityState={{ selected: unitResolved === u }} style={[styles.unit, unitResolved === u && { backgroundColor: t.brand }]}>
                    <Text variant="label" tone={unitResolved === u ? 'onBrand' : 'secondary'}>
                      {u}
                    </Text>
                  </Tap>
                ))}
              </View>
            </View>
            <View style={styles.row}>
              <Button label="Back" kind="secondary" onPress={back} />
              <Button label="Continue" style={{ flex: 1 }} onPress={next} />
            </View>
          </Animated.View>
        ) : null}

        {step === 'vet' ? (
          <Animated.View key="vet" entering={FadeInRight.duration(320)} exiting={FadeOutLeft.duration(200)} style={styles.card}>
            <Text variant="overline" tone="tertiary">
              Their clinic
            </Text>
            <Text variant="display">Who is {name}&apos;s vet?</Text>
            <Text variant="body" tone="secondary">
              Search by zip, city, or the phone&apos;s location. Skip if you do not have one yet.
            </Text>
            <VetSearch
              onPick={(v) => {
                setVetName(v.name);
                setVetPhone(v.phone ?? '');
              }}
            />
            <Field label="Vet" value={vetName} onChangeText={setVetName} placeholder="Clinic or doctor" autoCapitalize="words" />
            <Field label="Phone" value={vetPhone} onChangeText={setVetPhone} keyboardType="phone-pad" placeholder="+1 555 0100" />
            <View style={styles.row}>
              <Button label="Back" kind="secondary" onPress={back} />
              <Button label="Continue" style={{ flex: 1 }} onPress={next} />
            </View>
          </Animated.View>
        ) : null}

        {step === 'photo' ? (
          <Animated.View key="photo" entering={FadeInRight.duration(320)} exiting={FadeOutLeft.duration(200)} style={styles.card}>
            <Text variant="overline" tone="tertiary">
              Almost there
            </Text>
            <Text variant="display">A face for the vault</Text>
            <Animated.View entering={FadeInDown.delay(150)} style={{ alignItems: 'center', gap: space.md }}>
              <Tap
                accessibilityLabel={photo ? 'Change photo' : 'Add a photo'}
                onPress={async () => {
                  try {
                    const uri = await pickFromLibrary();
                    if (uri) {
                      setPhoto(uri);
                      setError(null);
                    }
                  } catch (e) {
                    setError(humanizeError(e, 'Could not open that photo. Try another one, or skip for now.'));
                  }
                }}
                haptic="medium"
                scaleTo={0.97}>
                <DogAvatar uri={photo} size={168} />
                <View style={[styles.camBadge, { backgroundColor: t.accent }]}>
                  <Icon name="camera" size={18} color="#3A2A10" />
                </View>
              </Tap>
              <Text variant="caption" tone="tertiary">
                Optional. You can add one later from the Vault.
              </Text>
            </Animated.View>
            {error ? (
              <Text variant="caption" tone="bad">
                {error}
              </Text>
            ) : null}
            <View style={styles.row}>
              <Button label="Back" kind="secondary" onPress={back} />
              <Button label={`Meet ${name}`} style={{ flex: 1 }} loading={busy} onPress={finish} />
            </View>
          </Animated.View>
        ) : null}
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  top: { alignItems: 'center', gap: space.md, paddingTop: space.sm },
  dots: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  dot: { height: 8, borderRadius: 4 },
  card: { gap: space.lg, paddingTop: space.lg },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  row: { flexDirection: 'row', gap: space.md, alignItems: 'flex-end' },
  unitToggle: { flexDirection: 'row', padding: 4, borderRadius: radius.pill, height: 54, alignItems: 'center' },
  unit: { paddingHorizontal: space.lg, height: 46, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  camBadge: { position: 'absolute', right: 6, bottom: 6, width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});
