/** One-shot handoff so a park pin can open Track, then start the live walk there. */
let pending: { placeName?: string } | null = null;

export function queueWalkStart(placeName?: string) {
  pending = { placeName };
}

export function takeWalkStart() {
  const next = pending;
  pending = null;
  return next;
}
