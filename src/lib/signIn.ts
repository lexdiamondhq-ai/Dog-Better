import * as AppleAuthentication from 'expo-apple-authentication';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

import { supabase } from './supabase';

export class ProviderUnavailableError extends Error {
  constructor(provider: string) {
    super(`${provider} sign-in is not set up yet`);
    this.name = 'ProviderUnavailableError';
  }
}

/** Native Sign in with Apple. The identity token goes straight to Supabase; no browser round trip. */
export async function signInWithApple() {
  if (Platform.OS !== 'ios' || !(await AppleAuthentication.isAvailableAsync())) throw new ProviderUnavailableError('Apple');
  let credential: AppleAuthentication.AppleAuthenticationCredential;
  try {
    credential = await AppleAuthentication.signInAsync({
      requestedScopes: [AppleAuthentication.AppleAuthenticationScope.FULL_NAME, AppleAuthentication.AppleAuthenticationScope.EMAIL],
    });
  } catch (e) {
    if ((e as { code?: string }).code === 'ERR_REQUEST_CANCELED') return { cancelled: true as const };
    // Missing entitlement or no Apple Developer capability yet reads as a generic failure; surface it as "not set up".
    throw new ProviderUnavailableError('Apple');
  }
  if (!credential.identityToken) throw new Error('Apple did not return an identity token.');
  const { error } = await supabase.auth.signInWithIdToken({ provider: 'apple', token: credential.identityToken });
  if (error) throw error;
  // Apple only sends the name on the very first sign-in, so persist it now or lose it.
  const name = [credential.fullName?.givenName, credential.fullName?.familyName].filter(Boolean).join(' ');
  if (name) await supabase.auth.updateUser({ data: { display_name: name } });
  return { cancelled: false as const };
}

/** Google via Supabase OAuth in the system browser (PKCE). Requires the Google provider to be enabled in Supabase. */
export async function signInWithGoogle() {
  const redirectTo = Linking.createURL('/auth/callback');
  const { data, error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo, skipBrowserRedirect: true } });
  if (error) {
    if (/provider is not enabled|Unsupported provider/i.test(error.message)) throw new ProviderUnavailableError('Google');
    throw error;
  }
  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== 'success') return { cancelled: true as const };
  const { queryParams } = Linking.parse(result.url);
  const code = typeof queryParams?.code === 'string' ? queryParams.code : null;
  if (!code) {
    const desc = typeof queryParams?.error_description === 'string' ? queryParams.error_description : null;
    if (desc && /not enabled/i.test(desc)) throw new ProviderUnavailableError('Google');
    throw new Error(desc ?? 'Google did not return a sign-in code.');
  }
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) throw exchangeError;
  return { cancelled: false as const };
}

/**
 * Development only: a QA account from `.env` so the app can be exercised before the email
 * template and social providers are configured. Compiled out of release builds by `__DEV__`.
 */
export const DEV_LOGIN = __DEV__ && process.env.EXPO_PUBLIC_DEV_LOGIN_EMAIL && process.env.EXPO_PUBLIC_DEV_LOGIN_PASSWORD ? { email: process.env.EXPO_PUBLIC_DEV_LOGIN_EMAIL, password: process.env.EXPO_PUBLIC_DEV_LOGIN_PASSWORD } : null;

export async function signInAsDevUser() {
  if (!DEV_LOGIN) throw new Error('No dev login configured.');
  const { error } = await supabase.auth.signInWithPassword(DEV_LOGIN);
  if (error) throw error;
}

/** Passwordless email: Supabase sends a 6-digit code; the account is created on first use. */
export async function sendEmailCode(email: string) {
  const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
  if (error) throw error;
}

export async function verifyEmailCode(email: string, code: string) {
  const { error } = await supabase.auth.verifyOtp({ email, token: code, type: 'email' });
  if (error) throw error;
}
