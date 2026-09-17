/**
 * Affiliate partners. Every link here is disclosed in the UI next to the link, is shown only where
 * it is relevant to the dog (never inside emergency or triage flows), and passes the dog's profile
 * rules before it appears. Only programmes that have approved Dog Better belong in this file.
 */

export type Partner = { id: string; name: string; tagline: string; url: string; disclosure: string };

export type ShopCategory = 'food' | 'treats' | 'walk' | 'home' | 'health' | 'grooming';

export type ShopLink = {
  id: string;
  category: ShopCategory;
  title: string;
  why: string;
  query: string;
  size: 'any' | 'small' | 'medium' | 'large';
};

/** Amazon Associates Store ID for Dog Better. Only appended to links once AMAZON_APP_APPROVED is true. */
export const AMAZON_TAG = 'dogbetter20-20';

/**
 * Amazon's Mobile Application Policy: Special Links may only appear in an "Approved Mobile
 * Application", and approval needs a live App Store URL. Ship v1 with this false so every Amazon
 * link opens without a tag (still useful, never a violation). Flip to true once Associates Central
 * lists the app as approved, then submit the next build.
 */
export const AMAZON_APP_APPROVED = false;

/** The sentence Amazon's Operating Agreement asks participants to show. Appears wherever an Amazon link does. */
export const AMAZON_PARTICIPANT_LINE = 'As an Amazon Associate, Dog Better earns from qualifying purchases.';

export const SHOP_CATEGORIES: { id: ShopCategory | 'all'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'food', label: 'Food' },
  { id: 'treats', label: 'Treats' },
  { id: 'walk', label: 'Walk' },
  { id: 'home', label: 'Home' },
  { id: 'health', label: 'Health' },
  { id: 'grooming', label: 'Groom' },
];

export const SHOP_LINKS: ShopLink[] = [
  { id: 'food-adult', category: 'food', title: 'Adult kibble and wet food', why: 'Daily calories start here. Match the bag to this dog’s weight.', query: 'adult dog food', size: 'any' },
  { id: 'food-small', category: 'food', title: 'Small-breed food', why: 'Smaller kibble and calorie density for dogs under about 20 lb.', query: 'small breed dog food', size: 'small' },
  { id: 'food-large', category: 'food', title: 'Large-breed food', why: 'Joint support and larger kibble for dogs over about 50 lb.', query: 'large breed dog food', size: 'large' },
  { id: 'treats-training', category: 'treats', title: 'Training treats', why: 'Pea-sized, so twenty reps do not blow the treat budget.', query: 'soft training treats for dogs', size: 'any' },
  { id: 'treats-dental', category: 'treats', title: 'Dental chews', why: 'A chew that cleans, not a calorie bomb. Scan the label first.', query: 'dog dental chews', size: 'any' },
  { id: 'treats-puzzle', category: 'treats', title: 'Puzzle feeders', why: 'Same dinner, longer brain work. High conversion after Learn tips.', query: 'dog puzzle feeder', size: 'any' },
  { id: 'walk-leash', category: 'walk', title: 'Leash and harness', why: 'Sized to this dog. A fitted harness stops pulling better than a tighter collar.', query: 'dog harness and leash', size: 'any' },
  { id: 'walk-harness-s', category: 'walk', title: 'Small harness', why: 'Step-in styles fit most small chests without slipping.', query: 'small dog harness', size: 'small' },
  { id: 'walk-harness-l', category: 'walk', title: 'Large no-pull harness', why: 'Front-clip harnesses for bigger pullers.', query: 'large no pull dog harness', size: 'large' },
  { id: 'walk-poop', category: 'walk', title: 'Bags and waste kit', why: 'The one thing every walker reorders.', query: 'dog poop bags', size: 'any' },
  { id: 'home-bed', category: 'home', title: 'Bed', why: 'Orthopedic foam matters more after age seven and for heavy dogs.', query: 'orthopedic dog bed', size: 'any' },
  { id: 'home-crate', category: 'home', title: 'Crate', why: 'Measure length while they stretch. Size band is a starting point.', query: 'dog crate', size: 'any' },
  { id: 'home-crate-s', category: 'home', title: 'Small crate', why: 'A crate they can stand and turn in, not a spare room.', query: 'small dog crate', size: 'small' },
  { id: 'home-crate-l', category: 'home', title: 'Large crate', why: '48 inch and up for most large breeds.', query: 'large dog crate 42 48 inch', size: 'large' },
  { id: 'health-brush', category: 'grooming', title: 'Brush and deshed', why: 'Five minutes a day beats a mat later.', query: 'dog deshedding brush', size: 'any' },
  { id: 'health-nails', category: 'grooming', title: 'Nail kit', why: 'Clippers plus styptic. Learn already teaches the slow intro.', query: 'dog nail clippers', size: 'any' },
  { id: 'health-teeth', category: 'health', title: 'Toothbrush and gel', why: 'Daily teeth beat dental cleanings under anesthesia.', query: 'dog toothbrush toothpaste', size: 'any' },
  { id: 'health-firstaid', category: 'health', title: 'First-aid kit', why: 'Not a replacement for emergency mode. For the walk bag.', query: 'dog first aid kit', size: 'any' },
];

/**
 * Pet insurance affiliates. Empty until a real programme (Lemonade Pet, Embrace, Fetch, Trupanion via
 * Impact or CJ) issues a tracked link. A guessed `?ref=` parameter earns nothing and misleads users.
 */
export const INSURANCE_PARTNERS: Partner[] = [];

export const AFFILIATE_DISCLOSURE = `${AMAZON_PARTICIPANT_LINE} Links cost you nothing extra. Recommendations are driven by your dog\u2019s profile, not by commission.`;

/** Local business slots open a plain Maps search today. No business pays for them yet, and the copy says so. */
export const LOCAL_SLOT_DISCLOSURE = 'Opens Maps. Not a paid placement. Premium hides partner cards.';
