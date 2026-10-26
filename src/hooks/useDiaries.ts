import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import type { DiaryColorKey } from "../constants/colors";
import { useUserSession } from "../context/UserSessionContext";
import {
  saveDiary as addDiaryToDb,
  getAllDiaries,
  getDiaryById,
} from "../db/diaries";
import { deleteDiaryWithMedia } from "../services/attachments";
import { runSync } from "../services/syncEngine";
import type { Diary } from "../types/diary";
import { supabase } from "../utils/supabase";

export default function useDiaries() {
  const [diaries, setDiaries] = useState<Diary[]>([]);
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
    const fetchedDiaries = await getAllDiaries();
    setDiaries(
      fetchedDiaries.map((d) => ({ ...d, isPublic: d.memberCount > 1 })),
    );
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
      triggerSync().then(() => refresh());
    }, [refresh, triggerSync]),
  );

  const addDiary = async (
    name: string,
    color: DiaryColorKey,
  ): Promise<void> => {
    await addDiaryToDb(name, color);
    await refresh();
    await triggerSync();
    await refresh();
  };
  const deleteDiary = async (diaryId: number): Promise<void> => {
    const diary = await getDiaryById(diaryId);
    if (diary?.remoteId) {
      await supabase.from("diaries").delete().eq("id", diary.remoteId);
    }
    await deleteDiaryWithMedia(diaryId);
    await refresh();
  };

  return { diaries, refresh, addDiary, deleteDiary };
}
