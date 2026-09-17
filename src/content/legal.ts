/**
 * Plain-language legal text. The same wording is published at dogbetter.app/privacy.html and
 * dogbetter.app/terms.html; keep the two in step. Update `updated` whenever the text changes.
 * A lawyer's review before each major release is still the standard, not a substitute for this file.
 */

export type LegalDoc = { title: string; updated: string; sections: { heading: string; body: string }[] };

export const LEGAL_UPDATED = 'September 17, 2026';

export const LEGAL: Record<'privacy' | 'terms', LegalDoc> = {
  privacy: {
    title: 'Privacy policy',
    updated: LEGAL_UPDATED,
    sections: [
      { heading: 'Who we are', body: 'Dog Better is made by Do Better LLC. Questions about this policy go to support@dogbetter.app.' },
      {
        heading: 'What we collect',
        body: 'Your email address and sign-in identity (Apple, Google, or a one-time email code). What you log about your dog: profile, meals, walks, weights, symptoms, treat checks, photos, videos, vet visit documents, and places you report on. Community posts, comments, and Barks you choose to share. Device model, OS version, and app version when you contact support or when the app records an anonymous usage event (for example, that a screen was viewed). We do not collect your contacts, your precise location history, or advertising identifiers.',
      },
      {
        heading: 'Why we collect it',
        body: 'To run the app: show your records, build the care sheet and clinic pack, schedule the reminders you set, and keep your account secure. To understand which features are used so we can improve them. We do not sell your data, and we do not use it for third-party advertising.',
      },
      {
        heading: 'Location',
        body: 'Location is used only while you have the walk map, the parks and trails map, or the vet finder open, and during a walk you started. It is used to draw your route and to find places near you. Crowd reports you post are tied to the place, not to you, when shown to others. We do not track your location in the background or store a location history beyond the walks you save.',
      },
      {
        heading: 'Photos, videos, and records',
        body: 'Profile photos, symptom photos, and vet visit documents are private to your account. They are shared only when you choose to send a care sheet or clinic pack. Dog portraits are stored in a bucket that can be linked so they can appear on the care sheet you send. Anything you post to Community or Barks is visible to other signed-in Dog Better members.',
      },
      {
        heading: 'AI processing',
        body: 'When you use Look or the visit sheet reader, the photo or document you choose is sent through our server to OpenAI, Inc. to be described or read, then the result is returned to you. OpenAI processes it under their API terms and does not use it to train their models. We do not send your name or email. The response is a checklist or a list of medications, never a diagnosis. You can use the app fully without these two features.',
      },
      {
        heading: 'Purchases',
        body: 'Subscriptions are billed by Apple through your Apple ID. We use RevenueCat to check whether your subscription is active. We receive a purchase record and an anonymous subscriber id; we never see your card details. See the Terms of Use for renewal and cancellation.',
      },
      {
        heading: 'Where data lives',
        body: 'Your data is stored with Supabase (hosted PostgreSQL and file storage) in Canada (Montreal region), protected by row-level security so only your account can read your rows. Barcode lookups go to Open Food Facts. Map data comes from OpenStreetMap and Apple Maps. Weather comes from Open-Meteo using an approximate location.',
      },
      {
        heading: 'How long we keep it',
        body: 'For as long as your account exists. When you delete your account from Settings, we delete your account, every dog, log, photo, video, document, post, and comment right away. Backups age out within 30 days. Anonymous usage events are kept for up to 24 months.',
      },
      {
        heading: 'Your rights',
        body: 'Export everything at any time from Settings, Your data. Delete your account from Settings, Account, and it is removed immediately. You can correct anything you logged by editing it in the app. If you are in California, you have the right to know what we collect, to delete it, and to opt out of sale; we do not sell personal information. If you are in the EU or UK, you may also object to processing or lodge a complaint with your supervisory authority. Email support@dogbetter.app for any request.',
      },
      { heading: 'Children', body: 'Dog Better is for adults. We do not knowingly collect information from anyone under 13, and we ask that no one under 16 create an account. If you believe a child has, email us and we will delete the account.' },
      { heading: 'Changes', body: 'If this policy changes in a way that matters, we will show the new date here and in the app before it takes effect.' },
    ],
  },
  terms: {
    title: 'Terms of use',
    updated: LEGAL_UPDATED,
    sections: [
      {
        heading: 'Not veterinary care',
        body: 'Dog Better helps you notice what changed, decide what to do next, and show a vet or caregiver the full picture. It does not diagnose, prescribe, or replace a licensed veterinarian. Guidance in the app is general and may be wrong for your dog. If your dog is in distress, contact a vet or emergency clinic immediately.',
      },
      {
        heading: 'Your account',
        body: 'You must be at least 16 to create an account. You are responsible for the accuracy of what you log and for keeping your sign-in secure. One account per person; one dog is free and Premium adds more.',
      },
      {
        heading: 'Dog Better Premium',
        body: 'Premium is an auto-renewing subscription billed through your Apple ID, offered monthly and yearly at the price shown in the app before you subscribe. Some plans include a free trial; the trial length and the price after it are shown before you start. Payment is charged to your Apple ID at confirmation of purchase, or at the end of the free trial. The subscription renews automatically unless you cancel at least 24 hours before the end of the current period. You can manage or cancel it in your Apple ID settings at any time; cancelling stops the next renewal and you keep Premium until the period ends. Refunds are handled by Apple under its terms. Records, emergency mode, the care sheet, the treat scanner, and community stay free on every plan.',
      },
      {
        heading: 'Your content',
        body: 'You own everything you log and upload. You grant us the limited right to store and process it so the app can work for you, including sending Look photos and visit documents to our AI provider when you use those features. You can export or delete it at any time.',
      },
      {
        heading: 'Community rules',
        body: 'Community and Barks are shared with other members. Post only content you have the right to share. No harassment, hate, sexual content, spam, or content that shows animal harm. You can report any post or comment and block any member from inside the app; we review reports and remove content or accounts that break these rules. Repeated violations end your access to Community.',
      },
      {
        heading: 'Acceptable use',
        body: 'Do not misuse crowd reporting, attempt to access other people\u2019s data, reverse engineer the app, or use automated tools against our services.',
      },
      {
        heading: 'Product links',
        body: 'Some product recommendations are affiliate links. As an Amazon Associate, Dog Better earns from qualifying purchases. Recommendations are driven by your dog\u2019s profile first; we only link to a product when it passes those rules. Affiliate links never appear in Emergency, triage, or the clinic pack. See the affiliate disclosure at dogbetter.app/affiliates.html.',
      },
      {
        heading: 'Availability and changes',
        body: 'We aim for the app to work every day, but it is provided as is, without warranty. We may change or discontinue features with notice where practical. Emergency information, core records, and the care sheet will not be placed behind a paywall.',
      },
      {
        heading: 'Liability',
        body: 'To the extent permitted by law, Do Better LLC is not liable for decisions made from information in the app, for content posted by other members, or for products bought through affiliate links. Always confirm anything health related with your vet.',
      },
      { heading: 'Governing law', body: 'These terms are governed by the laws of the State of Texas, United States, without regard to conflict of law rules.' },
      { heading: 'Contact', body: 'Do Better LLC. support@dogbetter.app' },
    ],
  },
};
