import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';

import { computeBetterScore } from '@/engine/betterScore';
import type { BarkSession, Dog, FoodScan, HealthLog, Meal, WeightEntry } from '@/lib/database.types';
import { supabase } from '@/lib/supabase';

export type TimelineItem = {
  id: string;
  kind: 'meal' | 'health' | 'bark' | 'scan' | 'weight';
  title: string;
  detail: string;
  at: string;
  tone: 'neutral' | 'good' | 'warn' | 'bad';
};

export type Activity = {
  meals: Meal[];
  health: HealthLog[];
  barks: BarkSession[];
  scans: FoodScan[];
  weights: WeightEntry[];
  momentsThisWeek: number;
  /** Wall clock at fetch time, so derived "today"/"this week" math stays pure per snapshot. */
  fetchedAt: number;
};

const EMPTY: Activity = { meals: [], health: [], barks: [], scans: [], weights: [], momentsThisWeek: 0, fetchedAt: 0 };

export function useDogActivity(dog: Dog | null) {
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
    const weekAgo = new Date(now - 7 * 86400000).toISOString();
    const [meals, health, barks, scans, weights, photos, posts] = await Promise.all([
      supabase.from('meals').select('*').eq('dog_id', dog.id).gte('logged_at', since).order('logged_at', { ascending: false }),
      supabase.from('health_logs').select('*').eq('dog_id', dog.id).order('created_at', { ascending: false }).limit(20),
      supabase.from('bark_sessions').select('*').eq('dog_id', dog.id).order('created_at', { ascending: false }).limit(20),
      supabase.from('food_scans').select('*').eq('dog_id', dog.id).order('created_at', { ascending: false }).limit(20),
      supabase.from('weight_entries').select('*').eq('dog_id', dog.id).order('recorded_at', { ascending: false }).limit(12),
      supabase.from('dog_photos').select('id', { count: 'exact', head: true }).eq('dog_id', dog.id).gte('created_at', weekAgo),
      supabase.from('posts').select('id', { count: 'exact', head: true }).eq('dog_id', dog.id).gte('created_at', weekAgo),
    ]);
    setActivity({
      meals: meals.data ?? [],
      health: health.data ?? [],
      barks: barks.data ?? [],
      scans: scans.data ?? [],
      weights: weights.data ?? [],
      momentsThisWeek: (photos.count ?? 0) + (posts.count ?? 0),
      fetchedAt: now,
    });
    setLoading(false);
  }, [dog]);

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
    const now = activity.fetchedAt;
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const weekAgo = now - 7 * 86400000;
    const mealsToday = activity.meals.filter((m) => new Date(m.logged_at) >= startOfDay);
    const recentHealth = activity.health.filter((h) => new Date(h.created_at).getTime() >= weekAgo);
    const worst = recentHealth.some((h) => h.triage === 'red') ? 'red' : recentHealth.some((h) => h.triage === 'amber') ? 'amber' : recentHealth.length ? 'green' : 'none';
    const lastWeight = activity.weights[0];
    const lastWeightDaysAgo = lastWeight ? Math.floor((now - new Date(lastWeight.recorded_at).getTime()) / 86400000) : null;
    const engagements = [...activity.barks, ...activity.scans].filter((x) => new Date(x.created_at).getTime() >= weekAgo).length;

    const score = computeBetterScore({
      dog,
      mealsToday: mealsToday.length,
      worstTriage7d: worst,
      lastWeightDaysAgo,
      momentsThisWeek: activity.momentsThisWeek,
      engagementsThisWeek: engagements,
    });

    const timeline: TimelineItem[] = [
      ...activity.meals.map<TimelineItem>((m) => ({ id: m.id, kind: 'meal', title: m.label ?? capitalize(m.kind), detail: m.calories ? `${m.calories} kcal` : m.label ? capitalize(m.kind) : 'Meal logged', at: m.logged_at, tone: 'neutral' })),
      ...activity.health.map<TimelineItem>((h) => ({ id: h.id, kind: 'health', title: h.symptoms.length > 1 ? `${h.symptoms.length} symptoms logged` : humanize(h.symptoms[0] ?? 'symptom'), detail: { green: 'Monitor at home', amber: 'Vet within 24h', red: 'Emergency' }[h.triage] ?? h.triage, at: h.created_at, tone: h.triage === 'red' ? 'bad' : h.triage === 'amber' ? 'warn' : 'good' })),
      ...activity.barks.map<TimelineItem>((b) => ({ id: b.id, kind: 'bark', title: `Bark: ${humanize(b.mood)}`, detail: `${Math.round(Number(b.confidence) * 100)}% match`, at: b.created_at, tone: 'neutral' })),
      ...activity.scans.map<TimelineItem>((s) => ({ id: s.id, kind: 'scan', title: s.product_name ?? 'Scanned item', detail: { safe: 'Safe to share', caution: 'Tiny taste only', danger: 'Do not share', unknown: 'Unknown' }[s.verdict] ?? s.verdict, at: s.created_at, tone: s.verdict === 'danger' ? 'bad' : s.verdict === 'caution' ? 'warn' : s.verdict === 'safe' ? 'good' : 'neutral' })),
      ...activity.weights.map<TimelineItem>((w) => ({ id: w.id, kind: 'weight', title: 'Weight check', detail: `${Number(w.weight_kg).toFixed(1)} kg`, at: w.recorded_at, tone: 'neutral' })),
    ]
      .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
      .slice(0, 8);

    return { mealsToday, score, timeline, lastWeight };
  }, [activity, dog]);

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

export function greeting() {
  const h = new Date().getHours();
  if (h < 5) return 'Still up?';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  if (h < 21) return 'Good evening';
  return 'Good night';
}
