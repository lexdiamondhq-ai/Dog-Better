import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { computeBetterScore } from '@/engine/betterScore';
import type { Dog, FoodScan, HealthLog, Meal, WeightEntry } from '@/lib/database.types';
import { usePreferences } from '@/lib/preferences';
import { supabase } from '@/lib/supabase';
import { formatWeight } from '@/lib/units';

export type TimelineItem = {
  id: string;
  kind: 'meal' | 'health' | 'scan' | 'weight';
  title: string;
  detail: string;
  at: string;
  tone: 'neutral' | 'good' | 'warn' | 'bad';
};

export type Activity = {
  meals: Meal[];
  health: HealthLog[];
  scans: FoodScan[];
  weights: WeightEntry[];
  momentsToday: number;
  /** Wall clock at fetch time, so derived "today" math stays pure per snapshot. */
  fetchedAt: number;
};

const EMPTY: Activity = { meals: [], health: [], scans: [], weights: [], momentsToday: 0, fetchedAt: 0 };

export function useDogActivity(dog: Dog | null) {
  const { weightUnit } = usePreferences();
  const [activity, setActivity] = useState<Activity>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!dog) {
      setActivity(EMPTY);
      setLoading(false);
      return;
    }
    const now = Date.now();
    const since = new Date(now - 14 * 86400000).toISOString();
    const dayStart = new Date(now);
    dayStart.setHours(0, 0, 0, 0);
    const [meals, health, scans, weights, photos] = await Promise.all([
      supabase.from('meals').select('*').eq('dog_id', dog.id).gte('logged_at', since).order('logged_at', { ascending: false }),
      supabase.from('health_logs').select('*').eq('dog_id', dog.id).order('created_at', { ascending: false }).limit(20),
      supabase.from('food_scans').select('*').eq('dog_id', dog.id).order('created_at', { ascending: false }).limit(20),
      supabase.from('weight_entries').select('*').eq('dog_id', dog.id).order('recorded_at', { ascending: false }).limit(12),
      supabase.from('dog_photos').select('id', { count: 'exact', head: true }).eq('dog_id', dog.id).gte('created_at', dayStart.toISOString()),
    ]);
    setActivity({
      meals: meals.data ?? [],
      health: health.data ?? [],
      scans: scans.data ?? [],
      weights: weights.data ?? [],
      momentsToday: photos.count ?? 0,
      fetchedAt: now,
    });
    setLoading(false);
  }, [dog]);

  // Native tabs do not always emit focus for lazily mounted screens, so load on mount too; focus keeps it fresh.

  useEffect(() => {

    void Promise.resolve().then(load);

  }, [load]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const derived = useMemo(() => {
    const startOfDay = new Date(activity.fetchedAt || Date.now());
    startOfDay.setHours(0, 0, 0, 0);
    const mealsToday = activity.meals.filter((m) => new Date(m.logged_at) >= startOfDay);
    const mealsLogged = mealsToday.filter((m) => m.kind === 'breakfast' || m.kind === 'dinner').length;
    const treatsToday = mealsToday.some((m) => m.kind === 'treat');
    const treatKcalToday = mealsToday.filter((m) => m.kind === 'treat').reduce((n, m) => n + (m.calories ?? 0), 0);
    const healthToday = activity.health.filter((h) => new Date(h.created_at) >= startOfDay);
    const triageToday = healthToday.some((h) => h.triage === 'red')
      ? 'red'
      : healthToday.some((h) => h.triage === 'amber')
        ? 'amber'
        : healthToday.length
          ? 'green'
          : 'none';
    const lastWeight = activity.weights[0];
    const weightToday = activity.weights.some((w) => new Date(w.recorded_at) >= startOfDay);
    const scansToday = activity.scans.filter((s) => new Date(s.created_at) >= startOfDay).length;
    const checksToday = scansToday + healthToday.length + (weightToday ? 1 : 0);

    const score = computeBetterScore({
      mealsToday: mealsLogged,
      treatsToday,
      triageToday,
      weightToday,
      momentsToday: activity.momentsToday,
      checksToday,
    });

    const timeline: TimelineItem[] = [
      ...activity.meals.map<TimelineItem>((m) => ({ id: m.id, kind: 'meal', title: m.label ?? capitalize(m.kind), detail: m.calories ? `${m.calories} kcal` : m.label ? capitalize(m.kind) : 'Meal logged', at: m.logged_at, tone: 'neutral' })),
      ...activity.health.map<TimelineItem>((h) => ({ id: h.id, kind: 'health', title: h.symptoms.length > 1 ? `${h.symptoms.length} symptoms logged` : humanize(h.symptoms[0] ?? 'symptom'), detail: { green: 'Monitor at home', amber: 'Vet within 24h', red: 'Emergency' }[h.triage] ?? h.triage, at: h.created_at, tone: h.triage === 'red' ? 'bad' : h.triage === 'amber' ? 'warn' : 'good' })),
      ...activity.scans.map<TimelineItem>((s) => ({ id: s.id, kind: 'scan', title: s.product_name ?? 'Scanned item', detail: { safe: 'Safe to share', caution: 'Tiny taste only', danger: 'Do not share', unknown: 'Unknown' }[s.verdict] ?? s.verdict, at: s.created_at, tone: s.verdict === 'danger' ? 'bad' : s.verdict === 'caution' ? 'warn' : s.verdict === 'safe' ? 'good' : 'neutral' })),
      ...activity.weights.map<TimelineItem>((w) => ({ id: w.id, kind: 'weight', title: 'Weight check', detail: formatWeight(w.weight_kg, weightUnit) ?? '', at: w.recorded_at, tone: 'neutral' })),
    ]
      .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
      .slice(0, 8);

    return { mealsToday, treatKcalToday, score, timeline, lastWeight };
  }, [activity, weightUnit]);

  return { ...activity, ...derived, loading, refreshing, refresh, reload: load };
}

export function humanize(s: string) {
  return capitalize(s.replace(/_/g, ' '));
}
export function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d === 1) return 'yesterday';
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

