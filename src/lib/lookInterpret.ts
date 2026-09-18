const OBJECT =
  /\b(macbook|imac|mac\s?mini|laptop|computer|notebook|keyboard|trackpad|iphone|ipad|phone|monitor|screen|display|desk|chair|mug|cup|table|sofa|couch|car|book|bag|remote|bottle|plant|wall|floor|ceiling)\b/i;

export type LookModel = {
  hasDog?: boolean;
  seen?: string;
  title?: string;
  summary?: string;
  checks?: string[];
  next?: string;
  caution?: string;
};

/** True when the model named a thing that is not a living dog. */
export function seenIsNotADog(seen: string | undefined) {
  if (!seen?.trim()) return false;
  return OBJECT.test(seen);
}

/** Only trust a health read when the model explicitly saw a dog and did not name an object. */
export function shouldRefuseLook(parsed: LookModel) {
  if (parsed.hasDog !== true) return true;
  return seenIsNotADog(parsed.seen);
}
