import { eq } from "drizzle-orm";
import * as FileSystem from "expo-file-system/legacy";
import * as SecureStore from "expo-secure-store";
import { UserSessionData } from "../context/UserSessionContext";
import { db } from "../db";
import { getDiaryById, getDiaryKey, saveDiaryKey } from "../db/diaries";
import { diaryInvitesTable, diaryMembersTable } from "../db/schema";
import {
  bytesToHex,
  computeSafetyNumber,
  decryptBlob,
  encryptBlob,
  hexToBytes,
  signWrappedKey,
  unwrapDiaryKey,
  verifyPublicBundle,
  verifyWrappedKeySig,
  wrapDiaryKey,
} from "../utils/crypto";
import { supabase } from "../utils/supabase";
import { checkAndPinBundle } from "./keyPins";
import { runSync } from "./syncEngine";

export interface LookedUpUser {
  id: string;
  username: string;
  kemPublicKey: string;
  signPublicKey: string;
  bundleSignature: string;
  safetyNumber: string;
  pinChanged: boolean;
}

export interface DecryptedInvite {
  id: string;
  diaryRemoteId: string;
  inviterId: string;
  inviterUsername: string;
  inviterName: string;
  diaryName: string;
  diaryColor: string;
  keyEpoch: number;
  diaryKeyBytes: Uint8Array;
  safetyNumber: string;
  pinChanged: boolean;
}

export interface DiaryMemberInfo {
  userId: string;
  username: string;
  role: "owner" | "member";
  name: string;
  photoDataUri: string | null;
  safetyNumber: string;
  pinChanged: boolean;
}

async function encodePhotoDataUri(
  photoUri: string | null | undefined,
): Promise<string | null> {
  if (!photoUri) return null;
  try {
    const b64 = await FileSystem.readAsStringAsync(photoUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return `data:image/jpeg;base64,${b64}`;
  } catch {
    return null;
  }
}

export async function buildMemberBlob(
  diaryRemoteId: string,
  diaryKeyBytes: Uint8Array,
  keyEpoch: number,
  displayName: string,
  photoUri: string | null,
  sharePhoto: boolean,
): Promise<string> {
  const photo = sharePhoto ? await encodePhotoDataUri(photoUri) : null;
  return encryptBlob({ name: displayName, photo }, diaryKeyBytes, {
    diaryId: diaryRemoteId,
    keyEpoch,
  });
}

export async function lookupUserForInvite(
  username: string,
  session: UserSessionData,
): Promise<LookedUpUser> {
  const clean = username.trim().toLowerCase();
  const { data, error } = await supabase.rpc("lookup_user", {
    p_username: clean,
  });
  if (error) throw new Error(error.message);

  const row = Array.isArray(data) ? data[0] : null;
  if (!row) {
    throw new Error(
      "User not found or hasn't initialized encryption keys yet.",
    );
  }

  const valid = verifyPublicBundle(
    row.id,
    row.kem_public_key,
    row.sign_public_key,
    row.bundle_signature,
  );
  if (!valid) {
    throw new Error(
      "Security alert: User's cryptographic bundle signature is invalid.",
    );
  }

  const pinChanged = await checkAndPinBundle(
    row.id,
    row.kem_public_key,
    row.sign_public_key,
  );
  const myBundle = `${session.kemKeys?.publicKeyHex ?? ""}:${session.signKeys?.publicKeyHex ?? ""}`;
  const theirBundle = `${row.kem_public_key}:${row.sign_public_key}`;
  const safetyNumber = computeSafetyNumber(
    session.userId,
    myBundle,
    row.id,
    theirBundle,
  );

  return {
    id: row.id,
    username: row.username,
    kemPublicKey: row.kem_public_key,
    signPublicKey: row.sign_public_key,
    bundleSignature: row.bundle_signature,
    safetyNumber,
    pinChanged,
  };
}

export async function sendDiaryInvite(
  localDiaryId: number,
  targetUser: LookedUpUser,
  session: UserSessionData,
): Promise<void> {
  if (!session.kemKeys || !session.signKeys)
    throw new Error("Keys not loaded.");

  await runSync({
    userId: session.userId,
    kemKeys: session.kemKeys,
    signKeys: session.signKeys,
  });

  const diary = await getDiaryById(localDiaryId);
  if (!diary?.remoteId)
    throw new Error("Diary must be synced before inviting.");

  const keyHex = await getDiaryKey(diary.remoteId, diary.keyEpoch);
  if (!keyHex) throw new Error("Diary encryption key not found.");
  const diaryKey = hexToBytes(keyHex);

  const wrappedKey = wrapDiaryKey(
    diaryKey,
    hexToBytes(targetUser.kemPublicKey),
  );
  const wrappedSig = signWrappedKey(
    wrappedKey,
    diary.remoteId,
    targetUser.id,
    session.userId,
    session.signKeys.ed25519Priv,
    session.signKeys.mldsa65Priv,
  );

  const previewBlob = encryptBlob(
    {
      name: diary.name,
      color: diary.color,
      inviterName: session.name || session.username,
    },
    diaryKey,
    { diaryId: diary.remoteId, keyEpoch: diary.keyEpoch },
  );

  const { error } = await supabase.rpc("invite_user", {
    p_diary_id: diary.remoteId,
    p_invitee_id: targetUser.id,
    p_wrapped_key: wrappedKey,
    p_wrapped_sig: wrappedSig,
    p_preview_blob: previewBlob,
  });

  if (error) {
    const msg = error.message || "";
    if (msg.includes("already_member"))
      throw new Error("User is already a member of this diary.");
    if (msg.includes("already_invited"))
      throw new Error("User already has a pending invite.");
    if (msg.includes("invitee_not_ready"))
      throw new Error("User hasn't logged in to initialize keys yet.");
    if (msg.includes("diary_full"))
      throw new Error("Diary has reached the 20 member limit.");
    if (msg.includes("rate_limited"))
      throw new Error("Too many invites sent recently. Try again later.");
    if (msg.includes("not_owner"))
      throw new Error("Only the diary owner can invite members.");
    throw new Error(msg);
  }
}

export async function fetchPendingInvites(
  session: UserSessionData,
): Promise<DecryptedInvite[]> {
  if (!session.kemKeys || !session.signKeys) return [];

  const { data: rows, error } = await supabase
    .from("diary_invites")
    .select(
      "id, diary_id, inviter_id, wrapped_key, wrapped_sig, preview_blob, key_epoch, created_at",
    )
    .eq("invitee_id", session.userId);

  if (error || !rows) return [];

  const results: DecryptedInvite[] = [];
  const myBundle = `${session.kemKeys.publicKeyHex}:${session.signKeys.publicKeyHex}`;

  for (const inv of rows) {
    try {
      const { data: bundleData } = await supabase.rpc("get_public_bundle", {
        p_user_id: inv.inviter_id,
      });
      const inviter = Array.isArray(bundleData) ? bundleData[0] : null;
      if (!inviter) continue;

      if (
        !verifyPublicBundle(
          inviter.id,
          inviter.kem_public_key,
          inviter.sign_public_key,
          inviter.bundle_signature,
        )
      ) {
        console.warn(
          "Invalid inviter public bundle signature for invite",
          inv.id,
        );
        continue;
      }

      if (
        !verifyWrappedKeySig(
          inv.wrapped_key,
          inv.diary_id,
          session.userId,
          inv.inviter_id,
          inv.wrapped_sig,
          inviter.sign_public_key,
        )
      ) {
        console.warn("Invalid wrapped_sig on invite", inv.id);
        continue;
      }

      const pinChanged = await checkAndPinBundle(
        inviter.id,
        inviter.kem_public_key,
        inviter.sign_public_key,
      );

      const diaryKeyBytes = unwrapDiaryKey(inv.wrapped_key, session.kemKeys);
      const preview = decryptBlob<{
        name: string;
        color: string;
        inviterName: string;
      }>(inv.preview_blob, diaryKeyBytes, {
        diaryId: inv.diary_id,
        keyEpoch: inv.key_epoch,
      });

      const theirBundle = `${inviter.kem_public_key}:${inviter.sign_public_key}`;
      const safetyNumber = computeSafetyNumber(
        session.userId,
        myBundle,
        inviter.id,
        theirBundle,
      );

      results.push({
        id: inv.id,
        diaryRemoteId: inv.diary_id,
        inviterId: inv.inviter_id,
        inviterUsername: inviter.username,
        inviterName: preview.inviterName || inviter.username,
        diaryName: preview.name || "Shared Diary",
        diaryColor: preview.color || "cobalt",
        keyEpoch: inv.key_epoch,
        diaryKeyBytes,
        safetyNumber,
        pinChanged,
      });
    } catch (e) {
      console.warn("Failed to process invite", inv.id, e);
    }
  }

  return results;
}

export async function acceptDiaryInvite(
  invite: DecryptedInvite,
  sharePhoto: boolean,
  session: UserSessionData,
): Promise<void> {
  if (!session.kemKeys || !session.signKeys)
    throw new Error("Keys not initialized.");

  await saveDiaryKey(
    invite.diaryRemoteId,
    bytesToHex(invite.diaryKeyBytes),
    invite.keyEpoch,
  );

  const memberBlob = await buildMemberBlob(
    invite.diaryRemoteId,
    invite.diaryKeyBytes,
    invite.keyEpoch,
    session.name || session.username,
    session.photoUri,
    sharePhoto,
  );

  const { error } = await supabase.rpc("accept_invite", {
    p_invite_id: invite.id,
    p_member_blob: memberBlob,
  });
  if (error) throw new Error(error.message);

  await SecureStore.setItemAsync(
    `quill_share_photo_${invite.diaryRemoteId}`,
    sharePhoto ? "1" : "0",
  );

  await db.delete(diaryInvitesTable).where(eq(diaryInvitesTable.id, invite.id));
  await runSync({
    userId: session.userId,
    kemKeys: session.kemKeys,
    signKeys: session.signKeys,
  });
}

export async function declineDiaryInvite(inviteId: string): Promise<void> {
  const { error } = await supabase
    .from("diary_invites")
    .delete()
    .eq("id", inviteId);
  if (error) throw new Error(error.message);
  await db.delete(diaryInvitesTable).where(eq(diaryInvitesTable.id, inviteId));
}

export async function fetchDiaryMembers(
  diaryRemoteId: string,
  keyEpoch: number,
  session: UserSessionData,
): Promise<DiaryMemberInfo[]> {
  const keyHex = await getDiaryKey(diaryRemoteId, keyEpoch);
  if (!keyHex) return [];
  const diaryKey = hexToBytes(keyHex);

  const { data, error } = await supabase.rpc("get_diary_members", {
    p_diary_id: diaryRemoteId,
  });
  if (error || !Array.isArray(data)) return [];

  const myBundle = `${session.kemKeys?.publicKeyHex ?? ""}:${session.signKeys?.publicKeyHex ?? ""}`;
  const members: DiaryMemberInfo[] = [];

  await db
    .delete(diaryMembersTable)
    .where(eq(diaryMembersTable.diaryRemoteId, diaryRemoteId));

  for (const row of data) {
    const isMe = row.user_id === session.userId;
    let name = isMe ? session.name || row.username : row.username;
    let photoDataUri: string | null = isMe ? session.photoUri : null;

    if (row.member_blob) {
      try {
        const dec = decryptBlob<{ name?: string; photo?: string | null }>(
          row.member_blob,
          diaryKey,
          { diaryId: diaryRemoteId, keyEpoch },
        );
        if (dec.name && dec.name !== "Owner") name = dec.name;
        if (dec.photo) photoDataUri = dec.photo;
      } catch {}
    } else if (isMe) {
      const sharePref = await getSharePhotoPreference(diaryRemoteId);
      updateMyMemberBlob(diaryRemoteId, keyEpoch, sharePref, session).catch(
        () => {},
      );
    }

    const pinChanged =
      !isMe && row.kem_public_key && row.sign_public_key
        ? await checkAndPinBundle(
            row.user_id,
            row.kem_public_key,
            row.sign_public_key,
          )
        : false;

    const theirBundle = `${row.kem_public_key ?? ""}:${row.sign_public_key ?? ""}`;
    const safetyNumber = computeSafetyNumber(
      session.userId,
      myBundle,
      row.user_id,
      theirBundle,
    );

    members.push({
      userId: row.user_id,
      username: row.username,
      role: row.role,
      name,
      photoDataUri,
      safetyNumber,
      pinChanged,
    });

    await db.insert(diaryMembersTable).values({
      diaryRemoteId,
      userId: row.user_id,
      username: row.username,
      role: row.role,
      name,
      photoUri: photoDataUri,
      joinedAt: row.joined_at,
    });
  }

  return members.sort((a, b) => {
    if (a.userId === session.userId) return -1;
    if (b.userId === session.userId) return 1;
    if (a.role === "owner") return -1;
    if (b.role === "owner") return 1;
    return a.name.localeCompare(b.name);
  });
}

export async function getSharePhotoPreference(
  diaryRemoteId: string,
): Promise<boolean> {
  const v = await SecureStore.getItemAsync(
    `quill_share_photo_${diaryRemoteId}`,
  );
  return v === "1";
}

export async function updateMyMemberBlob(
  diaryRemoteId: string,
  keyEpoch: number,
  sharePhoto: boolean,
  session: UserSessionData,
): Promise<void> {
  const keyHex = await getDiaryKey(diaryRemoteId, keyEpoch);
  if (!keyHex) throw new Error("Diary key missing");
  const diaryKey = hexToBytes(keyHex);

  const memberBlob = await buildMemberBlob(
    diaryRemoteId,
    diaryKey,
    keyEpoch,
    session.name || session.username,
    session.photoUri,
    sharePhoto,
  );

  const { error } = await supabase
    .from("diary_members")
    .update({ member_blob: memberBlob })
    .eq("diary_id", diaryRemoteId)
    .eq("user_id", session.userId);

  if (error) throw new Error(error.message);

  await SecureStore.setItemAsync(
    `quill_share_photo_${diaryRemoteId}`,
    sharePhoto ? "1" : "0",
  );
}
