/** One-shot handoff so a park pin or the treat jar can open Track, then start the live walk there. */
type WalkStart = { placeName?: string };
type Listener = (next: WalkStart) => void;

let pending: WalkStart | null = null;
const listeners = new Set<Listener>();

export function queueWalkStart(placeName?: string) {
  const next = { placeName };
  if (listeners.size) {
    listeners.forEach((fn) => fn(next));
    return;
  }
  pending = next;
}

/** When Track is already open, start immediately instead of waiting for a focus event. */
export function watchWalkStart(fn: Listener) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function takeWalkStart() {
  const next = pending;
  pending = null;
  return next;
}
