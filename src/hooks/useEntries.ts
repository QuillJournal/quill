import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { useUserSession } from "../context/UserSessionContext";
import {
  deleteEntry as deleteEntryFromDb,
  getEntriesByDiaryId,
  saveEntry as saveEntryToDb,
} from "../db/entries";
import { runSync } from "../services/syncEngine";
import type { EntryWithCounts } from "../types/entry";

export default function useEntries(diaryId: number) {
  const [entries, setEntries] = useState<EntryWithCounts[]>([]);
  const { session } = useUserSession();

  const triggerSync = useCallback(async () => {
    if (session?.kemKeys && session?.signKeys) {
      await runSync({
        userId: session.userId,
        kemKeys: session.kemKeys,
        signKeys: session.signKeys,
      });
    }
  }, [session]);

  const refresh = useCallback(async () => {
    setEntries(await getEntriesByDiaryId(diaryId));
  }, [diaryId]);

  useFocusEffect(
    useCallback(() => {
      refresh();
      triggerSync().then(() => refresh());
    }, [refresh, triggerSync]),
  );

  const addEntry = async (
    title: string,
    body: string,
    entryDate: string = new Date().toISOString().slice(0, 10),
  ): Promise<void> => {
    if (!session?.userId) return;
    await saveEntryToDb(diaryId, title, entryDate, body, session?.userId);
    await refresh();
    await triggerSync();
    await refresh();
  };

  const deleteEntry = async (entryId: number) => {
    await deleteEntryFromDb(entryId);
    await refresh();
    await triggerSync();
  };

  return { entries, refresh, deleteEntry, addEntry };
}
