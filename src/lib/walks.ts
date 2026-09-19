import { useFocusEffect } from 'expo-router';
import { Pedometer } from 'expo-sensors';
import { useCallback, useEffect, useState } from 'react';

import type { Walk } from './database.types';
import { supabase } from './supabase';

export type WalkPoint = { latitude: number; longitude: number };

/**
 * Walk tracking from the phone's pedometer plus a foreground path for the live map.
 * Steps are the owner's. Location is only watched while a walk is in progress.
 */

export function metresBetween(a: WalkPoint, b: WalkPoint) {
  const r = 6371000;
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLng = ((b.longitude - a.longitude) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.latitude * Math.PI) / 180) * Math.cos((b.latitude * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * r * Math.asin(Math.min(1, Math.sqrt(x)));
}

export function pathMetres(path: WalkPoint[]) {
  let m = 0;
  for (let i = 1; i < path.length; i++) m += metresBetween(path[i - 1], path[i]);
  return m;
}

export function useStepsToday() {
  const [steps, setSteps] = useState<number | null>(null);
  const [available, setAvailable] = useState<boolean | null>(null);

  const load = useCallback(async () => {
    const ok = await Pedometer.isAvailableAsync().catch(() => false);
    setAvailable(ok);
    if (!ok) return;
    const perm = await Pedometer.requestPermissionsAsync().catch(() => null);
    if (perm && !perm.granted) {
      setAvailable(false);
      return;
    }
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    try {
      const r = await Pedometer.getStepCountAsync(start, new Date());
      setSteps(r.steps);
    } catch {
      setSteps(null);
    }
  }, []);

  // Native tabs do not always emit focus for lazily mounted screens, so load on mount too; focus keeps it fresh.

  useEffect(() => {

    void Promise.resolve().then(load);

  }, [load]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return { steps, available, reload: load };
}

export type LiveWalk = {
  startedAt: Date;
  steps: number;
  path: WalkPoint[];
  here: WalkPoint | null;
  locationDenied: boolean;
  placeName?: string;
};

export { useLiveWalk } from './WalksProvider';

export async function saveWalk(input: {
  dogId: string;
  ownerId: string;
  startedAt: Date;
  endedAt: Date;
  steps: number;
  notes?: string | null;
  metres?: number | null;
  stopCount?: number | null;
}) {
  const { data, error } = await supabase
    .from('walks')
    .insert({
      dog_id: input.dogId,
      owner_id: input.ownerId,
      started_at: input.startedAt.toISOString(),
      ended_at: input.endedAt.toISOString(),
      steps: input.steps,
      notes: input.notes ?? null,
      metres: input.metres ?? null,
      stop_count: input.stopCount ?? null,
    })
    .select('id')
    .single();
  if (error) throw error;
  return data;
}

export async function fetchRecentWalks(dogId: string, limit = 7): Promise<Walk[]> {
  const { data } = await supabase.from('walks').select('*').eq('dog_id', dogId).order('started_at', { ascending: false }).limit(limit);
  return data ?? [];
}

export function formatDuration(startISO: string, endISO: string) {
  const mins = Math.max(1, Math.round((new Date(endISO).getTime() - new Date(startISO).getTime()) / 60000));
  return mins < 60 ? `${mins} min` : `${Math.floor(mins / 60)}h ${mins % 60}m`;
}
