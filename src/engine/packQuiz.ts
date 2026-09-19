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

const ART = {
  pug: require('@/assets/brand/mascot.png'),
  golden: require('@/assets/learn/breeds/golden.png'),
  husky: require('@/assets/learn/breeds/husky.png'),
  dachshund: require('@/assets/learn/breeds/dachshund.png'),
  corgi: require('@/assets/learn/breeds/corgi.png'),
  collie: require('@/assets/learn/breeds/collie.png'),
  frenchie: require('@/assets/learn/breeds/frenchie.png'),
} as const;

type ArtKey = keyof typeof ART;

function card(
  id: string,
  name: string,
  breed: string,
  art: ArtKey,
  question: string,
  choices: string[],
  answer: string,
  story: string,
): PackCard {
  return { id, name, breed, art: ART[art], question, choices, answer, story };
}

/** A big rotating pack. Five cards a night. None of these are the household dog. */
export const PACK: PackCard[] = [
  card('pug-empire', 'Pip', 'Pug', 'pug', 'Pugs were palace dogs in which empire before they ever saw Europe?', ['Imperial China', 'Ottoman Turkey', 'Mughal India', 'Ancient Egypt'], 'Imperial China', 'The pug sat beside Chinese emperors for centuries. Dutch traders later carried them west, and they never lost the job of being the room\'s favorite face.'),
  card('pug-folds', 'Pip', 'Pug', 'pug', 'A pug\'s face folds need wiping because trapped moisture leads to what?', ['Skin fold infections', 'Ear mites only', 'Tooth loss', 'Hip dysplasia'], 'Skin fold infections', 'The cute wrinkles are a moisture trap. A daily wipe and a dry face keep the folds from smelling like a forgotten washcloth.'),
  card('golden-land', 'Clover', 'Golden Retriever', 'golden', 'The first Golden Retrievers were bred in which country, for water and field work?', ['Scotland', 'Canada', 'Sweden', 'Ireland'], 'Scotland', 'On a Highland estate, Lord Tweedmouth crossed a yellow retriever with a Tweed Water Spaniel. The gold coat was for the work, not the portrait.'),
  card('golden-mouth', 'Clover', 'Golden Retriever', 'golden', 'Goldens were bred to carry birds gently. That soft mouth is why they often do what with household stuff?', ['Parade shoes and socks', 'Ignore toys', 'Guard the yard', 'Sleep through dinner'], 'Parade shoes and socks', 'The retrieve is the job. A shoe in the hall is not theft. It is a golden doing the thing they were built for. Trade, do not chase.'),
  card('husky-people', 'Nori', 'Siberian Husky', 'husky', 'Siberian Huskies were shaped by which people to pull light sleds over long, cold miles?', ['The Chukchi', 'The Inuit of Greenland', 'The Sami', 'The Cossacks'], 'The Chukchi', 'The Chukchi of Siberia needed a dog that could run far on little food and still sleep in the tent. That is why a husky still looks at you like family.'),
  card('husky-talk', 'Nori', 'Siberian Husky', 'husky', 'Huskies howl and "talk" more than they bark. That voice was useful for what in the Arctic?', ['Signalling over long snow', 'Scaring wolves off the sled', 'Waking the household', 'Herding reindeer'], 'Signalling over long snow', 'A bark dies close. A howl carries. The voice is not a defect. Give them a job and a long walk or the sofa becomes the audience.'),
  card('dachs-badger', 'Mochi', 'Dachshund', 'dachshund', 'Dachshunds were built in Germany to go underground after which animal?', ['Badger', 'Fox', 'Rabbit', 'Otter'], 'Badger', 'Dachs means badger. The long back and brave chest were a tool: a dog who could follow a fight into a den and still be carried home under an arm.'),
  card('dachs-stairs', 'Mochi', 'Dachshund', 'dachshund', 'That long back is the breed\'s risk. What should you skip as daily exercise?', ['Repeated jumping on and off the sofa', 'Short sniff walks', 'Gentle tug on the floor', 'Puzzle feeders'], 'Repeated jumping on and off the sofa', 'The den dog was not built for a leap onto a couch six times an hour. Ramps and a lift at the bed save the disc later.'),
  card('corgi-cattle', 'Bramble', 'Pembroke Welsh Corgi', 'corgi', 'Welsh Corgis earned their keep by nipping the heels of which animals?', ['Cattle', 'Sheep only', 'Carriage horses', 'Geese'], 'Cattle', 'Low dogs could duck a kick. Farmers in Wales used that height as a feature. Later the same outline sat on a palace sofa, still watching the room.'),
  card('corgi-herd', 'Bramble', 'Pembroke Welsh Corgi', 'corgi', 'A corgi who nips heels on a walk is often repeating which old job?', ['Moving cattle by ankle', 'Guarding a throne', 'Pointing birds', 'Pulling a cart'], 'Moving cattle by ankle', 'The nip is the work, not spite. Teach a watch-me and a settle before the sidewalk becomes a herd.'),
  card('collie-border', 'Wren', 'Border Collie', 'collie', 'Border Collies take their name from the border of which two countries?', ['England and Scotland', 'Ireland and Wales', 'France and Spain', 'Norway and Sweden'], 'England and Scotland', 'On those hills, a dog who could think with a shepherd was worth more than a dog who only chased. The stare, the crouch, the patience: that is the work.'),
  card('collie-stare', 'Wren', 'Border Collie', 'collie', 'The border collie eye, the intense stare, was bred for what?', ['Holding sheep with a look', 'Intimidating other dogs', 'Finding lost people', 'Watching the oven'], 'Holding sheep with a look', 'That stare is a tool. Without sheep, it lands on bikes, kids, and shadows. A daily job (search, tricks, a flirt pole with rests) keeps the brain from inventing work.'),
  card('frenchie-paris', 'Fig', 'French Bulldog', 'frenchie', 'French Bulldogs became a city dog after lace workers carried smaller English bulldogs to which country?', ['France', 'Belgium', 'Italy', 'Spain'], 'France', 'Nottingham lace makers crossed the Channel with compact bulldogs. Paris cafes did the rest. The bat ears were a fashion the breed kept.'),
  card('frenchie-heat', 'Fig', 'French Bulldog', 'frenchie', 'Frenchies overheat fast because of their short muzzle. What is the first summer rule?', ['Walk in the cool hours, never midday pavement', 'Run them farther to build stamina', 'Skip water so they learn to pace', 'A winter coat in July'], 'Walk in the cool hours, never midday pavement', 'Brachycephalic dogs dump heat poorly. Shade, water, and short grass loops beat a heroic noon march.'),

  card('lab-work', 'Maple', 'Labrador Retriever', 'golden', 'Labs were first working dogs in which place, hauling nets and fetching fish?', ['Newfoundland', 'Alaska', 'The Netherlands', 'Japan'], 'Newfoundland', 'Before they were America\'s favorite sofa dog, they were a fisherman\'s extra pair of hands. The otter tail is a rudder. The mouth is still built to carry, not crush.'),
  card('lab-tail', 'Maple', 'Labrador Retriever', 'golden', 'A Lab\'s thick tail is nicknamed what, because it steers in water?', ['Otter tail', 'Beaver paddle', 'Rudder brush', 'Whip tail'], 'Otter tail', 'That heavy tail knocks coffee off a table and also keeps a swimming dog straight. Two jobs. One casualty: the end table.'),
  card('beagle-nose', 'Bean', 'Beagle', 'dachshund', 'A beagle\'s nose is famous. About how many scent receptors do they carry, give or take a lot?', ['About 220 million', 'About 5 million, like people', 'About 20 million', 'They hunt by sight only'], 'About 220 million', 'A person has about 5 million. Bean is not ignoring you on a walk. The sidewalk is a novel. A long line and a sniff budget beat a debate.'),
  card('beagle-pack', 'Bean', 'Beagle', 'dachshund', 'Beagles were bred to hunt in packs. That is why many of them do what when left alone?', ['Bay and look for the rest of the pack', 'Guard the porch in silence', 'Herd the cats', 'Sleep 18 hours without a sound'], 'Bay and look for the rest of the pack', 'The voice is a feature. Company, a puzzle, and a tired nose help. A beagle is a small hound, not a quiet apartment rumor.'),
  card('shiba-fox', 'Tater', 'Shiba Inu', 'husky', 'Shiba Inu come from which country, first used to flush birds and small game in the hills?', ['Japan', 'Korea', 'Siberia', 'Finland'], 'Japan', 'Shiba once meant a small brushwood dog. The curly tail and the side-eye are old. So is the independent streak. Recall is a project, not a gift.'),
  card('shiba-scream', 'Tater', 'Shiba Inu', 'husky', 'The "shiba scream" is most often heard when they are what?', ['Restrained or deeply offended', 'Hungry for breakfast', 'Meeting a puppy', 'Asleep on their back'], 'Restrained or deeply offended', 'Nail trims, a tight hug, a bath. The volume is theatrical. Go slow, treat heavily, and do not take it as a debate you can win by holding tighter.'),
  card('dane-size', 'Goose', 'Great Dane', 'collie', 'Great Danes are German, not Danish. They were first used to hunt which animal?', ['Wild boar', 'Wolves only', 'Deer on ice', 'Bear in the Alps'], 'Wild boar', 'The height is the leftover of a hunter. A Dane puppy looks like a horse and still has puppy joints. No marathon walks until the growth plates close.'),
  card('dane-sit', 'Goose', 'Great Dane', 'collie', 'A grown Dane leaning on you is often called what?', ['A lean, not a plot', 'Herding', 'A play bow', 'Guarding the door'], 'A lean, not a plot', 'They sit on people because the people are furniture-sized. Teach an off switch early. Your lap will thank you at 140 pounds.'),
  card('chi-warm', 'Pebble', 'Chihuahua', 'pug', 'Chihuahuas come from which country, and still hate the cold more than most dogs?', ['Mexico', 'Spain', 'Peru', 'Portugal'], 'Mexico', 'A tiny body dumps heat fast. A sweater is not fashion. It is physics. They also break more easily in a jump off the sofa than a lab does.'),
  card('chi-big', 'Pebble', 'Chihuahua', 'pug', 'A Chihuahua who charges a much larger dog is often doing what old job?', ['Alarm barking at a threat', 'Herding cattle', 'Pointing birds', 'Pulling a sled'], 'Alarm barking at a threat', 'The bravery is real and the math is not. A lift, a treat for quiet, and distance keep Pebble from starting a fight they cannot finish.'),
  card('aussie-eye', 'Huck', 'Australian Shepherd', 'collie', 'Despite the name, Australian Shepherds were developed as ranch dogs in which country?', ['The United States', 'Australia', 'New Zealand', 'Wales'], 'The United States', 'Basque shepherds and western ranches did the work. The merle coat is pretty. The brain still wants a job more than a backyard.'),
  card('aussie-job', 'Huck', 'Australian Shepherd', 'collie', 'An Aussie who herds children in the house is repeating which instinct?', ['Moving the flock together', 'Guarding a throne', 'Flushing rabbits', 'Guarding a cache of food'], 'Moving the flock together', 'Kids on scooters look like sheep that forgot the plan. A structured game outdoors beats a nip on the ankle in the kitchen.'),
  card('boxer-face', 'Olive', 'Boxer', 'frenchie', 'Boxers got the name because they do what in play?', ['Stand up and bat with their paws', 'Box the food bowl around', 'Guard a ring of toys', 'Sleep in a square'], 'Stand up and bat with their paws', 'The punchy paws are play. The short muzzle still overheats. Olive needs shade and a chew, not a noon jog in July.'),
  card('gsd-work', 'Scout', 'German Shepherd', 'collie', 'German Shepherds were first standardized as what kind of working dog?', ['Herding and later police work', 'Sled dogs', 'Palace lap dogs', 'Water retrievers only'], 'Herding and later police work', 'Von Stephanitz wanted a thinking farm dog. The same brain now works search, service, and the living room. Without a job, Scout invents patrols.'),
  card('gsd-hip', 'Scout', 'German Shepherd', 'collie', 'A German Shepherd who bunny-hops or lags on walks as they age is often showing what common breed issue?', ['Hip or elbow strain', 'A sudden food allergy only', 'Boredom barking', 'A too-short leash'], 'Hip or elbow strain', 'The slanted back is a look with a cost. Keep them lean. Stairs and jumping in the truck are the daily wear. A vet decides what the gait means.'),
  card('shih-palace', 'Dumpling', 'Shih Tzu', 'pug', 'Shih Tzu were bred as companion dogs in which palaces?', ['Tibetan and Chinese', 'French and Spanish', 'Ottoman and Persian', 'English and Scottish'], 'Tibetan and Chinese', 'Lion dog, more or less. The coat is a full-time job. A topknot is not cute extra. It keeps hair out of the eyes so they can see the treat.'),
  card('dal-spots', 'Pepper', 'Dalmatian', 'golden', 'Dalmatians earned a living as what in the age of horse-drawn fire coaches?', ['Coach and firehouse dogs', 'Lighthouse keepers', 'Mine dogs', 'Circus only'], 'Coach and firehouse dogs', 'They ran beside horses and guarded the rig. The spots arrive after birth. The breed also drinks more and needs more miles than a couch suggests.'),
  card('dal-ears', 'Pepper', 'Dalmatian', 'golden', 'Dalmatian puppies are usually born looking like what?', ['White, with spots coming later', 'Fully spotted', 'Black, fading to white', 'Striped like a cat'], 'White, with spots coming later', 'The first spots show in the first weeks. Pepper was a blank page. The hearing risk in the breed is why a startle at the door is worth noticing.'),
  card('newf-water', 'Moose', 'Newfoundland', 'husky', 'Newfoundlands have a water-rescue past. Their coat and feet help them do what?', ['Swim in cold water with a drowning person', 'Herd sheep across rivers', 'Pull sleds on ice only', 'Hunt seals from shore'], 'Swim in cold water with a drowning person', 'Webbed feet, a thick coat, and a mouth that can tow. Moose still drools on the kitchen floor. That is the same mouth. Towels are part of the breed.'),
  card('cocker-spaniel', 'Waffles', 'Cocker Spaniel', 'golden', 'Cocker spaniels were named for hunting which bird?', ['Woodcock', 'Peacock', 'Chicken', 'Owl'], 'Woodcock', 'A long-eared bird dog in a small package. Those ears trap moisture. A dry, clean flap after a wet walk is half of coat care.'),
  card('jack-volt', 'Zigzag', 'Jack Russell Terrier', 'dachshund', 'Jack Russells were bred in England to bolt which animal from a den?', ['Fox', 'Badger only', 'Rabbit only', 'Otter'], 'Fox', 'The voltage is the point. A tired Jack is a hobby. An underworked Jack is a remodeling crew. Two jobs a day, not one long scolding.'),
  card('grey-sprint', 'Noodle', 'Greyhound', 'collie', 'Greyhounds are sprint specialists. After a zoom, what do they usually want?', ['A long nap on something soft', 'Another five-mile run', 'A cold river swim', 'A night of barking'], 'A long nap on something soft', 'Forty-five miles an hour, then a couch potato. Noodle is not lazy. The tank is empty. A fence and a soft bed matter more than a hiking club.'),
  card('pom-cloud', 'Button', 'Pomeranian', 'pug', 'Pomeranians are a miniaturized version of which larger sled-type dogs?', ['German Spitz dogs', 'Huskies only', 'Newfoundlands', 'Great Pyrenees'], 'German Spitz dogs', 'The cloud is a double coat. Shaving it to "keep them cool" often ruins the insulation. Brush, do not buzz, unless a vet said so.'),
  card('maltese-silk', 'Crumb', 'Maltese', 'pug', 'Maltese were lap dogs in which ancient sea world?', ['The Mediterranean', 'The North Sea', 'The Great Lakes', 'The South Pacific'], 'The Mediterranean', 'White silk on a Roman sofa. Tear stains and a topknot are maintenance, not vanity. A tiny dog still needs a walk that is not only the hallway.'),
  card('malinois-work', 'Radar', 'Belgian Malinois', 'collie', 'Malinois excel at police and sport work because they were bred to do what all day?', ['Work stock and then keep working', 'Sit in a cafe window', 'Hunt birds from a blind', 'Guard a single doorway in silence'], 'Work stock and then keep working', 'Radar does not want a weekend. They want a career. If you cannot give hours of brain and body, this is the wrong roommate.'),
  card('berner-cart', 'Pudding', 'Bernese Mountain Dog', 'golden', 'Bernese Mountain Dogs from Switzerland were farm dogs who also did what?', ['Pulled carts to market', 'Guarded palaces', 'Hunted boar', 'Herded reindeer'], 'Pulled carts to market', 'Draft dog, companion, three-color postcard. They overheat and they do not love July. Short cool walks and a hard floor beat a sunny hike.'),
  card('boston-tux', 'Pickle', 'Boston Terrier', 'frenchie', 'Boston Terriers were first called Boston Bulls and were bred in which U.S. city as a gentleman\'s companion?', ['Boston', 'Philadelphia', 'Chicago', 'New Orleans'], 'Boston', 'The tux is the look. The short nose is the catch. Pickle overheats and snores. Cool hours, and never a midday pavement dare.'),
  card('heeler-cattle', 'Toast', 'Australian Cattle Dog', 'corgi', 'Cattle dogs (heelers) move stubborn cows by doing what?', ['Nipping heels and ducking the kick', 'Staring until the cow sits', 'Barking them into a barn', 'Leading from the front like a horse'], 'Nipping heels and ducking the kick', 'The speckled coat hid them in the herd. Toast will also heel a jogger. A job, a bite toy, and a clear off switch keep the ankles in the family.'),
  card('akita-japan', 'Miso', 'Akita', 'husky', 'Akitas are a Japanese breed once kept by whom as a noble hunting and guardian dog?', ['Samurai households', 'Fishing fleets', 'Arctic traders', 'Monastery cooks'], 'Samurai households', 'Loyalty stories are real. So is same-sex dog tension. Miso is not a dog-park social director. Parallel walks and a confident handler fit better.'),
  card('sheltie-isle', 'Sprout', 'Shetland Sheepdog', 'collie', 'Shelties come from which islands, herding on poor grass in hard weather?', ['The Shetland Islands', 'The Faroes', 'The Azores', 'The Channel Islands'], 'The Shetland Islands', 'A collie sketch in a smaller frame. Sprout will also herd the vacuum. The bark carries. Teach a quiet after the alert, not during it.'),
  card('basset-nose', 'Banjo', 'Basset Hound', 'dachshund', 'A basset\'s long ears and wrinkles help do what on a scent trail?', ['Stir and hold scent up to the nose', 'Scare rabbits into a freeze', 'Keep ticks off the neck', 'Signal the pack with flaps'], 'Stir and hold scent up to the nose', 'The ears are tools. So is the stubborn halt when the trail gets good. A long line, not a debate, is how Banjo still comes home.'),
  card('weim-ghost', 'Lumen', 'Weimaraner', 'collie', 'Weimaraners were German hunting dogs. The silver coat earned them which nickname?', ['The grey ghost', 'The fog hound', 'The palace wolf', 'The night pointer'], 'The grey ghost', 'Velcro with a job. Lumen left alone invents a renovation. They need miles and a person in the room, not a pretty photo and an empty house.'),
  card('whippet-couch', 'Pogo', 'Whippet', 'collie', 'Whippets are sighthounds. Their favorite off-switch after a sprint is usually what?', ['Your sofa, under a blanket', 'A second sprint immediately', 'Guarding the yard all night', 'Swimming laps'], 'Your sofa, under a blanket', 'Thin skin, thin coat, huge heart. Pogo wants a chase and then a nest. A sweater in winter is kindness, not costume.'),
  card('pwd-clip', 'Kelp', 'Portuguese Water Dog', 'husky', 'Portuguese Water Dogs worked on boats. The famous haircut helped with what?', ['Swimming and keeping joints free of wet hair', 'Hiding from sharks', 'Looking like a poodle for shows only', 'Staying warm in the hold'], 'Swimming and keeping joints free of wet hair', 'They retrieved tackle and swam messages between boats. Kelp still wants a job in water. A clip is practical. The brain still needs work on land.'),
  card('iggy-lap', 'Biscotti', 'Italian Greyhound', 'frenchie', 'Italian Greyhounds are a tiny sighthound. They break bones more easily because of what?', ['Long thin legs and a love of the sofa leap', 'Heavy muscle', 'Short twisted legs', 'A thick water coat'], 'Long thin legs and a love of the sofa leap', 'A ramp beats a jump. Biscotti is a hot-water-bottle dog. They shiver, they sprint, they steal the quilt. In that order.'),
  card('wolfhound-hunt', 'Yarrow', 'Irish Wolfhound', 'collie', 'Irish Wolfhounds were bred tall to hunt which animals?', ['Wolves and large game', 'Foxes in dens', 'Rats in barns', 'Birds over water'], 'Wolves and large game', 'The tallest sighthound, and often a quiet housemate. They grow too fast for long runs as puppies. Yarrow needs space and a soft landing, not a puppy marathon.'),
  card('bernard-pass', 'Cobbler', 'Saint Bernard', 'golden', 'Saint Bernards became famous for rescue work in which mountains?', ['The Alps', 'The Rockies', 'The Andes', 'The Pyrenees'], 'The Alps', 'The brandy barrel is a story. The rescue work was real. Cobbler drools, overheats, and still wants to lean on you like a small couch.'),
  card('papillon-ears', 'Pesto', 'Papillon', 'corgi', 'Papillon means butterfly in French, for which feature?', ['The fringed erect ears', 'A butterfly-shaped mark on the back', 'A tail that opens like wings', 'Spots that look like moths'], 'The fringed erect ears', 'A toy dog with a sport brain. Pesto can learn as fast as a big herder. Do not confuse small with simple.'),
  card('samoyed-smile', 'Juniper', 'Samoyed', 'husky', 'Samoyeds were bred by the Samoyedic people to herd what, and to sleep with the family for warmth?', ['Reindeer', 'Sheep', 'Camels', 'Goats only'], 'Reindeer', 'The smile is an upturned mouth that kept drool from icing. The coat is a blizzard. Juniper sheds a whole other dog. A walk in heat is a bad idea.'),
  card('airedale-king', 'Ruckus', 'Airedale Terrier', 'dachshund', 'Airedales are often called the king of terriers because of what?', ['They are the largest terrier', 'They never bark', 'They were palace dogs in China', 'They herd by eye only'], 'They are the largest terrier', 'Otter hunting, wartime messenger, family clown. Ruckus needs a project. A bored Airedale will invent plumbing problems.'),
  card('poodle-work', 'Clementine', 'Standard Poodle', 'golden', 'Poodles were bred as what, not as a circus joke?', ['Water retrievers', 'Lap warmers only', 'Sled dogs', 'Cattle heelers'], 'Water retrievers', 'The clip kept joints free in cold water. The brain is still a working brain. Clementine needs school, not only a haircut.'),
  card('vizsla-velcro', 'Paprika', 'Vizsla', 'golden', 'Vizslas are Hungarian hunting dogs famous for what personality?', ['Velcro. They want to be touching you.', 'Aloof guardian', 'Silent independent den dog', 'A one-person palace dog who ignores guests'], 'Velcro. They want to be touching you.', 'A vizsla on the sofa is the design. Alone for a long day is not. Paprika will help you answer email with a chin on the keyboard.'),
  card('ridgeback-ridge', 'Kito', 'Rhodesian Ridgeback', 'husky', 'Ridgebacks were bred in southern Africa to hunt and hold which animal until people arrived?', ['Lion', 'Elephant', 'Crocodile', 'Ostrich'], 'Lion', 'Hold, not kill. The ridge of backward hair is the look. Kito is athletic and reserved. A fence and a calm hello beat a chaotic dog park.'),
  card('pyr-guard', 'Cloud', 'Great Pyrenees', 'husky', 'Great Pyrenees were bred to do what overnight, often alone with the flock?', ['Guard sheep from wolves and bears', 'Herd by staring', 'Pull milk carts', 'Retrieve from mountain lakes'], 'Guard sheep from wolves and bears', 'Night bark is the job. Cloud will also announce a leaf. They were not bred to be quiet in a townhouse without a conversation about it.'),
  card('staffy-smile', 'Nugget', 'Staffordshire Bull Terrier', 'frenchie', 'Staffies were bred in England as pit and later family dogs. What are they often nicknamed for the face?', ['The nanny smile, or a wide grin', 'The grey ghost', 'The otter tail', 'The butterfly'], 'The nanny smile, or a wide grin', 'Muscles and a soft household streak. Nugget still needs manners around other dogs. The grin is not a free pass at the park gate.'),
  card('basenji-bark', 'Kikuyu', 'Basenji', 'pug', 'Basenjis are famous for what unusual voice?', ['They yodel more than they bark', 'They only howl at sirens', 'They cannot make any sound', 'They roar like a big cat'], 'They yodel more than they bark', 'An old African hunting dog. Cat-clean, climb-curious, and not a golden retriever in a small coat. Kikuyu needs a puzzle and a fence.'),
  card('keeshond-barge', 'Soot', 'Keeshond', 'husky', 'Keeshonden were barge and watchdog dogs in which country?', ['The Netherlands', 'Norway', 'Japan', 'Canada'], 'The Netherlands', 'Spectacles on the face, a plume of a tail, and a lot of opinions about the doorbell. Soot is a talker. That was the barge alarm.'),
];

function hash(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function shuffle<T>(list: T[], seed: string): T[] {
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
    .map((item) => ({ ...item, choices: shuffle(item.choices, `${seed}:${item.id}`) }));
}
