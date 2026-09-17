import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import type { NotificationPrefs } from './preferences';
import { isOpen, kindMeta, prettyTime, type Reminder } from './reminders';

/**
 * Local notifications for the calendar. Nothing here needs a server or a push token: every open,
 * future reminder becomes a scheduled local notification on this phone, filtered by the toggles in
 * Settings. iOS caps pending local notifications at 64, so the soonest ones win.
 */

const MAX_SCHEDULED = 60;
const PREFIX = 'dogbetter:';

let handlerSet = false;
function ensureHandler() {
  if (handlerSet) return;
  handlerSet = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
  });
}

export async function notificationsAllowed(): Promise<boolean> {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}

/** Ask once, at the moment something is worth scheduling. */
export async function requestNotifications(): Promise<boolean> {
  try {
    const current = await Notifications.getPermissionsAsync();
    if (current.status === 'granted') return true;
    if (!current.canAskAgain) return false;
    const next = await Notifications.requestPermissionsAsync({ ios: { allowAlert: true, allowSound: true, allowBadge: false } });
    return next.status === 'granted';
  } catch {
    return false;
  }
}

function prefFor(kind: Reminder['kind']): keyof NotificationPrefs {
  return kind === 'medication' ? 'medication' : 'checkIn';
}

function fireDate(r: Reminder): Date | null {
  const [y, m, d] = r.date.split('-').map(Number);
  const [hh, mm] = r.time.split(':').map(Number);
  if (![y, m, d, hh, mm].every(Number.isFinite)) return null;
  return new Date(y, m - 1, d, hh, mm, 0, 0);
}

/**
 * Replace every Dog Better notification with the current calendar. Idempotent and cheap enough to
 * run on each change; callers debounce.
 */
export async function syncReminderNotifications(all: Reminder[], prefs: NotificationPrefs, dogNames: Map<string, string>) {
  if (Platform.OS === 'web') return;
  ensureHandler();
  try {
    const now = Date.now();
    const due = all
      .filter((r) => isOpen(r) && prefs[prefFor(r.kind)])
      .map((r) => ({ r, at: fireDate(r) }))
      .filter((x): x is { r: Reminder; at: Date } => !!x.at && x.at.getTime() > now)
      .sort((a, b) => a.at.getTime() - b.at.getTime())
      .slice(0, MAX_SCHEDULED);

    const existing = await Notifications.getAllScheduledNotificationsAsync();
    await Promise.all(existing.filter((n) => n.identifier.startsWith(PREFIX)).map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)));
    if (!due.length) return;

    const allowed = await requestNotifications();
    if (!allowed) return;

    await Promise.all(
      due.map(({ r, at }) => {
        const dog = dogNames.get(r.dogId);
        const label = kindMeta(r.kind).label;
        return Notifications.scheduleNotificationAsync({
          identifier: `${PREFIX}${r.id}`,
          content: {
            title: dog ? `${dog}: ${label.toLowerCase()} at ${prettyTime(r.time)}` : `${label} at ${prettyTime(r.time)}`,
            body: r.title,
            sound: true,
            data: { reminderId: r.id, dogId: r.dogId, kind: r.kind },
          },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at },
        });
      }),
    );
  } catch {
    // Expo Go without notification support, or a denied permission. The calendar still works.
  }
}
