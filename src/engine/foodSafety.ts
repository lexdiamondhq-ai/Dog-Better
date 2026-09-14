/**
 * Treat safety engine: matches ingredient text against known canine hazards and sizes
 * everything to the specific dog's weight.
 */

export type Verdict = 'safe' | 'caution' | 'danger' | 'unknown';

export type Hazard = {
  id: string;
  label: string;
  level: 'danger' | 'caution';
  patterns: RegExp[];
  why: string;
  /** Optional weight-scaled dose note. */
  dose?: (weightKg: number) => string;
};

export const HAZARDS: Hazard[] = [
  {
    id: 'xylitol',
    label: 'Xylitol (birch sugar)',
    level: 'danger',
    patterns: [/xylitol/i, /birch\s*sugar/i, /\bE ?967\b/i],
    why: 'Causes a sudden insulin surge and liver failure in dogs. Common in sugar-free gum, peanut butter, and baked goods.',
    dose: (kg) => `As little as ${(0.1 * kg).toFixed(1)} g can trigger hypoglycemia at ${kg} kg; one stick of gum can be enough.`,
  },
  {
    id: 'chocolate',
    label: 'Chocolate / cocoa',
    level: 'danger',
    patterns: [/chocolate/i, /cocoa/i, /cacao/i, /theobromine/i],
    why: 'Theobromine and caffeine overstimulate the heart and nervous system.',
    dose: (kg) => `Symptoms can start around ${Math.round((20 * kg) / 5.5)} g of dark chocolate or ${Math.round((20 * kg) / 2.3)} g of milk chocolate at ${kg} kg.`,
  },
  {
    id: 'grapes',
    label: 'Grapes / raisins',
    level: 'danger',
    patterns: [/\bgrapes?\b/i, /raisins?/i, /sultanas?/i, /currants?/i],
    why: 'Can cause acute kidney failure. There is no known safe amount.',
  },
  {
    id: 'allium',
    label: 'Onion / garlic family',
    level: 'danger',
    patterns: [/onions?/i, /garlic/i, /chives?/i, /leeks?/i, /shallots?/i, /scallions?/i],
    why: 'Damages red blood cells and causes anaemia, including in powdered form.',
    // Toxicity is reported from about 0.5% of body weight in onion.
    dose: (kg) => `Around ${Math.round(kg * 5)} g of onion (0.5% of body weight) can be toxic at ${kg} kg.`,
  },
  {
    id: 'macadamia',
    label: 'Macadamia nuts',
    level: 'danger',
    patterns: [/macadamia/i],
    why: 'Causes weakness, tremors, and vomiting, usually within 12 hours.',
  },
  {
    id: 'alcohol',
    label: 'Alcohol',
    level: 'danger',
    patterns: [/alcohol/i, /ethanol/i, /\bwine\b/i, /\bbeer\b/i, /liqueur/i, /\brum\b/i, /vodka/i, /whisk(e)?y/i],
    why: 'Even small amounts depress breathing and blood sugar.',
  },
  {
    id: 'caffeine',
    label: 'Caffeine',
    level: 'danger',
    patterns: [/caffeine/i, /\bcoffee\b/i, /espresso/i, /guarana/i, /\bmat[eé]\b/i, /energy drink/i, /green tea/i, /black tea/i],
    why: 'Stimulant toxicity: racing heart, tremors, seizures.',
  },
  {
    id: 'nutmeg',
    label: 'Nutmeg',
    level: 'danger',
    patterns: [/nutmeg/i, /myristicin/i],
    why: 'Myristicin causes hallucinations, high heart rate, and seizures in larger doses.',
  },
  {
    id: 'hops',
    label: 'Hops',
    level: 'danger',
    patterns: [/\bhops?\b/i],
    why: 'Triggers malignant hyperthermia, a dangerous spike in body temperature.',
  },
  {
    id: 'raw_dough',
    label: 'Raw yeast dough',
    level: 'danger',
    patterns: [/raw\s+dough/i, /unbaked\s+dough/i, /bread\s+dough/i],
    why: 'Expands in the stomach and ferments into alcohol.',
  },
  {
    id: 'cannabis',
    label: 'THC / cannabis',
    level: 'danger',
    patterns: [/\bTHC\b/, /cannabis/i, /marijuana/i],
    why: 'Dogs are far more sensitive to THC than people.',
  },
  {
    id: 'avocado',
    label: 'Avocado',
    level: 'caution',
    patterns: [/avocado/i, /guacamole/i],
    why: 'Persin can upset the stomach, and the pit is a choking and blockage risk. Small amounts of flesh are usually tolerated.',
  },
  {
    id: 'dairy',
    label: 'Dairy',
    level: 'caution',
    patterns: [/\bmilk\b/i, /cheese/i, /cream\b/i, /yog(h)?urt/i, /butter/i, /whey/i, /lactose/i],
    why: 'Most adult dogs are lactose intolerant: expect gas or loose stool.',
  },
  {
    id: 'salt',
    label: 'High salt',
    level: 'caution',
    patterns: [/\bsalt\b/i, /sodium/i, /brine/i],
    why: 'Salty snacks cause excessive thirst and, in quantity, sodium ion poisoning.',
  },
  {
    id: 'sugar',
    label: 'Added sugar',
    level: 'caution',
    patterns: [/\bsugar\b/i, /syrup/i, /glucose/i, /fructose/i, /dextrose/i, /honey/i, /molasses/i],
    why: 'Empty calories that drive weight gain and dental disease.',
  },
  {
    id: 'sweeteners',
    label: 'Artificial sweeteners',
    level: 'caution',
    patterns: [/aspartame/i, /sucralose/i, /saccharin/i, /sorbitol/i, /erythritol/i, /stevia/i, /acesulfame/i],
    why: 'Not as dangerous as xylitol, but can cause digestive upset.',
  },
  {
    id: 'nuts',
    label: 'Nuts',
    level: 'caution',
    patterns: [/walnuts?/i, /almonds?/i, /pecans?/i, /pistachios?/i, /cashews?/i, /hazelnuts?/i, /brazil nuts?/i],
    why: 'High fat (pancreatitis risk) and easy to choke on. Mouldy walnuts are outright toxic.',
  },
  {
    id: 'fatty',
    label: 'Fried or fatty',
    level: 'caution',
    patterns: [/fried/i, /\blard\b/i, /bacon/i, /sausage/i, /\bfat\b/i, /shortening/i, /palm oil/i],
    why: 'Rich fatty foods are the number one trigger of pancreatitis.',
  },
  {
    id: 'spicy',
    label: 'Spicy',
    level: 'caution',
    patterns: [/chil(l)?i/i, /cayenne/i, /jalape[nñ]o/i, /hot sauce/i, /paprika/i, /black pepper/i, /capsaicin/i],
    why: 'Burns the mouth and stomach lining; expect drooling and diarrhea.',
  },
  {
    id: 'citrus',
    label: 'Citrus peel / oils',
    level: 'caution',
    patterns: [/lemon/i, /\blime\b/i, /orange peel/i, /citrus oil/i, /grapefruit/i],
    why: 'Peel and essential oils irritate the gut; a little flesh is fine.',
  },
  {
    id: 'bones',
    label: 'Cooked bones',
    level: 'caution',
    patterns: [/cooked bones?/i, /chicken bones?/i, /rib bones?/i],
    why: 'Cooked bones splinter and can perforate the gut.',
  },
  {
    id: 'cinnamon',
    label: 'Cinnamon',
    level: 'caution',
    patterns: [/cinnamon/i],
    why: 'Fine in a pinch, but larger amounts irritate the mouth and lower blood sugar.',
  },
  {
    id: 'mushrooms',
    label: 'Mushrooms',
    level: 'caution',
    patterns: [/mushrooms?/i, /fungi/i],
    why: 'Store-bought mushrooms are fine; wild ones can be deadly. Treat unknown mushrooms as dangerous.',
  },
];

export type Flag = { id: string; label: string; level: 'danger' | 'caution'; why: string; dose?: string; matched: string };

export type SafetyReport = {
  verdict: Verdict;
  flags: Flag[];
  headline: string;
  summary: string;
  /** Daily treat calorie budget for this dog (10% rule). */
  treatBudgetKcal: number | null;
  /** How many grams of this product fit the treat budget, if calories are known. */
  budgetGrams: number | null;
  allergyHits: string[];
};

/** Resting energy requirement scaled for a typical neutered adult (factor 1.6). */
export function dailyCalories(weightKg: number) {
  return Math.round(70 * Math.pow(weightKg, 0.75) * 1.6);
}

export function analyzeIngredients(opts: {
  ingredientsText: string | null | undefined;
  weightKg?: number | null;
  kcalPer100g?: number | null;
  allergies?: string[];
}): SafetyReport {
  const text = (opts.ingredientsText ?? '').trim();
  const weight = opts.weightKg && opts.weightKg > 0 ? opts.weightKg : null;
  const treatBudgetKcal = weight ? Math.round(dailyCalories(weight) * 0.1) : null;
  const budgetGrams = treatBudgetKcal && opts.kcalPer100g ? Math.max(1, Math.round((treatBudgetKcal / opts.kcalPer100g) * 100)) : null;

  const allergyHits = (opts.allergies ?? []).filter((a) => a.trim() && new RegExp(escapeRegExp(a.trim()), 'i').test(text));

  if (!text) {
    return {
      verdict: 'unknown',
      flags: [],
      headline: 'No ingredient list found',
      summary: 'We could not read the ingredients for this product. Check the label for chocolate, xylitol, grapes, onion, or garlic before sharing.',
      treatBudgetKcal,
      budgetGrams,
      allergyHits,
    };
  }

  const flags: Flag[] = [];
  for (const h of HAZARDS) {
    for (const p of h.patterns) {
      const m = text.match(p);
      if (m) {
        flags.push({ id: h.id, label: h.label, level: h.level, why: h.why, dose: weight && h.dose ? h.dose(weight) : undefined, matched: m[0] });
        break;
      }
    }
  }

  const dangers = flags.filter((f) => f.level === 'danger');
  const cautions = flags.filter((f) => f.level === 'caution');

  let verdict: Verdict = 'safe';
  let headline = 'Looks safe to share';
  let summary = 'Nothing on our hazard list. Keep it to a small portion so treats stay under 10% of daily calories.';

  if (dangers.length) {
    verdict = 'danger';
    headline = 'Do not share this';
    summary = `Contains ${dangers.map((d) => d.label.toLowerCase()).join(', ')}, which ${dangers.length > 1 ? 'are' : 'is'} toxic to dogs.`;
  } else if (allergyHits.length) {
    verdict = 'danger';
    headline = 'Contains a known allergen';
    summary = `Matches ${allergyHits.join(', ')} from this dog's allergy list.`;
  } else if (cautions.length) {
    verdict = 'caution';
    headline = 'Only a tiny taste';
    summary = `Not toxic, but ${cautions.map((c) => c.label.toLowerCase()).join(', ')} can upset a dog's stomach. A lick is fine, a serving is not.`;
  }

  return { verdict, flags: [...dangers, ...cautions], headline, summary, treatBudgetKcal, budgetGrams, allergyHits };
}

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
