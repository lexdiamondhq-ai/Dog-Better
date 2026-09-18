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
import { moderationSheet } from '@/lib/moderation';
import { usePoints } from '@/lib/points';
import type { PostComment, Profile } from '@/lib/database.types';
import { deletePostWithMedia, fetchPost, toggleLike, type FeedPost } from '@/lib/pack';
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
  const [missing, setMissing] = useState(false);

  const markSeen = inbox.markCommentsSeen;
  const load = useCallback(() => {
    if (!user) return Promise.resolve();
    return fetchPostDetail(id, user.id).then((r) => {
      setPost(r.post);
      setMissing(!r.post);
      setComments(r.comments);
      if (r.post?.author_id === user.id) void markSeen();
    });
  }, [id, user, markSeen]);

  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);

  const like = async () => {
    if (!post || !user) return;
    setPost({ ...post, liked: !post.liked, likes: post.likes + (post.liked ? -1 : 1) });
    await toggleLike(post.id, user.id, post.liked);
    void inbox.refresh();
  };

  const send = async () => {
    if (!user || body.trim().length === 0) return;
    setSending(true);
    await supabase.from('post_comments').insert({ post_id: id, author_id: user.id, body: body.trim() });
    await award({ kind: 'comment', key: `comment:${id}:${user.id}:${Date.now()}` });
    setBody('');
    await load();
    void inbox.refresh();
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
          await deletePostWithMedia(post, user.id);
          router.back();
        },
      },
    ]);
  };

  const reportPost = () => {
    if (!post || !user) return;
    moderationSheet({ reporterId: user.id, targetKind: 'post', targetId: post.id, authorId: post.author_id, authorLabel: post.author?.display_name ?? undefined, onDone: () => router.back() });
  };

  const reportComment = (c: CommentRow) => {
    if (!user || c.author_id === user.id) return;
    moderationSheet({
      reporterId: user.id,
      targetKind: 'comment',
      targetId: c.id,
      authorId: c.author_id,
      authorLabel: c.author?.display_name ?? undefined,
      onDone: () => setComments((prev) => prev.filter((x) => x.id !== c.id)),
    });
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen scrollRef={scrollRef} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: insets.bottom + 96 }}>
        <ScreenHeader title="Moment" onBack={() => router.back()} large={false} />
        {post ? (
          <PostCard post={post} onLike={like} onOpen={() => {}} onDelete={user && post.author_id === user.id ? remove : undefined} onReport={user && post.author_id !== user.id ? reportPost : undefined} />
        ) : missing ? (
          <Surface kind="tonal" style={{ gap: space.sm }}>
            <Text variant="headline">This moment is gone</Text>
            <Text variant="body" tone="secondary">
              It was removed, or it is from someone you no longer see.
            </Text>
          </Surface>
        ) : null}

        {post ? (
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
                      <View style={styles.commentMeta}>
                        <Text variant="caption" tone="tertiary">
                          {relativeTime(c.created_at)}
                        </Text>
                        {user && c.author_id !== user.id ? (
                          <Tap onPress={() => reportComment(c)} haptic="selection" accessibilityLabel="Report or block" style={styles.commentReport}>
                            <Icon name="warning" size={14} color={t.textTertiary} />
                          </Tap>
                        ) : null}
                      </View>
                    </View>
                    <Text variant="body">{c.body}</Text>
                  </Animated.View>
                ))}
              </Surface>
            )}
          </Section>
        ) : null}
      </Screen>

      {post ? (
        <View style={[styles.composer, { paddingBottom: insets.bottom + space.sm, backgroundColor: t.bg, borderTopColor: t.border }]}>
          <View style={{ flex: 1 }}>
            <Field placeholder={`Add a comment  +${REWARDS.comment.points}`} value={body} onChangeText={setBody} maxLength={280} returnKeyType="send" onSubmitEditing={send} />
          </View>
          <Tap onPress={send} disabled={sending || body.trim().length === 0} haptic="medium" style={[styles.send, { backgroundColor: body.trim() ? t.brand : t.surfaceStrong }]} accessibilityLabel="Send comment">
            <Icon name="send" size={18} color={body.trim() ? t.onBrand : t.textTertiary} />
          </Tap>
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}

async function fetchPostDetail(id: string, userId: string): Promise<{ post: FeedPost | null; comments: CommentRow[] }> {
  const [post, { data: rows }] = await Promise.all([fetchPost(id, userId), supabase.from('post_comments').select('*').eq('post_id', id).order('created_at', { ascending: true })]);
  const authorIds = Array.from(new Set((rows ?? []).map((r) => r.author_id)));
  const { data: profiles } = authorIds.length ? await supabase.from('profiles').select('id, display_name').in('id', authorIds) : { data: [] };
  const byId = new Map((profiles ?? []).map((p) => [p.id, p]));
  return {
    post,
    comments: (rows ?? []).map((r) => ({ ...r, author: byId.get(r.author_id) ?? null })),
  };
}

const styles = StyleSheet.create({
  comment: { padding: space.lg, gap: space.xs },
  commentHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  commentMeta: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  commentReport: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  composer: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.lg, paddingTop: space.sm, borderTopWidth: StyleSheet.hairlineWidth },
  send: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
});
