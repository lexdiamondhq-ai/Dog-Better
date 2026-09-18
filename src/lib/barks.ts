import { useCallback, useEffect, useState } from 'react';

import { useAuth } from './auth';
import type { Post } from './database.types';
import { useInbox } from './inbox';
import { decorate, deletePostWithMedia, toggleLike, type FeedPost } from './pack';
import { supabase } from './supabase';

function shuffle<T>(items: T[]) {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

/** Video posts across the whole membership. Blocked authors are removed by RLS before this runs. */
export async function fetchBarks(userId: string): Promise<FeedPost[]> {
  const { data: posts } = await supabase.from('posts').select('*, dog:dogs(name, avatar_url)').eq('kind', 'video').order('created_at', { ascending: false }).limit(80);
  const rows = (posts ?? []) as (Post & { dog: { name: string; avatar_url: string | null } | null })[];
  return shuffle(await decorate(rows, userId));
}

export function useBarks() {
  const { user } = useAuth();
  const inbox = useInbox();
  const [barks, setBarks] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    const next = await fetchBarks(user.id);
    setBarks(next);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);

  const like = useCallback(
    async (bark: FeedPost) => {
      if (!user) return;
      setBarks((prev) => prev.map((p) => (p.id === bark.id ? { ...p, liked: !p.liked, likes: p.likes + (p.liked ? -1 : 1) } : p)));
      await toggleLike(bark.id, user.id, bark.liked);
      void inbox.refresh();
    },
    [inbox, user],
  );

  const remove = useCallback(
    async (bark: FeedPost) => {
      if (!user || bark.author_id !== user.id) return;
      setBarks((prev) => prev.filter((p) => p.id !== bark.id));
      await deletePostWithMedia(bark, user.id);
    },
    [user],
  );

  const hide = useCallback((id: string) => {
    setBarks((prev) => prev.filter((p) => p.id !== id));
  }, []);

  return { barks, loading, reload: load, like, remove, hide };
}
