import * as Application from 'expo-application';
import { Platform } from 'react-native';

import type { Json } from './database.types';
import { supabase } from './supabase';

/**
 * Funnel events with no third-party SDK. Rows land in analytics_events (insert-only RLS) and are
 * queried in the Supabase dashboard. Never log free text a user typed, only names and small props.
 *
 * Core funnel: paywall_view -> purchase_start -> purchase_success | purchase_cancel | purchase_error.
 * Engagement: scan_complete, scan_shop_click, shop_click, look_run, walk_saved, post_created.
 */

export type EventName =
  | 'paywall_view'
  | 'purchase_start'
  | 'purchase_success'
  | 'purchase_cancel'
  | 'purchase_error'
  | 'restore'
  | 'scan_complete'
  | 'scan_shop_click'
  | 'shop_click'
  | 'look_run'
  | 'walk_saved'
  | 'post_created'
  | 'report_filed'
  | 'user_blocked'
  | 'account_deleted';

const version = `${Application.nativeApplicationVersion ?? '0'} (${Application.nativeBuildVersion ?? '0'})`;

export async function track(name: EventName, props: Record<string, Json | undefined> = {}) {
  try {
    const { data } = await supabase.auth.getSession();
    const userId = data.session?.user.id;
    if (!userId) return;
    const clean: Record<string, Json> = {};
    for (const [k, v] of Object.entries(props)) if (v !== undefined) clean[k] = v;
    await supabase.from('analytics_events').insert({ user_id: userId, name, props: clean, platform: Platform.OS, app_version: version });
  } catch {
    // Analytics never block or surface to the user.
  }
}
