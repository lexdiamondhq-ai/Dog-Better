import { persistableShots } from '@/engine/shotRecord';
import { emptyClinic, mergeSheetReads, normalizeSheetRead, prepareSheetMed, remindersFromSheet, sheetReadFromNotes, sheetReadSummary, sheetShotsFromNotes, writeMedsBlock, writeShotsBlock, type SheetRead } from '@/engine/sheetMeds';
import type { Reminder } from '@/lib/reminders';

import type { Dog } from './database.types';
import { supabase } from './supabase';

export async function applySheetRead(input: {
  dog: Dog;
  read: SheetRead;
  replaceSheetReminders: (dogId: string, rows: Omit<Reminder, 'id'>[]) => void;
}) {
  const incoming = normalizeSheetRead(
    { ...input.read, medications: input.read.medications.map(prepareSheetMed) },
    input.read.source,
  );
  const read = mergeSheetReads([incoming, sheetReadFromNotes(input.dog.notes), sheetShotsFromNotes(input.dog.notes)]);
  const rows = remindersFromSheet(input.dog.id, read);
  input.replaceSheetReminders(input.dog.id, rows);
  let notes = input.dog.notes;
  if (read.medications.length) notes = writeMedsBlock(notes, read.medications);
  const shots = persistableShots(read.followUps);
  if (shots.length) notes = writeShotsBlock(notes, shots);
  const clinic = incoming.clinic ?? emptyClinic();
  const patch: { notes?: string | null; vet_name?: string | null; vet_phone?: string | null; microchip?: string | null } = {};
  if (notes !== input.dog.notes) patch.notes = notes;
  if (clinic.vetName && clinic.vetName !== input.dog.vet_name) patch.vet_name = clinic.vetName;
  if (clinic.vetPhone && clinic.vetPhone !== input.dog.vet_phone) patch.vet_phone = clinic.vetPhone;
  if (clinic.microchip && clinic.microchip !== input.dog.microchip) patch.microchip = clinic.microchip;
  if (Object.keys(patch).length) {
    const { error } = await supabase.from('dogs').update(patch).eq('id', input.dog.id);
    if (error) throw error;
  }
  return sheetReadSummary({ ...read, clinic });
}
