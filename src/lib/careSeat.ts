import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

export type CareRole = 'partner' | 'walker' | 'sitter';

export type CareSeat = {
  dogId: string;
  sitterName: string;
  role: CareRole;
  startedAt: string;
  endsAt: string;
};

const keyFor = (dogId: string) => `dogbetter.careSeat.${dogId}`;

let live: CareSeat | null = null;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((fn) => fn());
}

function stillOpen(seat: CareSeat, now = Date.now()) {
  return new Date(seat.endsAt).getTime() > now;
}

export async function hydrateSeat(dogId: string | undefined) {
  if (!dogId) {
    live = null;
    emit();
    return null;
  }
  const next = await readSeat(dogId);
  live = next;
  emit();
  return next;
}

export function peekSeat(dogId: string | undefined): CareSeat | null {
  if (!dogId || !live || live.dogId !== dogId) return null;
  return stillOpen(live) ? live : null;
}

export function seatActorName(dogId: string | undefined, fallback: string) {
  return peekSeat(dogId)?.sitterName ?? fallback;
}

export const CARE_ROLES: { id: CareRole; label: string; line: string }[] = [
  { id: 'partner', label: 'Partner or family', line: 'Same house. Meals, doses, and walks on this phone get their name.' },
  { id: 'walker', label: 'Walker', line: 'A loop and a handoff. Walks and outdoor notes land under their name.' },
  { id: 'sitter', label: 'Sitter or daycare', line: 'A few hours. Doses and meals they mark say who gave them.' },
];

export function roleLabel(role: CareRole) {
  return CARE_ROLES.find((r) => r.id === role)?.label ?? role;
}

export async function readSeat(dogId: string): Promise<CareSeat | null> {
  try {
    const raw = await AsyncStorage.getItem(keyFor(dogId));
    if (!raw) return null;
    const seat = JSON.parse(raw) as CareSeat;
    if (!seat?.dogId || seat.dogId !== dogId) return null;
    return stillOpen(seat) ? seat : null;
  } catch {
    return null;
  }
}

export async function startSeat(input: Omit<CareSeat, 'startedAt'>): Promise<CareSeat> {
  const seat: CareSeat = { ...input, startedAt: new Date().toISOString() };
  await AsyncStorage.setItem(keyFor(input.dogId), JSON.stringify(seat));
  live = seat;
  emit();
  return seat;
}

export async function endSeat(dogId: string) {
  await AsyncStorage.removeItem(keyFor(dogId));
  if (live?.dogId === dogId) live = null;
  emit();
}

export function useCareSeat(dogId: string | undefined) {
  const [seat, setSeat] = useState<CareSeat | null>(null);
  const [loaded, setLoaded] = useState(!dogId);

  const reload = useCallback(async () => {
    if (!dogId) {
      live = null;
      setSeat(null);
      setLoaded(true);
      return;
    }
    const next = await readSeat(dogId);
    live = next;
    setSeat(next);
    setLoaded(true);
    emit();
  }, [dogId]);

  useEffect(() => {
    void Promise.resolve().then(reload);
  }, [reload]);

  useEffect(() => {
    const tick = () => setSeat(dogId ? peekSeat(dogId) : null);
    listeners.add(tick);
    return () => {
      listeners.delete(tick);
    };
  }, [dogId]);

  const start = useCallback(
    async (input: { sitterName: string; role: CareRole; hours: number }) => {
      if (!dogId) return null;
      const ends = new Date();
      ends.setHours(ends.getHours() + input.hours);
      return startSeat({ dogId, sitterName: input.sitterName.trim(), role: input.role, endsAt: ends.toISOString() });
    },
    [dogId],
  );

  const end = useCallback(async () => {
    if (!dogId) return;
    await endSeat(dogId);
  }, [dogId]);

  return { seat, loaded, start, end, reload };
}
