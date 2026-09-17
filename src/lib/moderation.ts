import { Alert } from 'react-native';

import { track } from './analytics';
import type { ReportReason, ReportTarget } from './database.types';
import { supabase } from './supabase';

/**
 * Report and block, required by App Store guideline 1.2 for any user content. Blocking is enforced
 * by RLS on posts and comments in both directions, so once a row lands in blocked_users the other
 * person disappears from every feed on the next load without any client filtering.
 */

const REASONS: { id: ReportReason; label: string }[] = [
  { id: 'spam', label: 'Spam or a scam' },
  { id: 'harassment', label: 'Harassment or hate' },
  { id: 'animal_welfare', label: 'Animal harm or neglect' },
  { id: 'explicit', label: 'Explicit or graphic' },
  { id: 'other', label: 'Something else' },
];

export async function fileReport(input: { reporterId: string; targetKind: ReportTarget; targetId: string; reason: ReportReason; details?: string }) {
  const { error } = await supabase.from('reports').insert({
    reporter_id: input.reporterId,
    target_kind: input.targetKind,
    target_id: input.targetId,
    reason: input.reason,
    details: input.details ?? null,
  });
  if (error) throw error;
  void track('report_filed', { target_kind: input.targetKind, reason: input.reason });
}

export async function blockUser(blockerId: string, blockedId: string) {
  if (blockerId === blockedId) return;
  const { error } = await supabase.from('blocked_users').upsert({ blocker_id: blockerId, blocked_id: blockedId }, { onConflict: 'blocker_id,blocked_id' });
  if (error) throw error;
  void track('user_blocked');
}

export async function unblockUser(blockerId: string, blockedId: string) {
  const { error } = await supabase.from('blocked_users').delete().eq('blocker_id', blockerId).eq('blocked_id', blockedId);
  if (error) throw error;
}

export async function listBlocked(blockerId: string) {
  const { data } = await supabase.from('blocked_users').select('blocked_id, created_at').eq('blocker_id', blockerId).order('created_at', { ascending: false });
  return data ?? [];
}

/**
 * The one moderation sheet for a piece of content. Presents Report (with reasons) and Block, then
 * calls `onDone` so the caller can drop the item from local state right away.
 */
export function moderationSheet(input: { reporterId: string; targetKind: ReportTarget; targetId: string; authorId: string; authorLabel?: string; onDone?: () => void }) {
  const who = input.authorLabel ?? 'this person';
  const finish = (message: string) => {
    input.onDone?.();
    Alert.alert('Thanks', message);
  };

  const pickReason = () =>
    Alert.alert('What is wrong with it?', 'We review every report and remove content that breaks the rules.', [
      ...REASONS.map((r) => ({
        text: r.label,
        onPress: () => {
          fileReport({ reporterId: input.reporterId, targetKind: input.targetKind, targetId: input.targetId, reason: r.id })
            .then(() => finish('Reported. It is hidden for you and our team will take a look.'))
            .catch(() => Alert.alert('Could not send the report', 'Check your connection and try again.'));
        },
      })),
      { text: 'Cancel', style: 'cancel' },
    ]);

  Alert.alert('Report or block', undefined, [
    { text: 'Report this', onPress: pickReason },
    {
      text: `Block ${who}`,
      style: 'destructive',
      onPress: () =>
        Alert.alert(`Block ${who}?`, 'You will not see each other\u2019s posts or comments. You can undo this in Settings.', [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Block',
            style: 'destructive',
            onPress: () => {
              blockUser(input.reporterId, input.authorId)
                .then(() => finish('Blocked. Their posts are gone from your feeds.'))
                .catch(() => Alert.alert('Could not block', 'Check your connection and try again.'));
            },
          },
        ]),
    },
    { text: 'Cancel', style: 'cancel' },
  ]);
}
