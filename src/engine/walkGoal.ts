/**
 * Enough walk for this dog today. Breed size and heat, not a leaderboard.
 */

const SHORT = /pug|french|boston|peke|shih|bulldog|boxer|cavalier|griffon|mastiff|chow/i;
const SMALL = /chihuahua|yorkie|maltese|pom|toy|terrier|dachshund|corgi|spaniel|beagle|shihtzu/i;
const LARGE = /lab|retriev|shepherd|husky|malamute|dane|dane|rott|doberman|weim|pointer|vizsla|akita|cane/i;

export function walkGoalMinutes(breed: string | null | undefined, heatF: number | null): { minutes: number; line: string } {
  const name = breed?.trim() || 'this dog';
  let minutes = 35;
  if (breed && SHORT.test(breed)) minutes = 25;
  else if (breed && SMALL.test(breed)) minutes = 28;
  else if (breed && LARGE.test(breed)) minutes = 50;

  if (heatF != null && heatF >= 88) {
    minutes = Math.max(12, Math.round(minutes * 0.55));
    return { minutes, line: `Enough for ${name} in ${Math.round(heatF)}° is about ${minutes} minutes, on grass.` };
  }
  if (heatF != null && heatF <= 35) {
    minutes = Math.max(15, Math.round(minutes * 0.7));
    return { minutes, line: `Enough for ${name} in the cold is about ${minutes} minutes.` };
  }
  return { minutes, line: `Enough for ${name} today is about ${minutes} minutes.` };
}
