import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';

import { useAuth } from './auth';
import type { Dog } from './database.types';
import { supabase } from './supabase';

type DogsState = {
  dogs: Dog[];
  dog: Dog | null;
  /** True until the first fetch has resolved (so the router can decide onboarding vs app). */
  loaded: boolean;
  setActiveDog: (id: string) => void;
  refresh: () => Promise<void>;
};

const DogsContext = createContext<DogsState>({
  dogs: [],
  dog: null,
  loaded: false,
  setActiveDog: () => {},
  refresh: async () => {},
});

const ACTIVE_KEY = 'dogbetter.activeDog';

export function DogsProvider({ children }: PropsWithChildren) {
  const { user } = useAuth();
  const [dogs, setDogs] = useState<Dog[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  // Which user the current `dogs` snapshot belongs to; switching accounts makes it stale until refetched.
  const [loadedFor, setLoadedFor] = useState<string | null | undefined>(undefined);
  const userId = user?.id ?? null;
  const loaded = loadedFor === userId;

  const refresh = useCallback(
    () =>
      fetchDogs(userId).then((rows) => {
        setDogs(rows);
        setLoadedFor(userId);
      }),
    [userId],
  );

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    AsyncStorage.getItem(ACTIVE_KEY).then((v) => v && setActiveId(v));
  }, []);

  const setActiveDog = useCallback((id: string) => {
    setActiveId(id);
    AsyncStorage.setItem(ACTIVE_KEY, id);
  }, []);

  const dog = useMemo(() => dogs.find((d) => d.id === activeId) ?? dogs[0] ?? null, [dogs, activeId]);

  const value = useMemo(() => ({ dogs, dog, loaded, setActiveDog, refresh }), [dogs, dog, loaded, setActiveDog, refresh]);
  return <DogsContext.Provider value={value}>{children}</DogsContext.Provider>;
}

async function fetchDogs(userId: string | null): Promise<Dog[]> {
  if (!userId) return [];
  const { data } = await supabase.from('dogs').select('*').eq('owner_id', userId).order('created_at');
  return data ?? [];
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
