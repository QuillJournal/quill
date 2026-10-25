import { secure } from "@/modules/file-guard";
import * as Crypto from "expo-crypto";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as ImagePicker from "expo-image-picker";
import {
  deleteAttachmentRow,
  getAttachmentsByEntryId,
  insertAttachment,
} from "../db/attachments";
import { deleteDiary } from "../db/diaries";
import {
  deleteEntry,
  getEntriesByDiaryId,
  markEntryDirty,
  saveEntry,
  updateEntry,
} from "../db/entries";
import type { Attachment } from "../types/attachment";

export const ROOT = () => `${FileSystem.documentDirectory}attachments/`;

export const resolveAttachmentUri = (relPath: string) =>
  `${FileSystem.documentDirectory}${relPath}`;

export interface PendingAttachment {
  kind: "image" | "video" | "audio";
  name: string | null;
  uri: string;
  mimeType: string;
  width: number | null;
  height: number | null;
  durationMs: number | null;
  sizeBytes: number | null;
}

export async function pickMedia(): Promise<PendingAttachment[]> {
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images", "videos"],
    allowsMultipleSelection: true,
    selectionLimit: 10,
    quality: 0.8,
    videoExportPreset: ImagePicker.VideoExportPreset.H264_1280x720, // iOS only
  });
  if (res.canceled) return [];

  return res.assets
    .filter((a) => a.type === "image" || a.type === "video")
    .map((a) => ({
      kind: a.type as "image" | "video",
      name: null,
      uri: a.uri,
      mimeType: a.mimeType ?? (a.type === "video" ? "video/mp4" : "image/jpeg"),
      width: a.width ?? null,
      height: a.height ?? null,
      durationMs: a.duration ?? null,
      sizeBytes: a.fileSize ?? null,
    }));
}
export async function pickAudio(): Promise<PendingAttachment[]> {
  const res = await DocumentPicker.getDocumentAsync({
    type: "audio/*",
    multiple: true,
    copyToCacheDirectory: true,
  });
  if (res.canceled) return [];
  return res.assets.map((a) => ({
    kind: "audio" as const,
    name: a.name,
    uri: a.uri,
    mimeType: a.mimeType ?? "audio/mpeg",
    width: null,
    height: null,
    durationMs: null,
    sizeBytes: a.size ?? null,
  }));
}

async function protectOrThrow(uri: string): Promise<void> {
  const failures = await secure(uri, { protect: true });
  if (failures > 0)
    throw new Error("Could not apply file protection to an attachment.");
}

export async function discardPending(
  pending: PendingAttachment[],
): Promise<void> {
  const cache = FileSystem.cacheDirectory;
  if (!cache) return;
  await Promise.all(
    pending
      .filter((p) => p.uri.startsWith(cache))
      .map((p) =>
        FileSystem.deleteAsync(p.uri, { idempotent: true }).catch(() => {}),
      ),
  );
}

export async function persistAttachments(
  entryId: number,
  pending: PendingAttachment[],
): Promise<Attachment[]> {
  await FileSystem.makeDirectoryAsync(`${ROOT()}${entryId}/`, {
    intermediates: true,
  });

  await protectOrThrow(ROOT());

  const saved: Attachment[] = [];
  let current: string | null = null;

  try {
    for (const p of pending) {
      const fileName = p.uri.split("?")[0].split("/").pop() ?? "";
      const dot = fileName.lastIndexOf(".");
      const ext =
        dot > 0 && /^[a-z0-9]{1,5}$/i.test(fileName.slice(dot + 1))
          ? fileName.slice(dot + 1).toLowerCase()
          : p.kind === "video"
            ? "mp4"
            : p.kind === "audio"
              ? "m4a"
              : "jpg";
      const relPath =
        (current = `attachments/${entryId}/${Crypto.randomUUID()}.${ext}`);

      await FileSystem.copyAsync({
        from: p.uri,
        to: resolveAttachmentUri(relPath),
      });
      await protectOrThrow(resolveAttachmentUri(relPath));

      const row = {
        entryId: entryId,
        remoteId: Crypto.randomUUID(),
        kind: p.kind,
        name: p.name,
        relPath: relPath,
        mimeType: p.mimeType,
        width: p.width,
        height: p.height,
        durationMs: p.durationMs,
        sizeBytes: p.sizeBytes,
      };
      const inserted = await insertAttachment(row);
      saved.push(inserted);
      current = null;
    }
  } catch (e) {
    // Roll back only what this call created; never touch pre-existing attachments.
    if (current) await removeAttachmentFile(current).catch(() => {});
    for (const s of saved) {
      await deleteAttachmentRow(s.id).catch(() => {});
    }
    throw e;
  }
  await discardPending(pending);
  return saved;
}

export async function removeAttachmentFile(relPath: string): Promise<void> {
  await FileSystem.deleteAsync(resolveAttachmentUri(relPath), {
    idempotent: true,
  });
}

export async function removeEntryMedia(entryId: number): Promise<void> {
  await FileSystem.deleteAsync(`${ROOT()}${entryId}/`, { idempotent: true });
}

/** Call wherever resetLocalDatabase() is called (logout / account deletion). */
export async function removeAllMedia(): Promise<void> {
  await FileSystem.deleteAsync(ROOT(), { idempotent: true });
}

// ---------------------------------------------------------------------------
// Entry-level operations (use these instead of calling db.ts directly)
// ---------------------------------------------------------------------------

export async function createEntryWithMedia(
  diaryId: number,
  authorId: string,
  title: string,
  entryDate: string,
  body: string,
  added: PendingAttachment[],
): Promise<number> {
  const entryId = await saveEntry(diaryId, authorId, title, entryDate, body);
  try {
    if (added.length) await persistAttachments(entryId, added);
    await markEntryDirty(entryId);
  } catch (e) {
    await deleteEntry(entryId).catch(() => {});
    await removeEntryMedia(entryId).catch(() => {});
    throw e;
  }
  return entryId;
}

export async function updateEntryWithMedia(
  entryId: number,
  title: string,
  entryDate: string,
  body: string,
  media: { added: PendingAttachment[]; removedIds: number[] },
): Promise<void> {
  await updateEntry(entryId, title, entryDate, body);

  if (media.added.length) await persistAttachments(entryId, media.added);

  if (media.removedIds.length) {
    const doomed = (await getAttachmentsByEntryId(entryId)).filter((a) =>
      media.removedIds.includes(a.id),
    );
    for (const a of doomed) {
      await removeAttachmentFile(a.relPath);
      await deleteAttachmentRow(a.id);
    }
  }
  await markEntryDirty(entryId);
}

export async function deleteEntryWithMedia(entryId: number): Promise<void> {
  await removeEntryMedia(entryId);
  await deleteEntry(entryId);
}

export async function deleteDiaryWithMedia(diaryId: number): Promise<void> {
  for (const e of await getEntriesByDiaryId(diaryId)) {
    await removeEntryMedia(e.id);
  }
  await deleteDiary(diaryId);
}

export const hasLocalFile = (a: Attachment) =>
  a.syncState !== "pending_download" && a.syncState !== "failed";
