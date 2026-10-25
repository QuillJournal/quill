import { secure } from "@/modules/file-guard";
import { eq } from "drizzle-orm";
import * as Crypto from "expo-crypto";
import * as FileSystem from "expo-file-system/legacy";
import { db } from "../db";
import {
    deleteAttachmentRow,
    getAttachmentsByEntryId,
    getAttachmentsBySyncState,
    insertAttachment,
    updateAttachment,
} from "../db/attachments";
import { getDiaryKey } from "../db/diaries";
import { diariesTable, entriesTable } from "../db/schema";
import {
    decryptFileToFile,
    encryptFileToFile,
} from "../utils/attachmentCrypto";
import { hexToBytes } from "../utils/crypto";
import { supabase } from "../utils/supabase";
import {
    removeAttachmentFile,
    resolveAttachmentUri,
    ROOT,
} from "./attachments";

const BUCKET = "attachments";

const MAX_SYNC_BYTES = 45 * 1024 * 1024;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const KINDS = ["image", "video", "audio"] as const;

export type ManifestItem = {
  id: string;
  kind: (typeof KINDS)[number];
  ext: string;
  mimeType: string;
  name: string | null;
  width: number | null;
  height: number | null;
  durationMs: number | null;
  sizeBytes: number | null;
};

const storagePath = (
  author: string,
  diary: string,
  entry: string,
  att: string,
) => `${author}/${diary}/${entry}/${att}.enc`;

export async function uploadEntryAttachments(p: {
  entryId: number;
  entryRemoteId: string;
  authorId: string;
  diaryRemoteId: string;
  keyEpoch: number;
  diaryKey: Uint8Array;
}): Promise<boolean> {
  for (const a of await getAttachmentsByEntryId(p.entryId)) {
    if (a.syncState !== "pending_upload") continue;
    const srcUri = resolveAttachmentUri(a.relPath);
    const info = await FileSystem.getInfoAsync(srcUri);
    if (!info.exists) {
      await updateAttachment(a.id, { syncState: "failed", remoteId: null });
      continue;
    }
    const remoteId = a.remoteId ?? Crypto.randomUUID();
    if (info.size > MAX_SYNC_BYTES) {
      await updateAttachment(a.id, { remoteId, syncState: "local_only" });
      continue;
    }
    const tmp = `${FileSystem.cacheDirectory}att-up-${remoteId}.enc`;
    try {
      await encryptFileToFile(srcUri, tmp, p.diaryKey, {
        diaryId: p.diaryRemoteId,
        entryId: p.entryRemoteId,
        attachmentId: remoteId,
        keyEpoch: p.keyEpoch,
      });
      const path = storagePath(
        p.authorId,
        p.diaryRemoteId,
        p.entryRemoteId,
        remoteId,
      );
      const { data, error } = await supabase.storage
        .from(BUCKET)
        .createSignedUploadUrl(path, { upsert: true });
      if (error || !data) throw error ?? new Error("No upload URL.");
      const res = await FileSystem.uploadAsync(data.signedUrl, tmp, {
        httpMethod: "PUT",
        uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
        headers: {
          "Content-Type": "application/octet-stream",
          "x-upsert": "true",
        },
      });
      if (res.status < 200 || res.status >= 300)
        throw new Error(`Upload failed (${res.status})`);
      await updateAttachment(a.id, { remoteId, syncState: "synced" });
    } catch (e) {
      console.warn("[AttachmentSync] upload failed", e);
      return false;
    } finally {
      await FileSystem.deleteAsync(tmp, { idempotent: true }).catch(() => {});
    }
  }
  return true;
}

export async function buildManifest(entryId: number): Promise<ManifestItem[]> {
  return (await getAttachmentsByEntryId(entryId))
    .filter(
      (a) =>
        a.remoteId &&
        (a.syncState === "synced" ||
          a.syncState === "pending_download" ||
          a.syncState === "failed"),
    )
    .map((a) => ({
      id: a.remoteId!,
      kind: a.kind,
      ext: a.relPath.split(".").pop() ?? "bin",
      mimeType: a.mimeType,
      name: a.name,
      width: a.width,
      height: a.height,
      durationMs: a.durationMs,
      sizeBytes: a.sizeBytes,
    }));
}

export async function syncAttachmentRows(
  p: {
    entryRemoteId: string;
    diaryRemoteId: string;
    authorId: string;
    currentUserId: string;
  },
  manifest: ManifestItem[],
): Promise<void> {
  if (p.authorId !== p.currentUserId) return;
  try {
    if (manifest.length) {
      await supabase.from("entry_attachments").upsert(
        manifest.map((m) => ({
          id: m.id,
          entry_id: p.entryRemoteId,
          diary_id: p.diaryRemoteId,
          author_id: p.authorId,
          size_bytes: m.sizeBytes ?? 0,
        })),
        { onConflict: "id", ignoreDuplicates: true },
      );
    }
    let del = supabase
      .from("entry_attachments")
      .delete()
      .eq("entry_id", p.entryRemoteId)
      .eq("author_id", p.authorId);
    if (manifest.length)
      del = del.not("id", "in", `(${manifest.map((m) => m.id).join(",")})`);
    await del;
  } catch (e) {
    console.warn("[AttachmentSync] row sync failed", e);
  }
}

export async function applyRemoteManifest(
  localEntryId: number,
  raw: ManifestItem[] | undefined,
): Promise<void> {
  const items = (Array.isArray(raw) ? raw : [])
    .slice(0, 50)
    .filter((m) => m && UUID.test(m.id) && KINDS.includes(m.kind));
  const local = await getAttachmentsByEntryId(localEntryId);
  const known = new Set(local.map((a) => a.remoteId).filter(Boolean));

  for (const m of items) {
    if (known.has(m.id)) continue;
    const ext = /^[a-z0-9]{1,5}$/i.test(m.ext ?? "")
      ? m.ext.toLowerCase()
      : m.kind === "video"
        ? "mp4"
        : m.kind === "audio"
          ? "m4a"
          : "jpg";
    await insertAttachment({
      entryId: localEntryId,
      kind: m.kind,
      name: m.name ?? null,
      relPath: `attachments/${localEntryId}/${m.id}.${ext}`,
      mimeType: String(m.mimeType ?? "application/octet-stream"),
      width: m.width ?? null,
      height: m.height ?? null,
      durationMs: m.durationMs ?? null,
      sizeBytes: m.sizeBytes ?? null,
      remoteId: m.id,
      syncState: "pending_download",
    });
  }

  const keep = new Set(items.map((m) => m.id));
  for (const a of local) {
    if (
      a.remoteId &&
      !keep.has(a.remoteId) &&
      a.syncState !== "pending_upload" &&
      a.syncState !== "local_only"
    ) {
      await removeAttachmentFile(a.relPath).catch(() => {});
      await deleteAttachmentRow(a.id);
    }
  }
}

let downloading = false;

export async function downloadPendingAttachments(): Promise<number> {
  if (downloading) return 0;
  downloading = true;
  let done = 0;
  try {
    for (const a of await getAttachmentsBySyncState("pending_download")) {
      try {
        if (!a.remoteId) continue;
        const [entry] = await db
          .select()
          .from(entriesTable)
          .where(eq(entriesTable.id, a.entryId));
        if (!entry?.remoteId) continue;
        const [diary] = await db
          .select()
          .from(diariesTable)
          .where(eq(diariesTable.id, entry.diaryId));
        if (!diary?.remoteId) continue;
        const keyHex = await getDiaryKey(diary.remoteId, entry.keyEpoch);
        if (!keyHex) continue;

        const { data, error } = await supabase.storage
          .from(BUCKET)
          .createSignedUrl(
            storagePath(
              entry.authorId,
              diary.remoteId,
              entry.remoteId,
              a.remoteId,
            ),
            120,
          );
        if (error || !data) throw error ?? new Error("No download URL.");

        const tmp = `${FileSystem.cacheDirectory}att-dl-${a.remoteId}.enc`;
        const dest = resolveAttachmentUri(a.relPath);
        await FileSystem.makeDirectoryAsync(`${ROOT()}${a.entryId}/`, {
          intermediates: true,
        });
        try {
          const res = await FileSystem.downloadAsync(data.signedUrl, tmp);
          if (res.status !== 200)
            throw new Error(`Download failed (${res.status})`);
          await decryptFileToFile(tmp, dest, hexToBytes(keyHex), {
            diaryId: diary.remoteId,
            entryId: entry.remoteId,
            attachmentId: a.remoteId,
            keyEpoch: entry.keyEpoch,
          });
        } finally {
          await FileSystem.deleteAsync(tmp, { idempotent: true }).catch(
            () => {},
          );
        }
        const failures =
          (await secure(ROOT(), { protect: true })) +
          (await secure(dest, { protect: true }));
        if (failures > 0) {
          await removeAttachmentFile(a.relPath).catch(() => {});
          throw new Error("Could not apply file protection.");
        }
        await updateAttachment(a.id, { syncState: "synced" });
        done++;
      } catch (e: any) {
        if (/invalid tag|truncated|Unrecognized/i.test(String(e?.message)))
          await updateAttachment(a.id, { syncState: "failed" });
        console.warn("[AttachmentSync] download failed", e);
      }
    }
  } finally {
    downloading = false;
  }
  return done;
}
