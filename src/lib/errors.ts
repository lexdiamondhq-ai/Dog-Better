/**
 * Turns thrown values into a sentence fit for a Field error or toast.
 * Supabase messages are already readable; native/network failures are not.
 */
export function humanizeError(e: unknown, fallback: string): string {
  const raw = e instanceof Error ? e.message : typeof e === 'string' ? e : '';
  if (!raw) return fallback;
  const lower = raw.toLowerCase();
  if (lower.includes('timed out') || lower.includes('timeout')) return 'That took too long. Check your connection and try again.';
  if (lower.includes('network request failed') || lower.includes('fetch failed') || lower.includes('offline') || lower.includes('internet connection')) {
    return 'Looks like you are offline. Try again when you have signal.';
  }
  // Native stack noise like "UnexpectedException: ... (at ExpoModulesCore/Promise.swift:56)" is never useful to a user.
  if (lower.includes('exception') || lower.includes('.swift') || lower.includes('.kt:')) return fallback;
  return raw;
}
