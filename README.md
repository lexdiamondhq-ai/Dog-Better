# Dog Better

Dog Better every day.
A native iOS and Android app that helps you read your dog, feed them right, keep them healthy, and find the good places, with a small community of people who care about the same things.

## What is inside

- **Today**: a daily Better Score (nutrition, health, records, connection), one-tap meal logging, and a timeline of everything you have done for your dog.
- **Bark and Behaviour Translator**: eight seconds of on-device audio metering, a transparent feature-scoring model (rhythm, loudness, modulation), a mood estimate with a stated confidence, and what to try next.
- **Symptom Checker**: pick signs, set severity and duration, get a green / amber / red verdict with reasons and home-care tips. Red puts your vet's number one tap away.
- **Treat Scanner**: scan a barcode (Open Food Facts) or paste an ingredient list, then get a verdict sized to your dog's weight and allergy list, plus a daily treat budget in grams.
- **Places**: dog parks, trails, patios, and beaches from OpenStreetMap around you, with crowd-sourced "pulses" (how busy, how muddy, shade) that expire after 12 hours. Long-press the map to add a spot.
- **Pack**: a photo-first community feed with likes and comments, updated live.
- **Vault**: your dog's profile, records (vet, microchip, allergies, notes), and a private photo gallery with an in-app camera.

## The interaction model

Navigation lives on the trailing edge, not the bottom.
The **Paw Rail** sits inside the natural thumb arc: tap to switch, drag along it to scrub between destinations, or pull it (or the screen edge) leftward to reveal **Quick Actions**.
Feature screens push in from the same edge, so everything new arrives from the right.
Surfaces use real Liquid Glass on iOS 26 and a tinted blur elsewhere.

## Stack

- Expo SDK 57, Expo Router, React Native with the New Architecture and React Compiler
- Reanimated 4 and Gesture Handler for all motion and gestures
- Supabase (Postgres, Auth, Storage, Realtime) with Row Level Security on every table
- `expo-audio` metering, `expo-camera` barcode scanning, `react-native-maps`, `expo-location`
- Fonts: Fredoka (display) and Manrope (text)

## Run it

```bash
npm install
cp .env.example .env   # fill in your Supabase URL and publishable key
npx expo run:ios       # or: npx expo run:android
```

`expo prebuild` generates the native projects.
The `plugins/withSpaceSafePods.js` config plugin patches two generated build scripts so the project builds from a directory that contains a space.

On Android, `react-native-maps` needs a Google Maps API key in `app.json` under `android.config.googleMaps.apiKey`.

## Backend

The Supabase schema (dogs, meals, health_logs, bark_sessions, food_scans, weight_entries, dog_photos, places, place_pulses, posts, post_likes, post_comments, profiles) and two storage buckets (`media` public, `vault` private) were applied as a migration to the linked project.
Regenerate `src/lib/database.types.ts` after schema changes with `supabase gen types typescript`.

## Quality

```bash
npx tsc --noEmit
npx expo lint
```

Both are clean, including the React Compiler lint rules.

## A note on the guidance

The translator, symptom checker, and scanner are decision aids built on published veterinary triage principles, canine bioacoustics research, and known toxin lists.
They are not a diagnosis.
The UI says so wherever it matters.
