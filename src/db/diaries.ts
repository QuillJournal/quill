import { and, count, desc, eq, getTableColumns, sql } from "drizzle-orm";
import * as Crypto from "expo-crypto";
import { db } from ".";
import type { DiaryColorKey } from "../constants/colors";
import type { Diary, DiaryRow } from "../types/diary";
import {
  appStateTable as appState,
  diariesTable as diaries,
  diaryKeysTable,
  entriesTable as entries,
  diaryMembersTable as members,
} from "./schema";

export const getAllDiaries = async (): Promise<Diary[]> => {
  return await db
    .select({
      ...getTableColumns(diaries),
      entryCount: count(entries.id),
      memberCount: count(members.userId),
    })
    .from(diaries)
    .leftJoin(
      entries,
      and(eq(entries.diaryId, diaries.id), eq(entries.deleted, 0)),
    )
    .leftJoin(members, eq(members.diaryRemoteId, diaries.remoteId))
    .groupBy(diaries.id)
    .orderBy(
      desc(sql`coalesce(${diaries.lastOpenedAt}, ${diaries.createdAt} * 1000)`),
      desc(diaries.id),
    );
};

export const getDiaryById = async (id: number): Promise<DiaryRow> => {
  const [diary] = await db.select().from(diaries).where(eq(diaries.id, id));
  return diary;
};

export const getDiaryKey = async (
  remoteId: string,
  epoch: number = 1,
): Promise<string | null> => {
  const [row] = await db
    .select()
    .from(diaryKeysTable)
    .where(
      and(
        eq(diaryKeysTable.diaryRemoteId, remoteId),
        eq(diaryKeysTable.keyEpoch, epoch),
      ),
    );
  return row?.diaryKeyHex ?? null;
};

export const saveDiaryKey = async (
  remoteId: string,
  diaryKeyHex: string,
  epoch: number = 1,
): Promise<void> => {
  await db
    .insert(diaryKeysTable)
    .values({ diaryRemoteId: remoteId, keyEpoch: epoch, diaryKeyHex })
    .onConflictDoNothing();
};

export const saveDiary = async (
  name: string,
  color: DiaryColorKey,
  ownerId?: string,
  remoteId?: string,
): Promise<{ localId: number; remoteId: string }> => {
  const assignedRemoteId = remoteId ?? Crypto.randomUUID();
  const result = await db.insert(diaries).values({
    name,
    color,
    remoteId: assignedRemoteId,
    ownerId: ownerId ?? null,
    syncState: "pending_insert",
  });
  return { localId: result.lastInsertRowId, remoteId: assignedRemoteId };
};

export const deleteDiary = async (id: number): Promise<void> => {
  await db.delete(diaries).where(eq(diaries.id, id));
};

export const openDiary = (id: number): boolean =>
  db.transaction((tx) => {
    const { changes } = tx
      .update(diaries)
      .set({ lastOpenedAt: new Date() })
      .where(eq(diaries.id, id))
      .run();
    if (changes === 0) return false;
    tx.insert(appState)
      .values({ id: 1, resumeDiaryId: id })
      .onConflictDoUpdate({ target: appState.id, set: { resumeDiaryId: id } })
      .run();
    return true;
  });
