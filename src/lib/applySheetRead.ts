import { normalizeSheetRead, remindersFromSheet, sheetReadSummary, writeMedsBlock, type SheetRead } from '@/engine/sheetMeds';
import type { Reminder } from '@/lib/reminders';

import type { Dog } from './database.types';
import { supabase } from './supabase';

export async function applySheetRead(input: {
  dog: Dog;
  read: SheetRead;
  replaceSheetReminders: (dogId: string, rows: Omit<Reminder, 'id'>[]) => void;
}) {
  const read = normalizeSheetRead(input.read, input.read.source);
  const notes = writeMedsBlock(input.dog.notes, read.medications);
  const { error } = await supabase.from('dogs').update({ notes }).eq('id', input.dog.id);
  if (error) throw error;
  input.replaceSheetReminders(input.dog.id, remindersFromSheet(input.dog.id, read));
  return sheetReadSummary(read);
}
