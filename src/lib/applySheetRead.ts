import { mergeSheetReads, normalizeSheetRead, remindersFromSheet, sheetReadFromNotes, sheetReadSummary, sheetShotsFromNotes, writeMedsBlock, writeShotsBlock, type SheetRead } from '@/engine/sheetMeds';
import type { Reminder } from '@/lib/reminders';

import type { Dog } from './database.types';
import { supabase } from './supabase';

export async function applySheetRead(input: {
  dog: Dog;
  read: SheetRead;
  replaceSheetReminders: (dogId: string, rows: Omit<Reminder, 'id'>[]) => void;
}) {
  const incoming = normalizeSheetRead(input.read, input.read.source);
  const read = mergeSheetReads([incoming, sheetReadFromNotes(input.dog.notes), sheetShotsFromNotes(input.dog.notes)]);
  const rows = remindersFromSheet(input.dog.id, read);
  if (rows.length) input.replaceSheetReminders(input.dog.id, rows);
  let notes = input.dog.notes;
  if (read.medications.length) notes = writeMedsBlock(notes, read.medications);
  if (read.followUps.length) notes = writeShotsBlock(notes, read.followUps.map((f) => ({ title: f.title, date: f.date })));
  if (notes !== input.dog.notes) {
    const { error } = await supabase.from('dogs').update({ notes }).eq('id', input.dog.id);
    if (error) throw error;
  }
  return sheetReadSummary(read);
}
