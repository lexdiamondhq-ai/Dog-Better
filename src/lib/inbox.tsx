import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';

import { useAuth } from './auth';
import { supabase } from './supabase';

export type InboxItem = {
  id: string;
  kind: 'comment' | 'like';
  postId: string;
  preview: string;
  at: string;
};

type Api = {
  unread: number;
  /** Same as unread. Kept so Community’s existing badge keeps compiling. */
  unreadComments: number;
  items: InboxItem[];
  markCommentsSeen: () => Promise<void>;
  refresh: () => Promise<void>;
};

const Ctx = createContext<Api>({ unread: 0, unreadComments: 0, items: [], markCommentsSeen: async () => {}, refresh: async () => {} });

function seenKey(userId: string) {
  return `dogbetter.inbox.activity.${userId}`;
}

export function InboxProvider({ children }: PropsWithChildren) {
  const { user } = useAuth();
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<InboxItem[]>([]);

  const refresh = useCallback(async () => {
    if (!user) {
      setUnread(0);
      setItems([]);
      return;
    }
    const seen = (await AsyncStorage.getItem(seenKey(user.id))) ?? '1970-01-01T00:00:00.000Z';
    const { data: mine } = await supabase.from('posts').select('id').eq('author_id', user.id);
    const ids = (mine ?? []).map((p) => p.id);
    if (!ids.length) {
      setUnread(0);
      setItems([]);
      return;
    }

    const [{ data: comments }, { data: likes }] = await Promise.all([
      supabase.from('post_comments').select('id, post_id, author_id, body, created_at').in('post_id', ids).order('created_at', { ascending: false }).limit(20),
      supabase.from('post_likes').select('post_id, user_id, created_at').in('post_id', ids).order('created_at', { ascending: false }).limit(20),
    ]);

    const next: InboxItem[] = [
      ...(comments ?? []).map((c) => ({
        id: `c:${c.id}`,
        kind: 'comment' as const,
        postId: c.post_id,
        preview: c.author_id === user.id ? 'You commented on your photo' : c.body.trim() || 'Left a comment on your photo',
        at: c.created_at,
      })),
      ...(likes ?? []).map((l) => ({
        id: `l:${l.post_id}:${l.user_id}:${l.created_at}`,
        kind: 'like' as const,
        postId: l.post_id,
        preview: l.user_id === user.id ? 'You liked your photo' : 'Liked your photo',
        at: l.created_at,
      })),
    ]
      .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
      .slice(0, 30);

    const seenAt = new Date(seen).getTime();
    setItems(next);
    setUnread(next.filter((item) => new Date(item.at).getTime() > seenAt).length);
  }, [user]);

  useEffect(() => {
    void Promise.resolve().then(refresh);
  }, [refresh]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    void supabase
      .from('posts')
      .select('id')
      .eq('author_id', user.id)
      .then(({ data }) => {
        if (cancelled) return;
        const mine = new Set((data ?? []).map((p) => p.id));
        const onRow = (payload: { new: { post_id?: string } }) => {
          const postId = payload.new?.post_id;
          if (postId && mine.has(postId)) void refresh();
        };
        channel = supabase
          .channel(`inbox-activity:${user.id}`)
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'post_comments' }, onRow)
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'post_likes' }, onRow)
          .subscribe();
      });
    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [refresh, user]);

  const markCommentsSeen = useCallback(async () => {
    if (!user) return;
    await AsyncStorage.setItem(seenKey(user.id), new Date().toISOString());
    setUnread(0);
  }, [user]);

  const value = useMemo(() => ({ unread, unreadComments: unread, items, markCommentsSeen, refresh }), [unread, items, markCommentsSeen, refresh]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useInbox() {
  return useContext(Ctx);
}
