import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, Layout } from 'react-native-reanimated';

import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { Screen, ScreenHeader } from '@/components/ui/Screen';
import { Surface } from '@/components/ui/Surface';
import { Text } from '@/components/ui/Text';
import { humanizeError } from '@/lib/errors';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/theme/ThemeProvider';
import { space } from '@/theme/tokens';

export default function SignIn() {
  const t = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: string }>();
  const [mode, setMode] = useState<'signin' | 'signup'>(params.mode === 'signin' ? 'signin' : 'signup');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [awaitingEmail, setAwaitingEmail] = useState(false);

  const submit = async () => {
    setError(null);
    if (!email.trim() || password.length < 8) {
      setError('Use a valid email and a password with at least 8 characters.');
      return;
    }
    setBusy(true);
    try {
      if (mode === 'signup') {
        const { data, error: err } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { display_name: name.trim() || undefined } },
        });
        if (err) throw err;
        if (!data.session) setAwaitingEmail(true);
      } else {
        const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (err) throw err;
      }
    } catch (e) {
      setError(humanizeError(e, 'Something went wrong. Try again.'));
    } finally {
      setBusy(false);
    }
  };

  if (awaitingEmail) {
    return (
      <Screen>
        <ScreenHeader title="Check your inbox" eyebrow="One more step" onBack={() => setAwaitingEmail(false)} />
        <Surface kind="fur" style={{ alignItems: 'center', gap: space.md }}>
          <Image source={require('@/assets/brand/mascot.png')} style={{ width: 160, height: 122 }} contentFit="contain" />
          <Text variant="body" align="center">
            We sent a confirmation link to <Text variant="bodyStrong">{email}</Text>. Tap it, then come back and sign in.
          </Text>
        </Surface>
        <Button label="Back to sign in" kind="secondary" onPress={() => { setAwaitingEmail(false); setMode('signin'); }} />
      </Screen>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen keyboardShouldPersistTaps="handled">
        <ScreenHeader
          title={mode === 'signup' ? 'Create your account' : 'Welcome back'}
          eyebrow="Dog Better"
          subtitle={mode === 'signup' ? 'Your dog gets a profile, a vault, and a pack.' : 'Sign in to pick up where you left off.'}
          onBack={() => router.back()}
        />

        <Animated.View layout={Layout.springify()} style={styles.form}>
          {mode === 'signup' ? (
            <Animated.View entering={FadeInDown.duration(300)}>
              <Field label="Your name" placeholder="How the pack should call you" value={name} onChangeText={setName} autoCapitalize="words" textContentType="name" />
            </Animated.View>
          ) : null}
          <Field label="Email" placeholder="you@example.com" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" textContentType="emailAddress" autoComplete="email" />
          <Field
            label="Password"
            placeholder="At least 8 characters"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            textContentType={mode === 'signup' ? 'newPassword' : 'password'}
            error={error ?? undefined}
            onSubmitEditing={submit}
            returnKeyType="go"
          />
        </Animated.View>

        <Button label={mode === 'signup' ? 'Create account' : 'Sign in'} size="lg" loading={busy} onPress={submit} />

        <View style={styles.switchRow}>
          <Text variant="body" tone="secondary">
            {mode === 'signup' ? 'Already have an account?' : 'New here?'}
          </Text>
          <Button label={mode === 'signup' ? 'Sign in' : 'Create one'} kind="ghost" onPress={() => { setMode(mode === 'signup' ? 'signin' : 'signup'); setError(null); }} />
        </View>

        <View style={[styles.note, { backgroundColor: t.surface }]}>
          <Icon name="shield" size={18} color={t.good} />
          <Text variant="caption" tone="secondary" style={{ flex: 1 }}>
            Your dog&apos;s records are private to you. Community posts are visible to other signed-in members.
          </Text>
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  form: { gap: space.lg },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.xs },
  note: { flexDirection: 'row', gap: space.md, alignItems: 'center', padding: space.lg, borderRadius: 20 },
});
