import { useCallback, useEffect, useState } from 'react';

import { useAuth } from './auth';
import type { Post, Profile } from './database.types';
import { isVideoPath } from './media';
import type { FeedPost } from './pack';
import { toggleLike } from './pack';
import { supabase } from './supabase';

function shuffle<T>(items: T[]) {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

export async function fetchBarks(userId: string): Promise<FeedPost[]> {
  const { data: posts } = await supabase.from('posts').select('*, dog:dogs(name, avatar_url)').order('created_at', { ascending: false }).limit(80);
  const clips = (posts ?? []).filter((p) => p.image_path && isVideoPath(p.image_path));
  if (!clips.length) return [];

  const ids = clips.map((p) => p.id);
  const authorIds = Array.from(new Set(clips.map((p) => p.author_id)));
  const [{ data: profiles }, { data: likes }] = await Promise.all([
    supabase.from('profiles').select('id, display_name, avatar_url').in('id', authorIds),
    supabase.from('post_likes').select('post_id, user_id').in('post_id', ids),
  ]);

  const profileById = new Map((profiles ?? []).map((p) => [p.id, p as Profile]));
  const likeCount = new Map<string, number>();
  const mine = new Set<string>();
  for (const l of likes ?? []) {
    likeCount.set(l.post_id, (likeCount.get(l.post_id) ?? 0) + 1);
    if (l.user_id === userId) mine.add(l.post_id);
  }

  const mapped = clips.map((p) => {
    const dog = (p as unknown as { dog: { name: string; avatar_url: string | null } | null }).dog;
    const { dog: _drop, ...rest } = p as Post & { dog: unknown };
    void _drop;
    return {
      ...(rest as Post),
      author: profileById.get(p.author_id) ?? null,
      dog: dog ?? null,
      likes: likeCount.get(p.id) ?? 0,
      liked: mine.has(p.id),
      comments: 0,
    };
  });
  return shuffle(mapped);
}

export function useBarks() {
  const { user } = useAuth();
  const [barks, setBarks] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    setBarks(await fetchBarks(user.id));
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  const like = useCallback(
    async (bark: FeedPost) => {
      if (!user) return;
      setBarks((prev) => prev.map((p) => (p.id === bark.id ? { ...p, liked: !p.liked, likes: p.likes + (p.liked ? -1 : 1) } : p)));
      await toggleLike(bark.id, user.id, bark.liked);
    },
    [user],
  );

  const remove = useCallback(
    async (bark: FeedPost) => {
      if (!user || bark.author_id !== user.id) return;
      setBarks((prev) => prev.filter((p) => p.id !== bark.id));
      await supabase.from('posts').delete().eq('id', bark.id).eq('author_id', user.id);
    },
    [user],
  );

  return { barks, loading, reload: load, like, remove };
}
