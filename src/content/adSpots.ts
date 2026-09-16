import type { IconName } from '@/components/ui/Icon';
import { AFFILIATE_DISCLOSURE, INSURANCE_PARTNERS } from '@/content/partners';
import { amazonSearch } from '@/lib/shop';
import type { Tip } from '@/engine/guidance';

export type AdPlacement = 'track' | 'track-end' | 'learn' | 'community' | 'walk-spots';

export type AdSpot = {
  id: string;
  icon: IconName;
  title: string;
  line: string;
  /** Shop search, a maps query, an affiliate URL, or the in-app shop. */
  open: { kind: 'url'; url: string } | { kind: 'shop' };
  disclosure: string;
};

function mapsQuery(q: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}

const LEARN_BY_TOPIC: Record<Tip['topic'], AdSpot> = {
  training: {
    id: 'learn-treats',
    icon: 'paw',
    title: 'Training treats',
    line: 'Pea-sized, so twenty reps do not blow the treat budget.',
    open: { kind: 'url', url: amazonSearch('soft training treats for dogs') },
    disclosure: AFFILIATE_DISCLOSURE,
  },
  health: {
    id: 'learn-care',
    icon: 'care',
    title: 'Care kit',
    line: 'Brush, nails, and a walk-bag first-aid tin. Not a stand-in for your vet.',
    open: { kind: 'url', url: amazonSearch('dog first aid kit') },
    disclosure: AFFILIATE_DISCLOSURE,
  },
  enrichment: {
    id: 'learn-puzzle',
    icon: 'toy',
    title: 'Puzzle feeder',
    line: 'Same dinner, longer brain work.',
    open: { kind: 'url', url: amazonSearch('dog puzzle feeder') },
    disclosure: AFFILIATE_DISCLOSURE,
  },
  safety: {
    id: 'learn-harness',
    icon: 'walk',
    title: 'Harness and leash',
    line: 'A fitted harness stops pulling better than a tighter collar.',
    open: { kind: 'url', url: amazonSearch('dog harness and leash') },
    disclosure: AFFILIATE_DISCLOSURE,
  },
  routine: {
    id: 'learn-walk-kit',
    icon: 'walk',
    title: 'Daily walk gear',
    line: 'Bags, a light, and a leash they will not chew through.',
    open: { kind: 'url', url: amazonSearch('dog walk essentials') },
    disclosure: AFFILIATE_DISCLOSURE,
  },
};

const POOL: Record<AdPlacement, AdSpot[]> = {
  track: [
    {
      id: 'track-harness',
      icon: 'walk',
      title: 'Harness sized to this dog',
      line: 'Front-clip styles for pullers. We may earn a commission.',
      open: { kind: 'url', url: amazonSearch('no pull dog harness') },
      disclosure: AFFILIATE_DISCLOSURE,
    },
    {
      id: 'track-bags',
      icon: 'walk',
      title: 'Bags and waste kit',
      line: 'The one thing every walker reorders.',
      open: { kind: 'url', url: amazonSearch('dog poop bags') },
      disclosure: AFFILIATE_DISCLOSURE,
    },
  ],
  'track-end': [
    {
      id: 'track-insurance',
      icon: 'shield',
      title: INSURANCE_PARTNERS[0].name,
      line: INSURANCE_PARTNERS[0].tagline,
      open: { kind: 'url', url: INSURANCE_PARTNERS[0].url },
      disclosure: INSURANCE_PARTNERS[0].disclosure,
    },
    {
      id: 'track-shop',
      icon: 'link',
      title: 'Shop for this dog',
      line: 'Food, chews, and gear. Amazon links with our tag.',
      open: { kind: 'shop' },
      disclosure: AFFILIATE_DISCLOSURE,
    },
  ],
  learn: [LEARN_BY_TOPIC.enrichment],
  community: [
    {
      id: 'local-walker',
      icon: 'walk',
      title: 'Walkers near you',
      line: 'A sitter or walker two streets over. Partner listings. Premium drops these.',
      open: { kind: 'url', url: mapsQuery('dog walker near me') },
      disclosure: 'Local partner slot. Dog Better may earn a fee when a business is featured here.',
    },
    {
      id: 'local-groom',
      icon: 'happy',
      title: 'Grooms nearby',
      line: 'A wash and a nail trim without the drive across town.',
      open: { kind: 'url', url: mapsQuery('dog groomer near me') },
      disclosure: 'Local partner slot. Dog Better may earn a fee when a business is featured here.',
    },
    {
      id: 'local-daycare',
      icon: 'careTeam',
      title: 'Daycare and drop-in',
      line: 'Places that take a dog for an afternoon, not a boarding week.',
      open: { kind: 'url', url: mapsQuery('dog daycare near me') },
      disclosure: 'Local partner slot. Dog Better may earn a fee when a business is featured here.',
    },
  ],
  'walk-spots': [
    {
      id: 'spot-patio',
      icon: 'meal',
      title: 'Dog-friendly patio',
      line: 'A water bowl and a seat after the loop. Partner listings.',
      open: { kind: 'url', url: mapsQuery('dog friendly patio near me') },
      disclosure: 'Local partner slot. Dog Better may earn a fee when a business is featured here.',
    },
    {
      id: 'spot-groom',
      icon: 'happy',
      title: 'Groom after the walk',
      line: 'Muddy paws, a hose, and a dry-off. Nearby shops can pin this slot.',
      open: { kind: 'url', url: mapsQuery('dog groomer near me') },
      disclosure: 'Local partner slot. Dog Better may earn a fee when a business is featured here.',
    },
  ],
};

/** Stable pick for the local day so the slot does not flicker on every render. */
export function pickAdSpot(placement: AdPlacement, topic?: Tip['topic']) {
  if (placement === 'learn' && topic) return LEARN_BY_TOPIC[topic];
  const pool = POOL[placement];
  const day = Math.floor(Date.now() / 86400000);
  return pool[day % pool.length];
}
