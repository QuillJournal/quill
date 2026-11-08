import { eq } from "drizzle-orm";
import { db } from ".";
import { appStateTable as appState } from "./schema";

const ROW_ID = 1;

export const getResumeDiaryId = (): number | null => {
  const row = db
    .select({ id: appState.resumeDiaryId })
    .from(appState)
    .where(eq(appState.id, ROW_ID))
    .get();
  return row?.id ?? null;
};

export const setResumeDiaryId = (diaryId: number | null): void => {
  db.insert(appState)
    .values({ id: ROW_ID, resumeDiaryId: diaryId })
    .onConflictDoUpdate({
      target: appState.id,
      set: { resumeDiaryId: diaryId },
    })
    .run();
};
