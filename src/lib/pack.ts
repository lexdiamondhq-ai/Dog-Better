import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';

import { useAuth } from './auth';
import type { Post, Profile } from './database.types';
import { isVideoPath } from './media';
import { supabase } from './supabase';

export type FeedPost = Post & {
  author: Pick<Profile, 'display_name' | 'avatar_url'> | null;
  dog: { name: string; avatar_url: string | null } | null;
  likes: number;
  liked: boolean;
  comments: number;
};

const PAGE = 30;

export async function fetchFeed(userId: string, opts?: { authorId?: string; circleId?: string | null }): Promise<FeedPost[]> {
  let q = supabase.from('posts').select('*, dog:dogs(name, avatar_url)').order('created_at', { ascending: false }).limit(PAGE);
  if (opts?.authorId) q = q.eq('author_id', opts.authorId);
  if (opts?.circleId) q = q.eq('circle_id', opts.circleId);
  else if (opts && 'circleId' in opts) return [];
  const { data: posts } = await q;
  if (!posts?.length) return [];
  const rows = posts.filter((p) => !p.image_path || !isVideoPath(p.image_path));
  if (!rows.length) return [];

  const ids = rows.map((p) => p.id);
  const authorIds = Array.from(new Set(rows.map((p) => p.author_id)));
  const [{ data: profiles }, { data: likes }, { data: comments }] = await Promise.all([
    supabase.from('profiles').select('id, display_name, avatar_url').in('id', authorIds),
    supabase.from('post_likes').select('post_id, user_id').in('post_id', ids),
    supabase.from('post_comments').select('post_id').in('post_id', ids),
  ]);

  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));
  const likeCount = new Map<string, number>();
  const mine = new Set<string>();
  for (const l of likes ?? []) {
    likeCount.set(l.post_id, (likeCount.get(l.post_id) ?? 0) + 1);
    if (l.user_id === userId) mine.add(l.post_id);
  }
  const commentCount = new Map<string, number>();
  for (const c of comments ?? []) commentCount.set(c.post_id, (commentCount.get(c.post_id) ?? 0) + 1);

  return rows.map((p) => {
    const dog = (p as unknown as { dog: { name: string; avatar_url: string | null } | null }).dog;
    const { dog: _drop, ...rest } = p as Post & { dog: unknown };
    void _drop;
    return {
      ...(rest as Post),
      author: profileById.get(p.author_id) ?? null,
      dog: dog ?? null,
      likes: likeCount.get(p.id) ?? 0,
      liked: mine.has(p.id),
      comments: commentCount.get(p.id) ?? 0,
    };
  });
}

export async function toggleLike(postId: string, userId: string, liked: boolean) {
  if (liked) await supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', userId);
  else await supabase.from('post_likes').insert({ post_id: postId, user_id: userId });
}

export function useFeed(opts?: { authorId?: string; circleId?: string | null }) {
  const { user } = useAuth();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    const next = await fetchFeed(user.id, opts);
    setPosts(next);
    setLoading(false);
  }, [user, opts?.authorId, opts?.circleId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Native tabs do not always emit focus for lazily mounted screens, so load on mount too; focus keeps it fresh.

  useEffect(() => {

    void Promise.resolve().then(load);

  }, [load]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  // New posts from anyone in the pack show up live without a pull.
  useEffect(() => {
    const channel = supabase
      .channel('pack-feed')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [load]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const like = useCallback(
    async (post: FeedPost) => {
      if (!user) return;
      setPosts((prev) => prev.map((p) => (p.id === post.id ? { ...p, liked: !p.liked, likes: p.likes + (p.liked ? -1 : 1) } : p)));
      await toggleLike(post.id, user.id, post.liked);
    },
    [user],
  );

  const remove = useCallback(
    async (post: FeedPost) => {
      if (!user || post.author_id !== user.id) return;
      setPosts((prev) => prev.filter((p) => p.id !== post.id));
      await supabase.from('posts').delete().eq('id', post.id).eq('author_id', user.id);
    },
    [user],
  );

  return { posts, loading, refreshing, refresh, like, remove, reload: load };
}
