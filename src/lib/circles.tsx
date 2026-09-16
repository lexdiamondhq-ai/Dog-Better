import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';

import { useAuth } from './auth';
import type { Circle } from './database.types';
import { supabase } from './supabase';

export type CircleKind = Circle['kind'];

export type CircleTab = { id: string; name: string; kind: CircleKind; inviteCode?: string; ownerId?: string };

export function circleLabel(c: Pick<CircleTab, 'name' | 'kind'>) {
  if (c.kind === 'nearby') return 'Street';
  if (c.kind === 'contacts') return 'Family';
  return c.name;
}

type Api = {
  loaded: boolean;
  circles: CircleTab[];
  active: CircleTab | null;
  setActive: (id: string) => void;
  create: (name: string, kind?: 'custom' | 'nearby' | 'contacts') => Promise<{ circle: CircleTab | null; error?: string }>;
  join: (code: string) => Promise<CircleTab | null>;
  ensureStarter: () => Promise<void>;
};

const Ctx = createContext<Api>({
  loaded: false,
  circles: [],
  active: null,
  setActive: () => {},
  create: async () => ({ circle: null }),
  join: async () => null,
  ensureStarter: async () => {},
});

export function CirclesProvider({ children }: PropsWithChildren) {
  const { user } = useAuth();
  const [rows, setRows] = useState<Circle[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    if (!user) {
      setRows([]);
      setLoaded(true);
      return;
    }
    const { data } = await supabase.from('circles').select('*').order('created_at', { ascending: true });
    setRows(data ?? []);
    setLoaded(true);
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  const ensureStarter = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from('circles').select('*').eq('owner_id', user.id);
    const have = new Set((data ?? []).map((c) => c.kind));
    const missing: Circle['kind'][] = [];
    if (!have.has('nearby')) missing.push('nearby');
    if (!have.has('contacts')) missing.push('contacts');
    for (const kind of missing) {
      const name = kind === 'nearby' ? 'Street' : 'Family';
      await supabase.rpc('create_circle', { p_name: name, p_kind: kind });
    }
    await load();
  }, [load, user]);

  const create = useCallback(
    async (name: string, kind: 'custom' | 'nearby' | 'contacts' = 'custom') => {
      const trimmed = name.trim();
      if (!user) return { circle: null, error: 'Sign in again, then try once more.' };
      if (trimmed.length < 2) return { circle: null, error: 'Give it at least two letters.' };
      if (trimmed.length > 40) return { circle: null, error: 'Keep the name under 40 characters.' };
      const { data, error } = await supabase.rpc('create_circle', { p_name: trimmed, p_kind: kind });
      if (error || !data) return { circle: null, error: error?.message ?? 'Could not create that circle.' };
      await load();
      setActiveId(data.id);
      return { circle: { id: data.id, name: data.name, kind: data.kind, inviteCode: data.invite_code, ownerId: data.owner_id } };
    },
    [load, user],
  );

  const join = useCallback(
    async (invite: string) => {
      const { data, error } = await supabase.rpc('join_circle', { code: invite.trim().toUpperCase() });
      if (error || !data) return null;
      await load();
      setActiveId(String(data));
      const found = rows.find((c) => c.id === data);
      return found ? { id: found.id, name: found.name, kind: found.kind, inviteCode: found.invite_code, ownerId: found.owner_id } : { id: String(data), name: 'Circle', kind: 'custom' as const };
    },
    [load, rows],
  );

  const circles = useMemo<CircleTab[]>(() => rows.map((c) => ({ id: c.id, name: c.name, kind: c.kind, inviteCode: c.invite_code, ownerId: c.owner_id })), [rows]);

  const active = circles.find((c) => c.id === activeId) ?? circles[0] ?? null;

  const value = useMemo<Api>(
    () => ({ loaded, circles, active, setActive: setActiveId, create, join, ensureStarter }),
    [loaded, circles, active, create, join, ensureStarter],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCircles() {
  return useContext(Ctx);
}
