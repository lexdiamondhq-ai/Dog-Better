import * as Application from 'expo-application';
import * as Device from 'expo-device';
import { Linking, Platform } from 'react-native';

export const SUPPORT_EMAIL = 'support@dogbetter.app';

/** Opens the mail app with the context support always ends up asking for anyway. */
export function contactSupport(subject = 'Dog Better support', extra?: string) {
  const version = `${Application.nativeApplicationVersion ?? '?'} (${Application.nativeBuildVersion ?? '?'})`;
  const device = `${Device.modelName ?? 'Unknown device'}, ${Platform.OS} ${Device.osVersion ?? ''}`.trim();
  const body = ['', '', '---', `App: Dog Better ${version}`, `Device: ${device}`, extra ?? ''].join('\n');
  return Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
}
