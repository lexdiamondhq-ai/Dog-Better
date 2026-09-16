/**
 * Plain-language drafts. Both need review by a lawyer before public release; the wording here is
 * written to be honest and readable, not to be final. Update `updated` whenever the text changes.
 */

export type LegalDoc = { title: string; updated: string; sections: { heading: string; body: string }[] };

export const LEGAL: Record<'privacy' | 'terms', LegalDoc> = {
  privacy: {
    title: 'Privacy policy',
    updated: 'September 2026 (draft)',
    sections: [
      { heading: 'What we collect', body: 'Your email and sign-in identity. What you log about your dog: profile, meals, symptoms, weights, treat checks, photos, and places you report on. Device information when you contact support.' },
      { heading: 'Why we collect it', body: 'To show you patterns in your dog\u2019s health and behaviour, to build the care sheet and vet summaries you ask for, and to keep your account secure. We do not sell your data, and we do not use it for advertising.' },
      { heading: 'Photos and records', body: 'Photos and health records are private to your account. They are only shared when you choose to send a care sheet or summary. Profile pictures are stored in a bucket that can be linked, so they can be shown to people you share with.' },
      { heading: 'Location', body: 'Location is used only while the Safe spaces map is open, to find places near you. Crowd reports you post are tied to the place, not to you, when shown to others.' },
      { heading: 'Health inferences', body: 'Guidance in the app is general triage and never a diagnosis. It is generated from what you log; we do not share it with insurers or third parties.' },
      { heading: 'Where data lives', body: 'Your data is stored with Supabase (hosted PostgreSQL and file storage) in the United States, protected by row-level security so only your account can read your rows.' },
      { heading: 'Your rights', body: 'Export everything at any time from Settings. Request deletion from Settings and we remove your account and all its data after confirming by email. Questions: support@dogbetter.app.' },
      { heading: 'Children', body: 'Dog Better is for adults. We do not knowingly collect information from anyone under 16.' },
    ],
  },
  terms: {
    title: 'Terms of use',
    updated: 'September 2026 (draft)',
    sections: [
      { heading: 'Not veterinary care', body: 'Dog Better helps you notice what changed, decide what to do next, and show a vet or caregiver the full picture. It does not diagnose, prescribe, or replace a licensed veterinarian. If your dog is in distress, contact a vet or emergency clinic immediately.' },
      { heading: 'Your account', body: 'You are responsible for the accuracy of what you log and for keeping your sign-in secure. One account per person; you may add multiple dogs.' },
      { heading: 'Your content', body: 'You own everything you log and upload. You grant us the limited right to store and process it so the app can work for you. You can export or delete it at any time.' },
      { heading: 'Acceptable use', body: 'Do not upload content you do not have the right to share, misuse crowd reporting, or attempt to access other people\u2019s data.' },
      { heading: 'Product links', body: 'Some product recommendations may include affiliate links. Recommendations are driven by your dog\u2019s profile rules first; we only link to a product when it passes them.' },
      { heading: 'Availability', body: 'We aim for the app to work every day, but it is provided as is. We may change or discontinue features with notice where practical. Emergency information, core records, and the care sheet will not be placed behind a paywall.' },
      { heading: 'Liability', body: 'To the extent permitted by law, Dog Better is not liable for decisions made from information in the app. Always confirm anything health related with your vet.' },
      { heading: 'Contact', body: 'support@dogbetter.app' },
    ],
  },
};
