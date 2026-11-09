import { and, eq, or } from "drizzle-orm";
import * as Crypto from "expo-crypto";
import { useEffect, useState } from "react";
import { db } from "../db";
import { getDiaryKey, saveDiaryKey } from "../db/diaries";
import {
  AttachmentsTable,
  diariesTable,
  diaryInvitesTable,
  entriesTable,
} from "../db/schema";
import {
  bytesToHex,
  decryptBlob,
  encryptBlob,
  hexToBytes,
  signEntry,
  signWrappedKey,
  unwrapDiaryKey,
  verifyEntrySig,
  verifyPublicBundle,
  verifyWrappedKeySig,
  wrapDiaryKey,
} from "../utils/crypto";
import { supabase } from "../utils/supabase";
import { deleteDiaryWithMedia } from "./attachments";
import {
  applyRemoteManifest,
  buildManifest,
  downloadPendingAttachments,
  syncAttachmentRows,
  uploadEntryAttachments,
  type ManifestItem,
} from "./attachmentSync";
import { rotateDiaryKey } from "./diaryAdmin";
import { checkAndPinBundle } from "./keyPins";

let isSyncRunning = false;
let rerunRequested = false;
const syncListeners = new Set<(syncing: boolean) => void>();

function setSyncing(val: boolean) {
  isSyncRunning = val;
  syncListeners.forEach((fn) => fn(val));
}

export function useSyncStatus(): boolean {
  const [syncing, setState] = useState(isSyncRunning);
  useEffect(() => {
    syncListeners.add(setState);
    return () => {
      syncListeners.delete(setState);
    };
  }, []);
  return syncing;
}

export type SyncPhase = "idle" | "diaries" | "entries" | "invites" | "done";
type SyncProgressState = {
  runs: number;
  label: string;
  fraction: number;
  phase: SyncPhase;
};
let progressState: SyncProgressState = {
  runs: 0,
  label: "Decrypting",
  fraction: 0,
  phase: "idle",
};
const progressListeners = new Set<(s: SyncProgressState) => void>();

function updateProgress(patch: Partial<SyncProgressState>) {
  progressState = { ...progressState, ...patch };
  progressListeners.forEach((fn) => fn(progressState));
}

const SYNC_REQUEST_TIMEOUT_MS = 15_000;

async function withSyncRequestTimeout<T>(
  request: (signal: AbortSignal) => PromiseLike<T>,
  description: string,
): Promise<T> {
  const controller = new AbortController();
  let timeout: ReturnType<typeof setTimeout> | undefined;

  try {
    const requestPromise: Promise<T> = Promise.resolve().then(() =>
      request(controller.signal),
    );
    const timeoutPromise = new Promise<T>((_, reject) => {
        timeout = setTimeout(() => {
          controller.abort();
          reject(new Error(`${description} timed out.`));
        }, SYNC_REQUEST_TIMEOUT_MS);
      });
    return await Promise.race<T>([requestPromise, timeoutPromise]);
  } catch (error) {
    console.warn(`[Sync] ${description} failed:`, error);
    throw error;
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

export function getSyncRuns(): number {
  return progressState.runs;
}

export function useSyncProgress(): SyncProgressState {
  const [state, setState] = useState(progressState);
  useEffect(() => {
    progressListeners.add(setState);
    setState(progressState);
    return () => {
      progressListeners.delete(setState);
    };
  }, []);
  return state;
}

export async function runSync(session: {
  userId: string;
  kemKeys: {
    x25519Priv: Uint8Array;
    mlkem768Priv: Uint8Array;
    publicKeyHex?: string;
  };
  signKeys: {
    ed25519Priv: Uint8Array;
    mldsa65Priv: Uint8Array;
    publicKeyHex?: string;
  };
}): Promise<void> {
  if (isSyncRunning) {
    rerunRequested = true;
    return;
  }
  setSyncing(true);
  updateProgress({
    label: "Unlocking your diaries",
    fraction: 0,
    phase: "diaries",
  });

  try {
    // push local unsynced diaries first
    await pushPendingDiaries(session);
    // sync remote diaries and memberships
    await syncDiariesAndMembers(session);
    await rotatePendingDiaries(session);
    updateProgress({
      phase: "entries",
      label: "Decrypting your entries",
      fraction: 0.3,
    });
    // sync pending outgoing entries
    await pushOfflineEntryQueue(session);
    // pull incoming entries by change_seq
    await pullRemoteEntries(session);
    updateProgress({ phase: "invites", label: "Finishing up", fraction: 0.95 });
    // pull pending invites. email expensive so i put it in the app :fire:
    await pullInvites(session.userId);
  } catch (err) {
    console.warn("[NiceSapien Tech SyncEngine :nerd:] Sync error: ", err);
  } finally {
    updateProgress({
      runs: progressState.runs + 1,
      fraction: 1,
      phase: "done",
    });
    setSyncing(false);
    if (rerunRequested) {
      rerunRequested = false;
      void runSync(session);
    }
    downloadPendingAttachments()
      .then((n) => {
        if (n > 0) updateProgress({ runs: progressState.runs + 1 });
      })
      .catch((e) => console.warn("[Sync] attachment download error", e));
  }
}

async function pushPendingDiaries(session: {
  userId: string;
  kemKeys: {
    x25519Priv: Uint8Array;
    mlkem768Priv: Uint8Array;
    publicKeyHex?: string;
  };
  signKeys: {
    ed25519Priv: Uint8Array;
    mldsa65Priv: Uint8Array;
    publicKeyHex?: string;
  };
}) {
  if (!session.kemKeys.publicKeyHex) return;
  const allLocal = await db.select().from(diariesTable);

  for (const diary of allLocal) {
    if (diary.syncState === "synced" && diary.remoteId) continue;

    const remoteId = diary.remoteId || Crypto.randomUUID();
    let keyHex = await getDiaryKey(remoteId, diary.keyEpoch);
    if (!keyHex) {
      const randomKey = Crypto.getRandomValues(new Uint8Array(32));
      keyHex = bytesToHex(randomKey);
      await saveDiaryKey(remoteId, keyHex, diary.keyEpoch);
    }
    const diaryKey = hexToBytes(keyHex);

    const metaBlob = encryptBlob(
      { name: diary.name, color: diary.color },
      diaryKey,
      { diaryId: remoteId, keyEpoch: diary.keyEpoch },
    );

    const wrappedKey = wrapDiaryKey(
      diaryKey,
      hexToBytes(session.kemKeys.publicKeyHex),
    );
    const wrappedSig = signWrappedKey(
      wrappedKey,
      remoteId,
      session.userId,
      session.userId,
      session.signKeys.ed25519Priv,
      session.signKeys.mldsa65Priv,
    );

    const ownerMemberBlob = encryptBlob(
      { name: diary.ownerId || "Owner", photo: null },
      diaryKey,
      { diaryId: remoteId, keyEpoch: diary.keyEpoch },
    );

    const { error } = await withSyncRequestTimeout(
      (signal) =>
        supabase
          .rpc("create_diary", {
            p_id: remoteId,
            p_meta_blob: metaBlob,
            p_wrapped_key: wrappedKey,
            p_wrapped_sig: wrappedSig,
            p_member_blob: null,
          })
          .abortSignal(signal),
      `Creating diary ${diary.name}`,
    );

    if (!error || error.message?.includes("duplicate key")) {
      await db
        .update(diariesTable)
        .set({
          remoteId,
          ownerId: session.userId,
          syncState: "synced",
        })
        .where(eq(diariesTable.id, diary.id));
    } else {
      console.warn(`[Sync] Failed to push diary ${diary.name}: `, error);
    }
  }
}

type FullSession = Parameters<typeof runSync>[0];

type SyncSession = {
  userId: string;
  kemKeys: { x25519Priv: Uint8Array; mlkem768Priv: Uint8Array };
  signKeys: { publicKeyHex?: string };
};

async function resolveSignPub(
  userId: string,
  ctx: string,
  session: SyncSession,
  cache: Map<string, string | null>,
): Promise<string | null> {
  if (userId === session.userId) return session.signKeys.publicKeyHex ?? null;
  if (cache.has(userId)) return cache.get(userId) ?? null;

  let signPub: string | null = null;
  const { data, error } = await withSyncRequestTimeout(
    (signal) =>
      supabase
        .rpc("get_public_bundle", { p_user_id: userId })
        .abortSignal(signal),
    `Fetching signing keys for ${ctx}`,
  );
  const bundle = !error && Array.isArray(data) ? data[0] : null;
  if (
    bundle &&
    bundle.id === userId &&
    verifyPublicBundle(
      bundle.id,
      bundle.kem_public_key,
      bundle.sign_public_key,
      bundle.bundle_signature,
    )
  ) {
    const pinChanged = await checkAndPinBundle(
      bundle.id,
      bundle.kem_public_key,
      bundle.sign_public_key,
    );
    if (pinChanged) {
      console.warn(
        `[Sync] ${ctx}: user's keys changed since first seen, skipping.`,
      );
    } else {
      signPub = bundle.sign_public_key;
    }
  } else {
    console.warn(
      `[Sync] ${ctx}: could not verify the user's public bundle, skipping.`,
    );
  }
  cache.set(userId, signPub);
  return signPub;
}

async function isWrappedKeyTrusted(
  row: {
    wrapped_key?: string | null;
    wrapped_sig?: string | null;
    wrapped_by?: string | null;
  },
  diaryId: string,
  session: SyncSession,
  signerSignPubCache: Map<string, string | null>,
): Promise<boolean> {
  const { wrapped_key, wrapped_sig, wrapped_by } = row;
  if (!wrapped_key || !wrapped_sig || !wrapped_by) {
    console.warn(
      `[Sync] Diary ${diaryId}: wrapped key is missing signature data, skipping.`,
    );
    return false;
  }

  const signerSignPub = await resolveSignPub(
    wrapped_by,
    `Diary ${diaryId}`,
    session,
    signerSignPubCache,
  );

  if (!signerSignPub) return false;
  const ok = verifyWrappedKeySig(
    wrapped_key,
    diaryId,
    session.userId,
    wrapped_by,
    wrapped_sig,
    signerSignPub,
  );
  if (!ok) {
    console.warn(
      `[Sync] Diary ${diaryId}: invalid signature on wrapped key, skipping.`,
    );
  }
  return ok;
}

async function syncDiariesAndMembers(session: SyncSession) {
  const { data: memberRows, error } = await withSyncRequestTimeout(
    (signal) =>
      supabase
        .from("diary_members")
        .select(
          "diary_id, role, wrapped_key, wrapped_by, wrapped_sig, key_epoch, member_blob, diaries(id, owner_id, meta_blob, key_epoch)",
        )
        .eq("user_id", session.userId)
        .abortSignal(signal),
    "Fetching diary memberships",
  );

  if (error || !memberRows) return;

  const signerSignPubCache = new Map<string, string | null>();
  let diaryIdx = 0;

  for (const row of memberRows) {
    updateProgress({
      label: `Unlocking diary ${diaryIdx + 1} of ${memberRows.length}`,
      fraction: (0.3 * diaryIdx) / memberRows.length,
    });
    diaryIdx++;
    const diary = (row as any).diaries;
    if (!diary) continue;

    let keyHex = await getDiaryKey(diary.id, row.key_epoch);

    if (!keyHex) {
      if (
        !(await isWrappedKeyTrusted(row, diary.id, session, signerSignPubCache))
      ) {
        continue;
      }
      try {
        const unwrapped = unwrapDiaryKey(row.wrapped_key, session.kemKeys);
        keyHex = bytesToHex(unwrapped);
        await saveDiaryKey(diary.id, keyHex, row.key_epoch);
      } catch (e) {
        console.warn(`[Sync] Failed to unwrap key for diary ${diary.id}: `, e);
        continue;
      }
    }
    const keyBytes = hexToBytes(keyHex);
    let meta = { name: "Untitled Diary", color: "cobalt" };
    let metaOk = true;
    try {
      meta = decryptBlob(diary.meta_blob, keyBytes, {
        diaryId: diary.id,
        keyEpoch: diary.key_epoch,
      });
    } catch (e) {
      metaOk = false;
      console.warn(
        `[Sync] Failed to decrypt meta blob for diary ${diary.id}: `,
        e,
      );
    }

    if (diary.key_history_blob) {
      try {
        const history = decryptBlob<Record<string, string>>(
          diary.key_history_blob,
          keyBytes,
          { diaryId: diary.id, keyEpoch: diary.key_epoch },
        );
        for (const [epoch, hex] of Object.entries(history)) {
          if (!(await getDiaryKey(diary.id, Number(epoch)))) {
            await saveDiaryKey(diary.id, hex, Number(epoch));
          }
        }
      } catch (e) {
        console.warn(`[Sync] Failed to read key history for ${diary.id}: `, e);
      }
    }

    let rulesJson: string | null = null;
    let rulesOk = true;
    if (diary.rules_blob) {
      try {
        rulesJson = JSON.stringify(
          decryptBlob(diary.rules_blob, keyBytes, {
            diaryId: diary.id,
            keyEpoch: diary.key_epoch,
          }),
        );
      } catch (e) {
        rulesOk = false;
        console.warn(`[Sync] Failed to decrypt rules for ${diary.id}: `, e);
      }
    }
    const rotationPending = diary.rotation_pending ? 1 : 0;

    const [existing] = await db
      .select()
      .from(diariesTable)
      .where(eq(diariesTable.remoteId, diary.id));

    if (!existing) {
      await db.insert(diariesTable).values({
        remoteId: diary.id,
        ownerId: diary.owner_id,
        name: meta.name,
        color: meta.color,
        keyEpoch: diary.key_epoch,
        rules: rulesJson,
        rotationPending,
        syncState: "synced",
      });
    } else if (existing.syncState === "synced") {
      await db
        .update(diariesTable)
        .set({
          ownerId: diary.owner_id,
          keyEpoch: diary.key_epoch,
          rotationPending,
          ...(metaOk ? { name: meta.name, color: meta.color } : {}),
          ...(rulesOk ? { rules: rulesJson } : {}),
        })
        .where(eq(diariesTable.id, existing.id));
    }
  }
  const remoteIds = new Set(memberRows.map((r) => r.diary_id));
  const locals = await db.select().from(diariesTable);
  for (const d of locals) {
    if (d.remoteId && d.syncState === "synced" && !remoteIds.has(d.remoteId)) {
      await deleteDiaryWithMedia(d.id);
    }
  }
}

async function rotatePendingDiaries(session: FullSession) {
  const mine = await db
    .select()
    .from(diariesTable)
    .where(
      and(
        eq(diariesTable.ownerId, session.userId),
        eq(diariesTable.rotationPending, 1),
      ),
    );
  for (const d of mine) {
    try {
      await rotateDiaryKey(d, session);
    } catch (e) {
      console.warn(`[Sync] Key rotation failed for diary ${d.id}: `, e);
    }
  }
}

async function pushOfflineEntryQueue(session: FullSession) {
  const currentUserId = session.userId;
  const { ed25519Priv, mldsa65Priv } = session.signKeys;
  const pending = await db
    .select()
    .from(entriesTable)
    .where(
      or(
        eq(entriesTable.syncState, "pending_insert"),
        eq(entriesTable.syncState, "pending_update"),
        eq(entriesTable.syncState, "pending_delete"),
      ),
    );

  for (const entry of pending) {
    const [diary] = await db
      .select()
      .from(diariesTable)
      .where(eq(diariesTable.id, entry.diaryId));

    if (!diary || !diary.remoteId) continue;

    if (entry.keyEpoch !== diary.keyEpoch) {
      await db
        .update(entriesTable)
        .set({ keyEpoch: diary.keyEpoch })
        .where(eq(entriesTable.id, entry.id));
      entry.keyEpoch = diary.keyEpoch;
    }

    const diaryKeyHex = await getDiaryKey(diary.remoteId, entry.keyEpoch);
    if (!diaryKeyHex) continue;
    const diaryKey = hexToBytes(diaryKeyHex);

    const remoteEntryId = entry.remoteId || Crypto.randomUUID();
    let attachments: ManifestItem[] = [];
    if (entry.syncState !== "pending_delete") {
      const uploaded = await uploadEntryAttachments({
        entryId: entry.id,
        entryRemoteId: remoteEntryId,
        authorId: entry.authorId,
        diaryRemoteId: diary.remoteId,
        keyEpoch: entry.keyEpoch,
        diaryKey,
      });
      if (!uploaded) continue;
      attachments = await buildManifest(entry.id);
    }
    if (
      entry.syncState !== "pending_insert" &&
      entry.authorId !== currentUserId
    ) {
      console.warn(
        `[Sync] Entry ${remoteEntryId}: not the author, skipping push.`,
      );
      continue;
    }
    const rowCtx = {
      entryRemoteId: remoteEntryId,
      diaryRemoteId: diary.remoteId,
      authorId: entry.authorId,
      currentUserId,
    };

    if (entry.syncState === "pending_insert") {
      const blobHex = encryptBlob(
        {
          title: entry.title,
          body: entry.body,
          entryDate: entry.entryDate,
          entryTime: entry.entryTime ?? null,
          mood: entry.mood ?? null,
          attachments,
        },
        diaryKey,
        {
          diaryId: diary.remoteId,
          entryId: remoteEntryId,
          keyEpoch: entry.keyEpoch,
        },
      );

      const sig = signEntry(
        {
          diaryId: diary.remoteId,
          entryId: remoteEntryId,
          authorId: currentUserId,
          keyEpoch: entry.keyEpoch,
          version: 1,
          deleted: false,
          blob: blobHex,
        },
        ed25519Priv,
        mldsa65Priv,
      );
      const { data, error } = await withSyncRequestTimeout(
        (signal) =>
          supabase
            .from("entries")
            .insert({
              id: remoteEntryId,
              diary_id: diary.remoteId,
              author_id: currentUserId,
              blob: blobHex,
              sig,
              key_epoch: entry.keyEpoch,
              version: 1,
              deleted: false,
            })
            .select("change_seq, version")
            .abortSignal(signal)
            .single(),
        `Uploading entry ${remoteEntryId}`,
      );
      if (error)
        console.warn(
          `[Sync] ${entry.syncState} ${remoteEntryId} failed:`,
          error.code,
          error.message,
        );

      if (!error && data) {
        await db
          .update(entriesTable)
          .set({
            remoteId: remoteEntryId,
            authorId: currentUserId,
            changeSeq: Number(data.change_seq),
            version: data.version,
            syncState: "synced",
          })
          .where(eq(entriesTable.id, entry.id));
        await syncAttachmentRows(rowCtx, attachments);
      }
    } else if (entry.syncState === "pending_update") {
      const blobHex = encryptBlob(
        {
          title: entry.title,
          body: entry.body,
          entryDate: entry.entryDate,
          entryTime: entry.entryTime ?? null,
          mood: entry.mood ?? null,
          attachments,
        },
        diaryKey,
        {
          diaryId: diary.remoteId,
          entryId: remoteEntryId,
          keyEpoch: entry.keyEpoch,
        },
      );

      const nextVersion = entry.version + 1;
      const sig = signEntry(
        {
          diaryId: diary.remoteId,
          entryId: remoteEntryId,
          authorId: currentUserId,
          keyEpoch: entry.keyEpoch,
          version: nextVersion,
          deleted: false,
          blob: blobHex,
        },
        ed25519Priv,
        mldsa65Priv,
      );
      const { data, error } = await withSyncRequestTimeout(
        (signal) =>
          supabase
            .from("entries")
            .update({
              blob: blobHex,
              version: nextVersion,
              sig,
            })
            .eq("id", remoteEntryId)
            .eq("version", entry.version)
            .select("change_seq, version")
            .abortSignal(signal)
            .single(),
        `Updating entry ${remoteEntryId}`,
      );
      if (error)
        console.warn(
          `[Sync] ${entry.syncState} ${remoteEntryId} failed:`,
          error.code,
          error.message,
        );

      if (!error && data) {
        await db
          .update(entriesTable)
          .set({
            changeSeq: Number(data.change_seq),
            version: data.version,
            syncState: "synced",
          })
          .where(eq(entriesTable.id, entry.id));
        await syncAttachmentRows(rowCtx, attachments);
      }
    } else if (entry.syncState === "pending_delete") {
      const nextVersion = entry.version + 1;
      const sig = signEntry(
        {
          diaryId: diary.remoteId,
          entryId: remoteEntryId,
          authorId: currentUserId,
          keyEpoch: entry.keyEpoch,
          version: nextVersion,
          deleted: true,
          blob: "",
        },
        ed25519Priv,
        mldsa65Priv,
      );

      const { data, error } = await withSyncRequestTimeout(
        (signal) =>
          supabase
            .from("entries")
            .update({ deleted: true, blob: "", version: nextVersion, sig })
            .eq("id", remoteEntryId)
            .eq("version", entry.version)
            .select("change_seq, version")
            .abortSignal(signal)
            .single(),
        `Deleting entry ${remoteEntryId}`,
      );
      if (error)
        console.warn(
          `[Sync] ${entry.syncState} ${remoteEntryId} failed:`,
          error.code,
          error.message,
        );

      if (!error && data) {
        await db
          .update(entriesTable)
          .set({
            title: "",
            body: null,
            mood: null,
            deleted: 1,
            version: data.version,
            changeSeq: Number(data.change_seq),
            syncState: "synced",
          })
          .where(eq(entriesTable.id, entry.id));
        await db
          .delete(AttachmentsTable)
          .where(eq(AttachmentsTable.entryId, entry.id));
      }
    }
  }
}

async function pullRemoteEntries(session: FullSession) {
  const signerCache = new Map<string, string | null>();
  const localDiaries = await db.select().from(diariesTable);
  let diaryIdx = 0;

  for (const diary of localDiaries) {
    const diaryNo = ++diaryIdx;
    const base = 0.3 + (0.65 * (diaryNo - 1)) / localDiaries.length;
    const span = 0.65 / localDiaries.length;
    if (!diary.remoteId) continue;

    const diaryKeyHex = await getDiaryKey(diary.remoteId, diary.keyEpoch);
    if (!diaryKeyHex) continue;
    const diaryKey = hexToBytes(diaryKeyHex);

    const cursor = Math.max(0, (diary.lastSyncedSeq || 0) - 50);

    const { data: remoteEntries, error } = await withSyncRequestTimeout(
      (signal) =>
        supabase
          .from("entries")
          .select(
            "id, diary_id, author_id, blob, sig, key_epoch, version, deleted, change_seq, created_at, updated_at",
          )
          .eq("diary_id", diary.remoteId)
          .gt("change_seq", cursor)
          .order("change_seq", { ascending: true })
          .abortSignal(signal),
      `Fetching entries for diary ${diaryNo} of ${localDiaries.length}`,
    );

    if (error || !remoteEntries || remoteEntries.length === 0) continue;

    let maxSeq = diary.lastSyncedSeq || 0;
    let retryFrom: number | null = null;
    let n = 0;

    for (const remote of remoteEntries) {
      n++;
      updateProgress({
        label: `Diary ${diaryNo} of ${localDiaries.length} · entry ${n} of ${remoteEntries.length}`,
        fraction: base + (span * n) / remoteEntries.length,
      });
      if (n % 10 === 0) await new Promise((r) => setTimeout(r, 0));
      const seq = Number(remote.change_seq);
      if (seq > maxSeq) maxSeq = seq;

      const [existing] = await db
        .select()
        .from(entriesTable)
        .where(eq(entriesTable.remoteId, remote.id));

      if (remote.deleted) {
        const authorPub = await resolveSignPub(
          remote.author_id,
          `Entry ${remote.id}`,
          session,
          signerCache,
        );
        if (!authorPub) {
          retryFrom = Math.min(retryFrom ?? seq - 1, seq - 1);
          continue;
        }
        const sigOk =
          !!remote.sig &&
          verifyEntrySig(
            {
              diaryId: diary.remoteId,
              entryId: remote.id,
              authorId: remote.author_id,
              keyEpoch: remote.key_epoch,
              version: remote.version,
              deleted: !!remote.deleted,
              blob: remote.blob,
            },
            remote.sig,
            authorPub,
          );
        if (!sigOk) {
          console.warn(
            `[Sync] Entry ${remote.id}: signature bad or missing so me skipping :fire:`,
          );
          continue;
        }

        if (existing) {
          if (existing.authorId && existing.authorId !== remote.author_id) {
            console.warn(
              `[Sync] Entry ${remote.id}: author changed, skipping.`,
            );
            continue;
          }
          if (remote.version < existing.version) {
            console.warn(
              `[Sync] Entry ${remote.id}: server sent an older version (rollback), skipping.`,
            );
          }
          if (
            existing.deleted === 1 &&
            existing.syncState === "synced" &&
            !remote.deleted
          ) {
            console.warn(
              `[Sync] Entry ${remote.id}: server resurrected a deleted entry, skipping.`,
            );
            continue;
          }
        }

        if (remote.deleted) {
          if (existing) {
            await db
              .update(entriesTable)
              .set({
                title: "",
                body: null,
                mood: null,
                deleted: 1,
                version: remote.version,
                changeSeq: seq,
                syncState: "synced",
              })
              .where(eq(entriesTable.id, existing.id));
            await db
              .delete(AttachmentsTable)
              .where(eq(AttachmentsTable.entryId, existing.id));
          } else {
            await db.insert(entriesTable).values({
              remoteId: remote.id,
              diaryId: diary.id,
              authorId: remote.author_id,
              title: "",
              body: null,
              entryDate: "",
              version: remote.version,
              keyEpoch: remote.key_epoch,
              changeSeq: seq,
              deleted: 1,
              syncState: "synced",
            });
          }
          continue;
        }
      }

      let payload: {
        title: string;
        body: string;
        entryDate: string;
        entryTime?: string | null;
        mood?: string | null;
        attachments?: ManifestItem[];
      };
      let entryKey = diaryKey;
      if (remote.key_epoch !== diary.keyEpoch) {
        const oldHex = await getDiaryKey(diary.remoteId, remote.key_epoch);
        if (!oldHex) {
          console.warn(
            `[Sync] Entry ${remote.id}: no key for epoch ${remote.key_epoch}, skipping.`,
          );
          continue;
        }
        entryKey = hexToBytes(oldHex);
      }

      try {
        payload = decryptBlob(remote.blob, entryKey, {
          diaryId: diary.remoteId,
          entryId: remote.id,
          keyEpoch: remote.key_epoch,
        });
      } catch (e) {
        console.warn(`[Sync] Failed to decrypt remote entry ${remote.id}: `, e);
        continue;
      }

      const remoteMood = typeof payload.mood === "string" ? payload.mood : null;

      if (!existing) {
        const ins = await db.insert(entriesTable).values({
          remoteId: remote.id,
          diaryId: diary.id,
          authorId: remote.author_id,
          title: payload.title,
          body: payload.body,
          entryDate: payload.entryDate,
          entryTime: payload.entryTime ?? null,
          mood: remoteMood,
          version: remote.version,
          keyEpoch: remote.key_epoch,
          changeSeq: seq,
          deleted: 0,
          syncState: "synced",
        });
        await applyRemoteManifest(ins.lastInsertRowId, payload.attachments);
      } else {
        if (
          existing.syncState === "pending_update" &&
          remote.version > existing.version
        ) {
          await db
            .update(entriesTable)
            .set({
              syncState: "conflict",
              conflictServerData: JSON.stringify(payload),
              changeSeq: seq,
            })
            .where(eq(entriesTable.id, existing.id));
        } else if (existing.syncState === "synced") {
          await db
            .update(entriesTable)
            .set({
              title: payload.title,
              body: payload.body,
              entryDate: payload.entryDate,
              entryTime: payload.entryTime ?? null,
              mood: remoteMood,
              version: remote.version,
              changeSeq: seq,
              syncState: "synced",
            })
            .where(eq(entriesTable.id, existing.id));
          await applyRemoteManifest(existing.id, payload.attachments);
        }
      }
    }
    if (retryFrom !== null) maxSeq = Math.min(maxSeq, retryFrom);
    if (maxSeq > diary.lastSyncedSeq) {
      await db
        .update(diariesTable)
        .set({ lastSyncedSeq: maxSeq })
        .where(eq(diariesTable.id, diary.id));
    }
  }
}

async function pullInvites(currentUserId: string) {
  const controller = new AbortController();
  let timeout: ReturnType<typeof setTimeout> | undefined;

  try {
    const result = await Promise.race([
      supabase
        .from("diary_invites")
        .select(
          "id, diary_id, inviter_id, wrapped_key, wrapped_sig, preview_blob, key_epoch, created_at",
        )
        .eq("invitee_id", currentUserId)
        .abortSignal(controller.signal),
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => {
          controller.abort();
          reject(new Error("Fetching diary invites timed out."));
        }, 15_000);
      }),
    ]);

    if (result.error) {
      console.warn("[Sync] Could not fetch diary invites:", result.error.message);
      return;
    }
    if (!result.data) return;

    for (const inv of result.data) {
      await db
        .insert(diaryInvitesTable)
        .values({
          id: inv.id,
          diaryRemoteId: inv.diary_id,
          inviterId: inv.inviter_id,
          wrappedKey: inv.wrapped_key,
          wrappedSig: inv.wrapped_sig,
          previewBlob: inv.preview_blob,
          keyEpoch: inv.key_epoch,
          createdAt: inv.created_at,
        })
        .onConflictDoNothing();
    }
  } catch (requestError) {
    console.warn("[Sync] Could not fetch diary invites:", requestError);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

export function waitForSyncIdle(timeoutMs = 10_000): Promise<void> {
  if (!isSyncRunning) return Promise.resolve();
  return new Promise((resolve) => {
    const finish = () => {
      syncListeners.delete(onChange);
      clearTimeout(timer);
      resolve();
    };
    const onChange = (syncing: boolean) => {
      if (!syncing) finish();
    };
    const timer = setTimeout(finish, timeoutMs);
    syncListeners.add(onChange);
  });
}
