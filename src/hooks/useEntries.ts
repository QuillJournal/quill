import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { useUserSession } from "../context/UserSessionContext";
import {
  deleteEntry as deleteEntryFromDb,
  getEntriesByDiaryId,
  saveEntry as saveEntryToDb,
} from "../db/entries";
import { runSync } from "../services/syncEngine";
import type { EntryWithAuthor } from "../types/entry";
import { isMine } from "../utils/entry";
import useDiaryMembers from "./useDiaryMembers";

export default function useEntries(diaryId: number) {
  const [entries, setEntries] = useState<EntryWithAuthor[]>([]);
  const { session } = useUserSession();
  const diaryMembers = useDiaryMembers(diaryId);
  const diaryMembersRef = useRef(diaryMembers);
  diaryMembersRef.current = diaryMembers;

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
    const fetchedEntries = await getEntriesByDiaryId(diaryId);
    const formatted = fetchedEntries.map((e) => {
      const isMe = isMine(e.authorId, session?.userId);
      const authorName = isMe
        ? session?.name || "You"
        : diaryMembersRef.current.get(e.authorId) || "Collaborator";
      return {
        ...e,
        authorName,
      };
    });
    formatted.sort(
      (a, b) =>
        b.entryDate.localeCompare(a.entryDate) ||
        (b.entryTime ?? "").localeCompare(a.entryTime ?? "") ||
        b.id - a.id,
    );
    setEntries(formatted);
  }, [diaryId, session?.userId, session?.name]);

  useEffect(() => {
    refresh();
  }, [diaryMembers, refresh]);

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
