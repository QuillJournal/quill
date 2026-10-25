import { eq, sql } from "drizzle-orm";
import { db } from ".";
import type {
  Attachment,
  AttachmentCounts,
  NewAttachment,
} from "../types/attachment";
import {
  AttachmentsTable as attachments,
  entriesTable as entries,
} from "./schema";

export const EMPTY_COUNTS = { image: 0, video: 0, audio: 0 };
export const insertAttachment = async (
  a: NewAttachment,
): Promise<Attachment> => {
  const [row] = await db.insert(attachments).values(a).returning();
  return row;
};

export const getAttachmentsByEntryId = async (
  entryId: number,
): Promise<Attachment[]> => {
  return await db
    .select()
    .from(attachments)
    .where(eq(attachments.entryId, entryId))
    .orderBy(attachments.id);
};

export const deleteAttachmentRow = async (id: number): Promise<void> => {
  await db.delete(attachments).where(eq(attachments.id, id));
};

export const getAttachmentCountsByEntryId = async (
  entryId: number,
): Promise<AttachmentCounts> => {
  const rows = await db
    .select({ kind: attachments.kind, count: sql<number>`count(*)` })
    .from(attachments)
    .where(eq(attachments.entryId, entryId))
    .groupBy(attachments.kind);
  const counts = { image: 0, audio: 0, video: 0 };
  for (const row of rows) {
    counts[row.kind] = Number(row.count);
  }
  return counts;
};

export const getAttachmentCountsByDiaryId = async (diaryId: number) => {
  const rows = await db
    .select({
      entryId: attachments.entryId,
      kind: attachments.kind,
      count: sql<number>`count(*)`,
    })
    .from(attachments)
    .innerJoin(entries, eq(entries.id, attachments.entryId))
    .where(eq(entries.diaryId, diaryId))
    .groupBy(attachments.entryId, attachments.kind);

  const byEntry = new Map<number, AttachmentCounts>();
  for (const r of rows) {
    const counts = byEntry.get(r.entryId) ?? { ...EMPTY_COUNTS };
    counts[r.kind] = Number(r.count);
    byEntry.set(r.entryId, counts);
  }
  return byEntry;
};

export const updateAttachment = async (
  id: number,
  patch: Partial<NewAttachment>,
): Promise<void> => {
  await db.update(attachments).set(patch).where(eq(attachments.id, id));
};

export const getAttachmentsBySyncState = async (
  state: Attachment["syncState"],
): Promise<Attachment[]> =>
  db
    .select()
    .from(attachments)
    .where(eq(attachments.syncState, state))
    .orderBy(attachments.id);
