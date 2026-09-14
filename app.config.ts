import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * Static config lives in app.json; this layer only injects secrets that must not be committed.
 * Expo CLI loads `.env` before evaluating this file, so GOOGLE_MAPS_ANDROID_API_KEY comes from there
 * locally and from EAS secrets in CI. Without it, Android builds still compile but the map tiles stay blank.
 */
export default ({ config }: ConfigContext): ExpoConfig => {
  const googleMapsKey = process.env.GOOGLE_MAPS_ANDROID_API_KEY;
  return {
    ...config,
    name: config.name ?? 'Dog Better',
    slug: config.slug ?? 'dog-better',
    android: {
      ...config.android,
      ...(googleMapsKey ? { config: { ...config.android?.config, googleMaps: { apiKey: googleMapsKey } } } : {}),
    },
  };
};
