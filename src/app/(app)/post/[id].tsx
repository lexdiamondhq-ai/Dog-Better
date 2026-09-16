import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, View, type ScrollView } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PostCard } from '@/components/pack/PostCard';
import { Field } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { Screen, ScreenHeader, Section } from '@/components/ui/Screen';
import { Surface } from '@/components/ui/Surface';
import { Tap } from '@/components/ui/Tap';
import { Text } from '@/components/ui/Text';
import { relativeTime } from '@/lib/activity';
import { REWARDS } from '@/engine/rewards';
import { useAuth } from '@/lib/auth';
import { useInbox } from '@/lib/inbox';
import { usePoints } from '@/lib/points';
import type { PostComment, Profile } from '@/lib/database.types';
import { fetchFeed, toggleLike, type FeedPost } from '@/lib/pack';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/theme/ThemeProvider';
import { space } from '@/theme/tokens';

type CommentRow = PostComment & { author: Pick<Profile, 'display_name'> | null };

export default function PostDetail() {
  const t = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { award } = usePoints();
  const inbox = useInbox();
  const { id } = useLocalSearchParams<{ id: string }>();
  const scrollRef = useRef<ScrollView>(null);

  const [post, setPost] = useState<FeedPost | null>(null);
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);

  const load = useCallback(() => {
    if (!user) return Promise.resolve();
    return fetchPostDetail(id, user.id).then((r) => {
      setPost(r.post);
      setComments(r.comments);
      if (r.post?.author_id === user.id) void inbox.markCommentsSeen();
    });
  }, [id, user]);

  useEffect(() => {
    load();
  }, [load]);

  const like = async () => {
    if (!post || !user) return;
    setPost({ ...post, liked: !post.liked, likes: post.likes + (post.liked ? -1 : 1) });
    await toggleLike(post.id, user.id, post.liked);
  };

  const send = async () => {
    if (!user || body.trim().length === 0) return;
    setSending(true);
    await supabase.from('post_comments').insert({ post_id: id, author_id: user.id, body: body.trim() });
    await award({ kind: 'comment', key: `comment:${id}:${user.id}:${Date.now()}` });
    setBody('');
    await load();
    setSending(false);
    // The new comment renders under the composer otherwise.
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
  };

  const remove = () => {
    if (!post || !user || post.author_id !== user.id) return;
    Alert.alert('Delete this post?', 'It comes off the pack. Comments go with it.', [
      { text: 'Keep it', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await supabase.from('posts').delete().eq('id', post.id).eq('author_id', user.id);
          router.back();
        },
      },
    ]);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen scrollRef={scrollRef} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: insets.bottom + 96 }}>
        <ScreenHeader title="Moment" onBack={() => router.back()} large={false} />
        {post ? <PostCard post={post} onLike={like} onOpen={() => {}} onDelete={user && post.author_id === user.id ? remove : undefined} /> : null}

        <Section title={comments.length ? `${comments.length} ${comments.length === 1 ? 'comment' : 'comments'}` : 'Comments'}>
          {comments.length === 0 ? (
            <Text variant="body" tone="tertiary">
              Say something kind.
            </Text>
          ) : (
            <Surface kind="tonal" padding={0} style={{ overflow: 'hidden' }}>
              {comments.map((c, i) => (
                <Animated.View key={c.id} entering={FadeInUp.delay(Math.min(i, 8) * 40)} style={[styles.comment, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.border }]}>
                  <View style={styles.commentHead}>
                    <Text variant="label">{c.author?.display_name ?? 'A dog lover'}</Text>
                    <Text variant="caption" tone="tertiary">
                      {relativeTime(c.created_at)}
                    </Text>
                  </View>
                  <Text variant="body">{c.body}</Text>
                </Animated.View>
              ))}
            </Surface>
          )}
        </Section>
      </Screen>

      <View style={[styles.composer, { paddingBottom: insets.bottom + space.sm, backgroundColor: t.bg, borderTopColor: t.border }]}>
        <View style={{ flex: 1 }}>
          <Field placeholder={`Add a comment  +${REWARDS.comment.points}`} value={body} onChangeText={setBody} maxLength={280} returnKeyType="send" onSubmitEditing={send} />
        </View>
        <Tap onPress={send} disabled={sending || body.trim().length === 0} haptic="medium" style={[styles.send, { backgroundColor: body.trim() ? t.brand : t.surfaceStrong }]} accessibilityLabel="Send comment">
          <Icon name="send" size={18} color={body.trim() ? t.onBrand : t.textTertiary} />
        </Tap>
      </View>
    </KeyboardAvoidingView>
  );
}

async function fetchPostDetail(id: string, userId: string): Promise<{ post: FeedPost | null; comments: CommentRow[] }> {
  const [feed, { data: rows }] = await Promise.all([fetchFeed(userId), supabase.from('post_comments').select('*').eq('post_id', id).order('created_at', { ascending: true })]);
  const authorIds = Array.from(new Set((rows ?? []).map((r) => r.author_id)));
  const { data: profiles } = authorIds.length ? await supabase.from('profiles').select('id, display_name').in('id', authorIds) : { data: [] };
  const byId = new Map((profiles ?? []).map((p) => [p.id, p]));
  return {
    post: feed.find((p) => p.id === id) ?? null,
    comments: (rows ?? []).map((r) => ({ ...r, author: byId.get(r.author_id) ?? null })),
  };
}

const styles = StyleSheet.create({
  comment: { padding: space.lg, gap: space.xs },
  commentHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  composer: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.lg, paddingTop: space.sm, borderTopWidth: StyleSheet.hairlineWidth },
  send: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
});
