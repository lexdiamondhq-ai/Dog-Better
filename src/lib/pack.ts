import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';

import { useAuth } from './auth';
import type { Post, Profile } from './database.types';
import { useInbox } from './inbox';
import { supabase } from './supabase';

export type FeedPost = Post & {
  author: Pick<Profile, 'display_name' | 'avatar_url'> | null;
  dog: { name: string; avatar_url: string | null } | null;
  likes: number;
  liked: boolean;
  comments: number;
};

const PAGE = 30;

type PostRow = Post & { dog: { name: string; avatar_url: string | null } | null };

/** Photo posts only. Videos are Barks and have their own feed; the split is a column, not a file extension. */
export async function fetchFeed(userId: string, opts?: { authorId?: string; circleId?: string | null }): Promise<FeedPost[]> {
  let q = supabase.from('posts').select('*, dog:dogs(name, avatar_url)').eq('kind', 'photo').order('created_at', { ascending: false }).limit(PAGE);
  if (opts?.authorId) q = q.eq('author_id', opts.authorId);
  if (opts?.circleId) q = q.eq('circle_id', opts.circleId);
  else if (opts && 'circleId' in opts) return [];
  const { data: posts } = await q;
  return decorate((posts ?? []) as PostRow[], userId);
}

/** One post by id, subject to the same visibility rules. Null when hidden, blocked, or gone. */
export async function fetchPost(id: string, userId: string): Promise<FeedPost | null> {
  const { data } = await supabase.from('posts').select('*, dog:dogs(name, avatar_url)').eq('id', id).maybeSingle();
  if (!data) return null;
  const [post] = await decorate([data as PostRow], userId);
  return post ?? null;
}

export async function decorate(rows: PostRow[], userId: string): Promise<FeedPost[]> {
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
    const { dog, ...rest } = p;
    return {
      ...rest,
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
  const inbox = useInbox();
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

  // New posts in this circle show up live without a pull. Scoped by circle so one post does not
  // refetch every open feed in the product.
  useEffect(() => {
    const circleId = opts?.circleId;
    if (!circleId) return;
    const channel = supabase
      .channel(`pack-feed-${circleId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts', filter: `circle_id=eq.${circleId}` }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [load, opts?.circleId]);

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
      void inbox.refresh();
    },
    [inbox, user],
  );

  const remove = useCallback(
    async (post: FeedPost) => {
      if (!user || post.author_id !== user.id) return;
      setPosts((prev) => prev.filter((p) => p.id !== post.id));
      await deletePostWithMedia(post, user.id);
    },
    [user],
  );

  /** Drop a post from local state after a report or block. RLS keeps it gone on the next load. */
  const hide = useCallback((postId: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  }, []);

  return { posts, loading, refreshing, refresh, like, remove, hide, reload: load };
}

/** Deleting the row never deleted the object, so removed photos stayed publicly fetchable. Both go now. */
export async function deletePostWithMedia(post: Pick<Post, 'id' | 'image_path'>, userId: string) {
  await supabase.from('posts').delete().eq('id', post.id).eq('author_id', userId);
  if (post.image_path) await supabase.storage.from('media').remove([post.image_path]);
}
