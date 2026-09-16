import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'dogbetter.looks.day.v1';
const FREE = 3;

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Free tier: three Looks a day. Premium is unlimited. */
export async function takeLookSlot(isPremium: boolean): Promise<{ ok: boolean; used: number; cap: number }> {
  if (isPremium) return { ok: true, used: 0, cap: 0 };
  const raw = await AsyncStorage.getItem(KEY);
  const parsed = raw ? (JSON.parse(raw) as { day: string; used: number }) : { day: todayKey(), used: 0 };
  const used = parsed.day === todayKey() ? parsed.used : 0;
  if (used >= FREE) return { ok: false, used, cap: FREE };
  await AsyncStorage.setItem(KEY, JSON.stringify({ day: todayKey(), used: used + 1 }));
  return { ok: true, used: used + 1, cap: FREE };
}
