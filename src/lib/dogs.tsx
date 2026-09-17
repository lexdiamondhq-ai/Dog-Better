import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Href } from 'expo-router';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react';
import { AppState } from 'react-native';

import { useAuth } from './auth';
import type { Dog } from './database.types';
import { supabase } from './supabase';

type DogsState = {
  dogs: Dog[];
  dog: Dog | null;
  /** True once we know the roster for this user, from the network or from the on-device cache. */
  loaded: boolean;
  /** The last fetch failed and `dogs` is the cached roster (or empty if there was no cache). */
  offline: boolean;
  setActiveDog: (id: string) => void;
  refresh: () => Promise<void>;
};

const DogsContext = createContext<DogsState>({
  dogs: [],
  dog: null,
  loaded: false,
  offline: false,
  setActiveDog: () => {},
  refresh: async () => {},
});

const ACTIVE_KEY = 'dogbetter.activeDog';
const cacheKey = (userId: string) => `dogbetter.dogs.cache.v1.${userId}`;

/** Query flag so the root gate does not bounce an already-onboarded household off this screen. */
export const ADD_DOG_HREF = '/onboarding?mode=add' as Href;

export function DogsProvider({ children }: PropsWithChildren) {
  const { user } = useAuth();
  const [dogs, setDogs] = useState<Dog[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);
  // Which user the current `dogs` snapshot belongs to; switching accounts makes it stale until refetched.
  const [loadedFor, setLoadedFor] = useState<string | null | undefined>(undefined);
  const userId = user?.id ?? null;
  const loaded = loadedFor === userId;

  const refresh = useCallback(async () => {
    if (!userId) {
      setDogs([]);
      setOffline(false);
      setLoadedFor(null);
      return;
    }
    const result = await fetchDogs(userId);
    if (result.ok) {
      setDogs(result.dogs);
      setOffline(false);
      setLoadedFor(userId);
      AsyncStorage.setItem(cacheKey(userId), JSON.stringify(result.dogs)).catch(() => {});
      return;
    }
    // Network failed. A returning household must never be routed back into first-dog onboarding.
    const cached = await readCache(userId);
    setDogs(cached);
    setOffline(true);
    // Only mark loaded when we have something to show; with no cache the gate keeps the splash up
    // and the next refresh (foreground, retry) gets another chance instead of guessing wrong.
    if (cached.length) setLoadedFor(userId);
  }, [userId]);

  useEffect(() => {
    void Promise.resolve().then(refresh);
  }, [refresh]);

  // Coming back to the foreground after a failed fetch is the natural retry moment.
  const offlineRef = useRef(offline);
  useEffect(() => {
    offlineRef.current = offline;
  }, [offline]);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && offlineRef.current) void refresh();
    });
    return () => sub.remove();
  }, [refresh]);

  useEffect(() => {
    AsyncStorage.getItem(ACTIVE_KEY).then((v) => v && setActiveId(v));
  }, []);

  const setActiveDog = useCallback((id: string) => {
    setActiveId(id);
    AsyncStorage.setItem(ACTIVE_KEY, id);
  }, []);

  const dog = useMemo(() => dogs.find((d) => d.id === activeId) ?? dogs[0] ?? null, [dogs, activeId]);

  const value = useMemo(() => ({ dogs, dog, loaded, offline, setActiveDog, refresh }), [dogs, dog, loaded, offline, setActiveDog, refresh]);
  return <DogsContext.Provider value={value}>{children}</DogsContext.Provider>;
}

async function fetchDogs(userId: string): Promise<{ ok: true; dogs: Dog[] } | { ok: false }> {
  try {
    const { data, error } = await supabase.from('dogs').select('*').eq('owner_id', userId).order('created_at');
    if (error) return { ok: false };
    return { ok: true, dogs: data ?? [] };
  } catch {
    return { ok: false };
  }
}

async function readCache(userId: string): Promise<Dog[]> {
  try {
    const raw = await AsyncStorage.getItem(cacheKey(userId));
    return raw ? (JSON.parse(raw) as Dog[]) : [];
  } catch {
    return [];
  }
}

export function useDogs() {
  return useContext(DogsContext);
}

export function dogAgeLabel(birthdate: string | null) {
  if (!birthdate) return null;
  const b = new Date(birthdate);
  const now = new Date();
  let months = (now.getFullYear() - b.getFullYear()) * 12 + (now.getMonth() - b.getMonth());
  if (now.getDate() < b.getDate()) months -= 1;
  if (months < 1) return 'newborn';
  if (months < 12) return `${months} mo`;
  const years = Math.floor(months / 12);
  const rem = months % 12;
  return rem ? `${years}y ${rem}m` : `${years} yr${years > 1 ? 's' : ''}`;
}
