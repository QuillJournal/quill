import { useEffect, useState } from "react";
import { useUserSession } from "../context/UserSessionContext";
import { getDiaryById } from "../db/diaries";
import { getDiaryMembers } from "../db/members";
import { fetchDiaryMembers } from "../services/sharing";
import { useSyncStatus } from "../services/syncEngine";

export default function useDiaryMembers(diaryId: number) {
  const { session } = useUserSession();
  const isSyncing = useSyncStatus();
  const [names, setNames] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    let cancelled = false;
    getDiaryMembers(diaryId)
      .then((cached) => {
        if (!cancelled && cached.size > 0) {
          setNames((prev) => (prev.size ? prev : cached));
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [diaryId]);

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
      if (!members.length)
        console.warn("[Members] empty list for diary", diaryId);
      if (cancelled) return;
      setNames(
        new Map(
          members.map((m) => [
            m.userId,
            m.name || (m.username ? `@${m.username}` : "Member"),
          ]),
        ),
      );
    })().catch((e) => console.warn("[Members] refresh failed: ", e?.message));

    return () => {
      cancelled = true;
    };
  }, [diaryId, session?.userId, isSyncing]);

  return names;
}
