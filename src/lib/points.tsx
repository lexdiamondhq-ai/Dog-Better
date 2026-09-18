import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import { AppState } from 'react-native';

import { JAR_POCKET, levelFor, REWARDS, type BetterLevel, type RewardKind } from '@/engine/rewards';

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
  todayCount: number;
  pocket: number;
  todayCounts: Partial<Record<RewardKind, number>>;
  lastAward: PointEntry | null;
  lastLevelUp: BetterLevel | null;
  award: (input: AwardInput) => Promise<PointEntry | null>;
  revoke: (input: AwardInput) => Promise<boolean>;
  clearToast: () => void;
  clearLevelUp: () => void;
};

const Ctx = createContext<Api>({
  loaded: false,
  entries: [],
  total: 0,
  today: 0,
  todayCount: 0,
  pocket: 0,
  todayCounts: {},
  lastAward: null,
  lastLevelUp: null,
  award: async () => null,
  revoke: async () => false,
  clearToast: () => {},
  clearLevelUp: () => {},
});

function storedKey(kind: RewardKind, key: string, today: string) {
  return REWARDS[kind].dailyCap ? `${today}:${key}` : key;
}

function storeKey(userId: string) {
  return `dogbetter.points.v1.${userId}`;
}

/** Local calendar day so the jar empties at the user's midnight, not UTC. */
function localDay(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function entryDay(iso: string) {
  return localDay(new Date(iso));
}

function sumForDay(rows: PointEntry[], day: string) {
  return rows.filter((e) => entryDay(e.at) === day).reduce((sum, e) => sum + e.points, 0);
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
      setClockDay(localDay());
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

  useEffect(() => {
    const tick = () => setClockDay((prev) => {
      const day = localDay();
      return prev === day ? prev : day;
    });
    const id = setInterval(tick, 30_000);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') tick();
    });
    return () => {
      clearInterval(id);
      sub.remove();
    };
  }, []);

  const persist = useCallback(async (next: PointEntry[]) => {
    if (!userId) return;
    await AsyncStorage.setItem(storeKey(userId), JSON.stringify(next));
  }, [userId]);

  const award = useCallback(
    async (input: AwardInput) => {
      if (!userId) return null;
      const spec = REWARDS[input.kind];
      const now = new Date().toISOString();
      const today = clockDay || localDay();
      const key = storedKey(input.kind, input.key, today);
      const existing = entries.find((e) => e.key === key);
      if (existing) return null;
      const todayKind = entries.filter((e) => e.kind === input.kind && entryDay(e.at) === today).length;
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

  const revoke = useCallback(
    async (input: AwardInput) => {
      if (!userId) return false;
      const today = clockDay || localDay();
      const key = storedKey(input.kind, input.key, today);
      const hit = entries.find((e) => e.key === key);
      if (!hit) return false;
      const next = entries.filter((e) => e.id !== hit.id);
      setEntries(next);
      setLastAward((prev) => (prev?.id === hit.id ? null : prev));
      await persist(next);
      return true;
    },
    [clockDay, entries, persist, userId],
  );

  const clearToast = useCallback(() => setLastAward(null), []);
  const clearLevelUp = useCallback(() => setLastLevelUp(null), []);

  const today = useMemo(() => (clockDay ? sumForDay(entries, clockDay) : 0), [clockDay, entries]);
  const todayCount = useMemo(
    () => (clockDay ? entries.filter((e) => entryDay(e.at) === clockDay).length : 0),
    [clockDay, entries],
  );
  const pocket = Math.min(JAR_POCKET, todayCount);
  const todayCounts = useMemo(() => {
    const counts: Partial<Record<RewardKind, number>> = {};
    if (!clockDay) return counts;
    for (const e of entries) {
      if (entryDay(e.at) !== clockDay) continue;
      counts[e.kind] = (counts[e.kind] ?? 0) + 1;
    }
    return counts;
  }, [clockDay, entries]);
  const total = useMemo(() => entries.reduce((sum, e) => sum + e.points, 0), [entries]);

  const value = useMemo<Api>(
    () => ({ loaded, entries, total, today, todayCount, pocket, todayCounts, lastAward, lastLevelUp, award, revoke, clearToast, clearLevelUp }),
    [loaded, entries, total, today, todayCount, pocket, todayCounts, lastAward, lastLevelUp, award, revoke, clearToast, clearLevelUp],
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
