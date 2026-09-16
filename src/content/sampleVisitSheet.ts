/** Fixture discharge so Premium sheet-read can be tested without a real clinic file. */
export const SAMPLE_VISIT_TITLE = 'Sample discharge (Riverview)';

export const SAMPLE_VISIT_SHEET = `
RIVERVIEW ANIMAL CLINIC
Discharge instructions

Patient: house dog
Date: today

Medications to start tonight:
1. Apoquel 16 mg. Give one tablet by mouth every 12 hours WITH FOOD for 14 days.
2. Cephalexin 250 mg. Give one capsule by mouth every 12 hours for 10 days.

Feeding:
Give breakfast at 8:00 AM with the morning pills.
Give dinner at 6:00 PM with the evening pills.

Notes:
Do not skip doses. Call the clinic if vomiting lasts more than one day.
`.trim();
