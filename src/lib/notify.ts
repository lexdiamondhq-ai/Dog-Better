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
const CHANNEL = 'reminders';

let handlerSet = false;
let lastOpenKey: string | null = null;

function ensureHandler() {
  if (handlerSet) return;
  handlerSet = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
  });
}

async function ensureAndroidChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL, {
    name: 'Reminders',
    importance: Notifications.AndroidImportance.HIGH,
    sound: 'default',
    vibrationPattern: [0, 220, 180, 220],
  });
}

/** After one fires, the next doses in the 60-slot window need to be scheduled. */
export function watchReminderDelivered(onFire: () => void) {
  if (Platform.OS === 'web') return () => {};
  ensureHandler();
  const sub = Notifications.addNotificationReceivedListener((n) => {
    if (n.request.identifier.startsWith(PREFIX)) onFire();
  });
  return () => sub.remove();
}

export function watchReminderOpens(onOpen: (payload: { reminderId: string; dogId?: string }) => void) {
  if (Platform.OS === 'web') return () => {};
  ensureHandler();
  const take = (res: Notifications.NotificationResponse | null) => {
    if (!res) return;
    const id = res.notification.request.identifier;
    if (!id.startsWith(PREFIX)) return;
    const key = `${id}:${res.notification.date}`;
    if (lastOpenKey === key) return;
    lastOpenKey = key;
    const data = res.notification.request.content.data as { reminderId?: string; dogId?: string };
    onOpen({ reminderId: typeof data.reminderId === 'string' ? data.reminderId : id.slice(PREFIX.length), dogId: data.dogId });
  };
  void Notifications.getLastNotificationResponseAsync().then(take);
  const sub = Notifications.addNotificationResponseReceivedListener(take);
  return () => sub.remove();
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

function intervalTrigger(at: Date): Notifications.NotificationTriggerInput {
  const seconds = Math.max(1, Math.round((at.getTime() - Date.now()) / 1000));
  if (Platform.OS === 'android') {
    return { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds, repeats: false, channelId: CHANNEL };
  }
  return { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds, repeats: false };
}

function fireDate(r: Reminder): Date | null {
  const [y, m, d] = r.date.split('-').map(Number);
  const [hh, mm] = r.time.split(':').map(Number);
  if (![y, m, d, hh, mm].every(Number.isFinite)) return null;
  const at = new Date(y, m - 1, d, hh, mm, 0, 0);
  const now = Date.now();
  // "This minute" is already in the past once seconds tick. Nudge it forward so a just-saved dose still rings.
  if (at.getTime() <= now && now - at.getTime() < 90_000) return new Date(now + 20_000);
  return at;
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

    await ensureAndroidChannel();
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
          trigger: intervalTrigger(at),
        });
      }),
    );
  } catch {
    // Expo Go without notification support, or a denied permission. The calendar still works.
  }
}
