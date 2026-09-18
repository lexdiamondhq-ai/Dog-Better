import type { ImageSource } from 'expo-image';

export type PackCard = {
  id: string;
  name: string;
  breed: string;
  art: ImageSource;
  question: string;
  choices: string[];
  answer: string;
  story: string;
};

const PACK: PackCard[] = [
  {
    id: 'pug',
    name: 'Pip',
    breed: 'Pug',
    art: require('@/assets/brand/mascot.png'),
    question: 'Pugs were palace dogs in which empire before they ever saw Europe?',
    choices: ['Imperial China', 'Ottoman Turkey', 'Mughal India', 'Ancient Egypt'],
    answer: 'Imperial China',
    story: 'The pug sat beside Chinese emperors for centuries. Dutch traders later carried them west, and they never lost the job of being the room\'s favorite face.',
  },
  {
    id: 'golden',
    name: 'Clover',
    breed: 'Golden Retriever',
    art: require('@/assets/learn/breeds/golden.png'),
    question: 'The first Golden Retrievers were bred in which country, for water and field work?',
    choices: ['Scotland', 'Canada', 'Sweden', 'Ireland'],
    answer: 'Scotland',
    story: 'On a Highland estate, Lord Tweedmouth crossed a yellow retriever with a Tweed Water Spaniel. The gold coat was for the work, not the portrait.',
  },
  {
    id: 'husky',
    name: 'Nori',
    breed: 'Siberian Husky',
    art: require('@/assets/learn/breeds/husky.png'),
    question: 'Siberian Huskies were shaped by which people to pull light sleds over long, cold miles?',
    choices: ['The Chukchi', 'The Inuit of Greenland', 'The Sami', 'The Cossacks'],
    answer: 'The Chukchi',
    story: 'The Chukchi of Siberia needed a dog that could run far on little food and still sleep in the tent. That is why a husky still looks at you like family.',
  },
  {
    id: 'dachshund',
    name: 'Mochi',
    breed: 'Dachshund',
    art: require('@/assets/learn/breeds/dachshund.png'),
    question: 'Dachshunds were built in Germany to go underground after which animal?',
    choices: ['Badger', 'Fox', 'Rabbit', 'Otter'],
    answer: 'Badger',
    story: 'Dachs means badger. The long back and brave chest were a tool: a dog who could follow a fight into a den and still be carried home under an arm.',
  },
  {
    id: 'corgi',
    name: 'Bramble',
    breed: 'Pembroke Welsh Corgi',
    art: require('@/assets/learn/breeds/corgi.png'),
    question: 'Welsh Corgis earned their keep by nipping the heels of which animals?',
    choices: ['Cattle', 'Sheep only', 'Carriage horses', 'Geese'],
    answer: 'Cattle',
    story: 'Low dogs could duck a kick. Farmers in Wales used that height as a feature. Later the same outline sat on a palace sofa, still watching the room.',
  },
  {
    id: 'collie',
    name: 'Wren',
    breed: 'Border Collie',
    art: require('@/assets/learn/breeds/collie.png'),
    question: 'Border Collies take their name from the border of which two countries?',
    choices: ['England and Scotland', 'Ireland and Wales', 'France and Spain', 'Norway and Sweden'],
    answer: 'England and Scotland',
    story: 'On those hills, a dog who could think with a shepherd was worth more than a dog who only chased. The stare, the crouch, the patience: that is the work.',
  },
  {
    id: 'frenchie',
    name: 'Fig',
    breed: 'French Bulldog',
    art: require('@/assets/learn/breeds/frenchie.png'),
    question: 'French Bulldogs became a city dog after lace workers carried smaller English bulldogs to which country?',
    choices: ['France', 'Belgium', 'Italy', 'Spain'],
    answer: 'France',
    story: 'Nottingham lace makers crossed the Channel with compact bulldogs. Paris cafes did the rest. The bat ears were a fashion the breed kept.',
  },
];

function hash(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function shuffle<T>(list: T[], seed: string): T[] {
  const next = [...list];
  let s = hash(seed);
  for (let i = next.length - 1; i > 0; i -= 1) {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    const j = s % (i + 1);
    const a = next[i];
    const b = next[j];
    if (a === undefined || b === undefined) continue;
    next[i] = b;
    next[j] = a;
  }
  return next;
}

export const PACK_HAND = 5;

export function dealPack(seed: string, count = PACK_HAND): PackCard[] {
  return shuffle(PACK, seed)
    .slice(0, count)
    .map((card) => ({ ...card, choices: shuffle(card.choices, `${seed}:${card.id}`) }));
}
