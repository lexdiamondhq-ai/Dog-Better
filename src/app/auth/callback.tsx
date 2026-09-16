import { Redirect } from 'expo-router';

/** Landing spot for the OAuth redirect (dogbetter://auth/callback). The session is already exchanged; the Gate routes from here. */
export default function AuthCallback() {
  return <Redirect href="/" />;
}
