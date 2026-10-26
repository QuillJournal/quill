import { useEffect, useState } from "react";
import { useUserSession } from "../context/UserSessionContext";
import { getDiaryById } from "../db/diaries";
import { fetchDiaryMembers } from "../services/sharing";
import { useSyncStatus } from "../services/syncEngine";

export default function useDiaryMembers(diaryId: number) {
  const { session } = useUserSession();
  const isSyncing = useSyncStatus();
  const [names, setNames] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    if (!session || isSyncing) return;
    let cancelled = false;

    (async () => {
      const diary = await getDiaryById(diaryId);
      if (!diary?.remoteId) return;
      const members = await fetchDiaryMembers(
        diary.remoteId,
        diary.keyEpoch,
        session,
      );
      if (cancelled) return;
      setNames(
        new Map(
          members.map((m) => [
            m.userId,
            m.name || (m.username ? `@${m.username}` : "Member"),
          ]),
        ),
      );
    })().catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [diaryId, session?.userId, isSyncing]);

  return names;
}
