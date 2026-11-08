import { and, eq } from "drizzle-orm";
import * as Crypto from "expo-crypto";
import { db } from "../db";
import { getDiaryKey, saveDiaryKey } from "../db/diaries";
import { diariesTable, diaryKeysTable, diaryMembersTable } from "../db/schema";
import type { DiaryRow } from "../types/diary";
import { DEFAULT_RULES, parseRules, type DiaryRules } from "../types/rules";
import {
    bytesToHex,
    decryptBlob,
    encryptBlob,
    hexToBytes,
    signWrappedKey,
    verifyPublicBundle,
    wrapDiaryKey,
} from "../utils/crypto";
import { supabase } from "../utils/supabase";
import { deleteDiaryWithMedia } from "./attachments";

//this file must NOT IMPORT syncEngine btw. (syncEngine imports ts)

type AdminSession = {
  userId: string;
  signKeys?: { ed25519Priv: Uint8Array; mldsa65Priv: Uint8Array } | null;
};

function friendlyError(message: string): string {
  if (message.includes("not_owner")) return "Only the diary owner can do that.";
  if (message.includes("stale_epoch"))
    return "This diary changed on another device. Let it sync, then try again.";
  if (message.includes("owner_cannot_leave"))
    return "Transfer ownership to someone else before leaving.";
  if (message.includes("not_member")) return "That person isn't a member.";
  if (message.includes("already_owner")) return "You're already the owner.";
  if (message.includes("wraps_mismatch"))
    return "Members changed while updating. Please try again.";
  if (message.includes("cannot_remove_owner"))
    return "The owner can't be removed.";
  return message;
}

function requireRemote(diary: DiaryRow): string {
  if (!diary.remoteId) throw new Error("This diary hasn't synced yet.");
  return diary.remoteId;
}

async function currentKey(diary: DiaryRow): Promise<Uint8Array> {
  const hex = await getDiaryKey(requireRemote(diary), diary.keyEpoch);
  if (!hex) throw new Error("Diary encryption key not found.");
  return hexToBytes(hex);
}

async function wipeDiaryKeysAndMembers(remoteId: string) {
  await db
    .delete(diaryKeysTable)
    .where(eq(diaryKeysTable.diaryRemoteId, remoteId));
  await db
    .delete(diaryMembersTable)
    .where(eq(diaryMembersTable.diaryRemoteId, remoteId));
}

async function getVerifiedBundle(userId: string) {
  const { data, error } = await supabase.rpc("get_public_bundle", {
    p_user_id: userId,
  });
  const b = !error && Array.isArray(data) ? data[0] : null;
  if (
    !b ||
    b.id !== userId ||
    !verifyPublicBundle(
      b.id,
      b.kem_public_key,
      b.sign_public_key,
      b.bundle_signature,
    )
  ) {
    throw new Error("Couldn't verify a member's encryption keys.");
  }
  return b as { kem_public_key: string; sign_public_key: string };
}

export async function renameDiary(diary: DiaryRow, name: string) {
  const remoteId = requireRemote(diary);
  const clean = name.trim();
  if (!clean) throw new Error("Give the diary a name.");
  const key = await currentKey(diary);
  const metaBlob = encryptBlob({ name: clean, color: diary.color }, key, {
    diaryId: remoteId,
    keyEpoch: diary.keyEpoch,
  });
  const { error } = await supabase.rpc("update_diary_settings", {
    p_diary_id: remoteId,
    p_key_epoch: diary.keyEpoch,
    p_meta_blob: metaBlob,
    p_rules_blob: null,
  });
  if (error) throw new Error(friendlyError(error.message));
  await db
    .update(diariesTable)
    .set({ name: clean })
    .where(eq(diariesTable.id, diary.id));
}

export async function saveDiaryRules(diary: DiaryRow, rules: DiaryRules) {
  const remoteId = requireRemote(diary);
  const key = await currentKey(diary);
  const rulesBlob = encryptBlob(rules, key, {
    diaryId: remoteId,
    keyEpoch: diary.keyEpoch,
  });
  const { error } = await supabase.rpc("update_diary_settings", {
    p_diary_id: remoteId,
    p_key_epoch: diary.keyEpoch,
    p_meta_blob: null,
    p_rules_blob: rulesBlob,
  });
  if (error) throw new Error(friendlyError(error.message));
  await db
    .update(diariesTable)
    .set({ rules: JSON.stringify(rules) })
    .where(eq(diariesTable.id, diary.id));
}

export async function leaveDiary(diary: DiaryRow) {
  const remoteId = requireRemote(diary);
  const { error } = await supabase.rpc("leave_diary", {
    p_diary_id: remoteId,
  });
  if (error) throw new Error(friendlyError(error.message));
  await wipeDiaryKeysAndMembers(remoteId);
  await deleteDiaryWithMedia(diary.id);
}

export async function transferOwnership(diary: DiaryRow, newOwnerId: string) {
  const remoteId = requireRemote(diary);
  const { error } = await supabase.rpc("transfer_diary_ownership", {
    p_diary_id: remoteId,
    p_new_owner_id: newOwnerId,
  });
  if (error) throw new Error(friendlyError(error.message));
  await db
    .update(diariesTable)
    .set({ ownerId: newOwnerId })
    .where(eq(diariesTable.id, diary.id));
}

export async function deleteDiaryEverywhere(diary: DiaryRow) {
  const remoteId = requireRemote(diary);
  const { data, error } = await supabase
    .from("diaries")
    .delete()
    .eq("id", remoteId)
    .select("id");
  if (error) throw new Error(friendlyError(error.message));
  if (!data || data.length === 0) {
    throw new Error("Only the diary owner can delete it.");
  }
  await wipeDiaryKeysAndMembers(remoteId);
  await deleteDiaryWithMedia(diary.id);
}

export async function rotateDiaryKey(
  diary: DiaryRow,
  session: AdminSession,
  removeUserId: string | null = null,
) {
  const remoteId = requireRemote(diary);
  if (!session.signKeys) throw new Error("Keys not loaded.");
  if (diary.ownerId !== session.userId) {
    throw new Error("Only the diary owner can do that.");
  }
  const { ed25519Priv, mldsa65Priv } = session.signKeys;

  const oldKey = await currentKey(diary);
  const newKey = Crypto.getRandomValues(new Uint8Array(32));
  const newEpoch = diary.keyEpoch + 1;
  const aad = { diaryId: remoteId, keyEpoch: newEpoch };

  const { data: rows, error: membersError } = await supabase.rpc(
    "get_diary_members",
    { p_diary_id: remoteId },
  );
  if (membersError || !Array.isArray(rows)) {
    throw new Error(membersError?.message ?? "Couldn't load members.");
  }

  const wraps: {
    user_id: string;
    wrapped_key: string;
    wrapped_sig: string;
    member_blob: string | null;
  }[] = [];

  for (const row of rows) {
    if (row.user_id === removeUserId) continue;
    const bundle = await getVerifiedBundle(row.user_id);
    const wrappedKey = wrapDiaryKey(newKey, hexToBytes(bundle.kem_public_key));
    const wrappedSig = signWrappedKey(
      wrappedKey,
      remoteId,
      row.user_id,
      session.userId,
      ed25519Priv,
      mldsa65Priv,
    );

    let memberBlob: string | null = null;
    if (row.member_blob) {
      try {
        const dec = decryptBlob(row.member_blob, oldKey, {
          diaryId: remoteId,
          keyEpoch: diary.keyEpoch,
        });
        memberBlob = encryptBlob(dec, newKey, aad);
      } catch {}
    }
    wraps.push({
      user_id: row.user_id,
      wrapped_key: wrappedKey,
      wrapped_sig: wrappedSig,
      member_blob: memberBlob,
    });
  }

  const keyRows = await db
    .select()
    .from(diaryKeysTable)
    .where(eq(diaryKeysTable.diaryRemoteId, remoteId));
  const history: Record<string, string> = {};
  for (const k of keyRows) history[String(k.keyEpoch)] = k.diaryKeyHex;

  const rules = diary.rules ? parseRules(diary.rules) : DEFAULT_RULES;

  const { error } = await supabase.rpc("rotate_diary_key", {
    p_diary_id: remoteId,
    p_new_epoch: newEpoch,
    p_meta_blob: encryptBlob(
      { name: diary.name, color: diary.color },
      newKey,
      aad,
    ),
    p_rules_blob: encryptBlob(rules, newKey, aad),
    p_key_history_blob: encryptBlob(history, newKey, aad),
    p_wraps: wraps,
    p_remove_user_id: removeUserId,
  });

  if (error) throw new Error(friendlyError(error.message));

  await saveDiaryKey(remoteId, bytesToHex(newKey), newEpoch);
  await db
    .update(diariesTable)
    .set({ keyEpoch: newEpoch, rotationPending: 0 })
    .where(eq(diariesTable.id, diary.id));
  if (removeUserId) {
    await db
      .delete(diaryMembersTable)
      .where(
        and(
          eq(diaryMembersTable.diaryRemoteId, remoteId),
          eq(diaryMembersTable.userId, removeUserId),
        ),
      );
  }
}
