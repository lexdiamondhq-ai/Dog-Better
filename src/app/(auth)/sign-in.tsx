import { useRouter } from 'expo-router';
import { useEffect, useRef, useState, type RefObject } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeInDown, FadeInRight, FadeOutLeft } from 'react-native-reanimated';

import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { Screen, ScreenHeader } from '@/components/ui/Screen';
import { Tap } from '@/components/ui/Tap';
import { Text } from '@/components/ui/Text';
import { humanizeError } from '@/lib/errors';
import { sendEmailCode, verifyEmailCode } from '@/lib/signIn';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts, radius, space } from '@/theme/tokens';

const CODE_LENGTH = 6;
const RESEND_SECONDS = 30;

/**
 * Passwordless email. Step one asks for the address, step two for the 6-digit code Supabase emails.
 * The same flow signs up and signs in, so there is no "already have an account?" fork to get wrong.
 */
export default function SignIn() {
  const t = useTheme();
  const router = useRouter();
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const codeRef = useRef<TextInput>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const send = async () => {
    if (!valid) {
      setError('That does not look like an email address.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await sendEmailCode(email.trim().toLowerCase());
      setStep('code');
      setCode('');
      setCooldown(RESEND_SECONDS);
      setTimeout(() => codeRef.current?.focus(), 350);
    } catch (e) {
      setError(humanizeError(e, 'Could not send the code. Try again.'));
    } finally {
      setBusy(false);
    }
  };

  const verify = async (value = code) => {
    if (value.length !== CODE_LENGTH) return;
    setBusy(true);
    setError(null);
    try {
      await verifyEmailCode(email.trim().toLowerCase(), value);
      // The auth gate takes over from here and routes to onboarding or the app.
    } catch (e) {
      setError(humanizeError(e, 'That code did not work. Check it or request a new one.'));
      setCode('');
      codeRef.current?.focus();
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen keyboardShouldPersistTaps="handled">
        <ScreenHeader
          title={step === 'email' ? 'What is your email?' : 'Enter the code'}
          subtitle={step === 'email' ? 'We will send a 6-digit code. No password to remember.' : `Sent to ${email.trim()}. It expires in an hour.`}
          onBack={() => (step === 'code' ? setStep('email') : router.back())}
        />

        {step === 'email' ? (
          <Animated.View key="email" entering={FadeInDown.duration(300)} exiting={FadeOutLeft} style={{ gap: space.lg }}>
            <Field
              label="Email"
              placeholder="you@example.com"
              value={email}
              onChangeText={(v) => {
                setEmail(v);
                setError(null);
              }}
              autoCapitalize="none"
              keyboardType="email-address"
              textContentType="emailAddress"
              autoComplete="email"
              autoFocus
              returnKeyType="send"
              onSubmitEditing={send}
              error={error ?? undefined}
            />
            <Button label="Send code" icon="send" size="lg" loading={busy} disabled={!valid} onPress={send} />
            <View style={[styles.note, { backgroundColor: t.surface }]}>
              <Icon name="shield" size={18} color={t.good} />
              <Text variant="caption" tone="secondary" style={{ flex: 1 }}>
                New here? The code creates your account. Already with us? It signs you in. Your dog&apos;s records are private to you.
              </Text>
            </View>
          </Animated.View>
        ) : (
          <Animated.View key="code" entering={FadeInRight.duration(260)} style={{ gap: space.lg }}>
            <CodeInput inputRef={codeRef} value={code} onChange={(v) => { setCode(v); setError(null); if (v.length === CODE_LENGTH) verify(v); }} error={!!error} />
            {error ? (
              <Text variant="caption" tone="bad" align="center">
                {error}
              </Text>
            ) : null}
            <Button label="Continue" icon="check" size="lg" loading={busy} disabled={code.length !== CODE_LENGTH} onPress={() => verify()} />
            <Tap onPress={send} disabled={cooldown > 0 || busy} haptic="selection">
              <Text variant="label" tone={cooldown > 0 ? 'tertiary' : 'brand'} align="center">
                {cooldown > 0 ? `Resend in ${cooldown}s` : 'Send a new code'}
              </Text>
            </Tap>
          </Animated.View>
        )}
      </Screen>
    </KeyboardAvoidingView>
  );
}

type CodeProps = { value: string; onChange: (v: string) => void; error?: boolean; inputRef: RefObject<TextInput | null> };

/** Six boxes drawn over one hidden input, so paste, autofill from Messages, and backspace all behave. */
function CodeInput({ value, onChange, error, inputRef }: CodeProps) {
  const t = useTheme();
  const cells = Array.from({ length: CODE_LENGTH }, (_, i) => value[i] ?? '');
  return (
    <Pressable onPress={() => inputRef.current?.focus()} accessibilityLabel="Verification code">
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={(v) => onChange(v.replace(/\D/g, '').slice(0, CODE_LENGTH))}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        maxLength={CODE_LENGTH}
        style={styles.hidden}
        caretHidden
        accessibilityLabel="Verification code"
      />
      <View style={styles.cells} pointerEvents="none">
        {cells.map((c, i) => {
          const active = i === Math.min(value.length, CODE_LENGTH - 1);
          return (
            <View key={i} style={[styles.cell, { backgroundColor: t.bgRaised, borderColor: error ? t.bad : active ? t.brand : t.border, borderWidth: active || error ? 2 : 1 }]}>
              <Text style={[styles.digit, { color: t.text }]}>{c}</Text>
            </View>
          );
        })}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  note: { flexDirection: 'row', gap: space.md, alignItems: 'center', padding: space.lg, borderRadius: 20 },
  hidden: { position: 'absolute', opacity: 0, height: 1, width: 1 },
  cells: { flexDirection: 'row', gap: space.sm, justifyContent: 'center' },
  cell: { width: 48, height: 60, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  digit: { fontFamily: fonts.display, fontSize: 28, lineHeight: 34 },
});
