import { useEffect, useRef } from 'react';

import { isShotTitle, mergeSheetReads, remindersFromSheet, sheetReadFromNotes, sheetShotsFromNotes } from '@/engine/sheetMeds';
import type { Dog } from '@/lib/database.types';
import { useReminders } from '@/lib/reminders';

/** If the profile already lists medications or shots and the calendar is missing them, put them back. */
export function useSyncNotesMeds(dog: Dog | null | undefined) {
  const reminders = useReminders(dog?.id);
  const syncedFor = useRef<string | null>(null);

  useEffect(() => {
    if (!dog || !reminders.loaded) return;
    if (syncedFor.current === dog.id) return;
    const fromNotes = mergeSheetReads([sheetReadFromNotes(dog.notes), sheetShotsFromNotes(dog.notes)]);
    const hasMeds = reminders.openMeds.length > 0;
    const hasShots = reminders.upcoming.some((r) => r.kind === 'vaccine' || isShotTitle(r.title));
    if (hasMeds && hasShots) {
      syncedFor.current = dog.id;
      return;
    }
    if (!fromNotes.found) {
      syncedFor.current = dog.id;
      return;
    }
    const rows = remindersFromSheet(dog.id, fromNotes);
    if (!rows.length) {
      syncedFor.current = dog.id;
      return;
    }
    if (hasMeds && !fromNotes.medications.length) {
      reminders.addMany(rows.filter((r) => r.kind === 'vaccine' || r.kind === 'vet'));
    } else {
      reminders.replaceSheetReminders(dog.id, rows);
    }
    syncedFor.current = dog.id;
  }, [dog, reminders.loaded, reminders.openMeds.length, reminders.upcoming, reminders.replaceSheetReminders, reminders.addMany]);
}