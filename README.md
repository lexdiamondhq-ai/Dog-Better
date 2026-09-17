# Dog Better

Dog Better every day.
A native iOS app that helps you read your dog, feed them right, keep them healthy, and find the good places, with a small community of people who care about the same things.

## What is inside

- **Today**: the roster for this dog. Meals, the next dose, the next walk, and a Better Score with every point explained.
- **Treat scanner**: scan a barcode (Open Food Facts and Open Pet Food Facts) or paste an ingredient list, get a verdict sized to your dog's weight and allergy list, then log the portion and its calories. Always free.
- **Symptom detective**: pick signs, set severity and duration, get a green / amber / red verdict with reasons. Red puts your vet one tap away.
- **Look**: a photo of a paw, an ear, or a coat with a checklist for that spot. A model looks at the photo when the server has one configured; the UI says which it was.
- **Care sheet and clinic pack**: feeding, meds, the do-not list, weight trend, and symptom timeline, ready to send to a sitter or hand to a clinic.
- **Walks, parks, and trails**: start a walk from a map of dog areas near you.
- **Community and Barks**: invite-only circles for photos, and a shared scroll of short clips. Report and block on every post.
- **Premium**: the medication reader, the clinic pack file, every dog in the house, unlimited Looks, the full Learn library, and no partner cards.

## Stack

- Expo SDK 57, Expo Router, React Native with the New Architecture and React Compiler
- Reanimated 4 and Gesture Handler for motion
- Supabase (Postgres, Auth, Storage, Realtime, Edge Functions) with Row Level Security on every table
- RevenueCat for Apple subscriptions; `expo-notifications` for local reminders; `expo-camera` barcode scanning; `react-native-maps`; `expo-location`
- Fonts: Fredoka (display) and Manrope (text)

## Run it

```bash
npm install
cp .env.example .env   # fill in Supabase URL and publishable key; RevenueCat key for a dev build
npx expo start         # Expo Go: everything except purchases and native notifications
npx expo run:ios       # dev build: full StoreKit and notifications
```

Expo Go has no StoreKit. The paywall detects that and says purchases need the App Store build; nothing can grant Premium without a store transaction.

## Backend

Schema and policies live in `supabase/migrations` and are applied to the linked project (`supabase/config.toml`).
Regenerate `src/lib/database.types.ts` after schema changes with `supabase gen types typescript`, then re-apply the hand-tightened string unions.

Edge Functions in `supabase/functions`:

- `delete-account`: deletes the caller's storage objects, rows, and auth user. Wired to Settings, Account, Delete account.
- `ai`: the only place the app talks to OpenAI. Holds `OPENAI_API_KEY` as a secret, enforces the free Look quota server-side, and requires Premium for visit sheet reads.
- `revenuecat-webhook`: mirrors subscription state into `profiles.premium_until` so the server can trust Premium. Authenticates with `REVENUECAT_WEBHOOK_SECRET`.

Set secrets with `supabase secrets set NAME=value`. Deploy with `supabase functions deploy <name>`.

## Ship it

`eas.json` has `development`, `preview`, and `production` profiles with remote version bumping.
Before the first build: `npx eas init`, register `com.dogbetter.app` with the Sign in with Apple capability, create the App Store Connect record, and fill in `submit.production.ios`.
Then `eas build --platform ios --profile production` and `eas submit --platform ios`.

Amazon links ship without the Associates tag until Associates Central lists the app as an Approved Mobile Application.
Flip `AMAZON_APP_APPROVED` in `src/content/partners.ts` at that point.

## Quality

```bash
npx tsc --noEmit
npx expo lint
npx expo-doctor
```

All three are clean, including the React Compiler lint rules.

## A note on the guidance

The symptom detective, the scanner, and Look are decision aids built on published veterinary triage principles and known toxin lists.
They are not a diagnosis.
The UI says so wherever it matters.
