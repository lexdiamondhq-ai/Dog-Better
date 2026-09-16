import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';

import { levelFor, REWARDS, type BetterLevel, type RewardKind } from '@/engine/rewards';

import { useAuth } from './auth';

export type PointEntry = {
  id: string;
  kind: RewardKind;
  key: string;
  points: number;
  at: string;
  dogId?: string;
};

type AwardInput = { kind: RewardKind; key: string; dogId?: string };

type Api = {
  loaded: boolean;
  entries: PointEntry[];
  total: number;
  today: number;
  lastAward: PointEntry | null;
  lastLevelUp: BetterLevel | null;
  award: (input: AwardInput) => Promise<PointEntry | null>;
  clearToast: () => void;
  clearLevelUp: () => void;
};

const Ctx = createContext<Api>({
  loaded: false,
  entries: [],
  total: 0,
  today: 0,
  lastAward: null,
  lastLevelUp: null,
  award: async () => null,
  clearToast: () => {},
  clearLevelUp: () => {},
});

function storeKey(userId: string) {
  return `dogbetter.points.v1.${userId}`;
}

function dayStamp(iso: string) {
  return iso.slice(0, 10);
}

function sumForDay(rows: PointEntry[], day: string) {
  return rows.filter((e) => dayStamp(e.at) === day).reduce((sum, e) => sum + e.points, 0);
}

export function PointsProvider({ children }: PropsWithChildren) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [entries, setEntries] = useState<PointEntry[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [lastAward, setLastAward] = useState<PointEntry | null>(null);
  const [lastLevelUp, setLastLevelUp] = useState<BetterLevel | null>(null);
  const [clockDay, setClockDay] = useState('');

  useEffect(() => {
    let cancelled = false;
    void Promise.resolve().then(async () => {
      if (cancelled) return;
      const day = new Date().toISOString().slice(0, 10);
      setClockDay(day);
      if (!userId) {
        setEntries([]);
        setLoaded(true);
        return;
      }
      const raw = await AsyncStorage.getItem(storeKey(userId));
      if (cancelled) return;
      if (raw) {
        try {
          setEntries(JSON.parse(raw) as PointEntry[]);
        } catch {
          setEntries([]);
        }
      } else {
        setEntries([]);
      }
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const persist = useCallback(async (next: PointEntry[]) => {
    if (!userId) return;
    await AsyncStorage.setItem(storeKey(userId), JSON.stringify(next));
  }, [userId]);

  const award = useCallback(
    async (input: AwardInput) => {
      if (!userId) return null;
      const spec = REWARDS[input.kind];
      const now = new Date().toISOString();
      const today = clockDay || dayStamp(now);
      const key = spec.dailyCap ? `${today}:${input.key}` : input.key;
      const existing = entries.find((e) => e.key === key);
      if (existing) return null;
      const todayKind = entries.filter((e) => e.kind === input.kind && dayStamp(e.at) === today).length;
      if (spec.dailyCap && todayKind >= spec.dailyCap) return null;
      const entry: PointEntry = {
        id: `${input.kind}:${key}:${now}`,
        kind: input.kind,
        key,
        points: spec.points,
        at: now,
        dogId: input.dogId,
      };
      const next = [entry, ...entries].slice(0, 400);
      const before = levelFor(entries.reduce((sum, e) => sum + e.points, 0));
      const after = levelFor(next.reduce((sum, e) => sum + e.points, 0));
      setEntries(next);
      setLastAward(entry);
      if (before.name !== after.name) setLastLevelUp(after);
      await persist(next);
      return entry;
    },
    [clockDay, entries, persist, userId],
  );

  const clearToast = useCallback(() => setLastAward(null), []);
  const clearLevelUp = useCallback(() => setLastLevelUp(null), []);

  const today = useMemo(() => (clockDay ? sumForDay(entries, clockDay) : 0), [clockDay, entries]);
  const total = useMemo(() => entries.reduce((sum, e) => sum + e.points, 0), [entries]);

  const value = useMemo<Api>(
    () => ({ loaded, entries, total, today, lastAward, lastLevelUp, award, clearToast, clearLevelUp }),
    [loaded, entries, total, today, lastAward, lastLevelUp, award, clearToast, clearLevelUp],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePoints() {
  return useContext(Ctx);
}

export function useBetterLevel() {
  const { total } = usePoints();
  return levelFor(total);
}
