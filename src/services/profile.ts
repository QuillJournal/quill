import type { UserSessionData } from "../context/UserSessionContext";
import { db } from "../db";
import { saveLocalProfile } from "../db/localProfile";
import { diariesTable } from "../db/schema";
import {
  getUserProfileRecord,
  updateUserEncryptedProfile,
  type UserProfileRecord,
} from "../utils/auth";
import {
  decryptUserProfile,
  encryptUserProfile,
  type DecryptedProfile,
} from "../utils/crypto";
import { getSharePhotoPreference, updateMyMemberBlob } from "./sharing";
import { getStoredVaultKey } from "./storage/secureKeyStore";

export const NAME_MAX = 40;

export function validateName(raw: string): string {
  const name = raw.replace(/\s+/g, " ").trim();
  if (!name) throw new Error("Name can't be empty.");
  if (name.length > NAME_MAX)
    throw new Error(`Name must be ${NAME_MAX} characters or fewer.`);
  return name;
}

export async function changeAccountName(
  session: UserSessionData,
  rawName: string,
): Promise<string> {
  const name = validateName(rawName);
  const derivedKey = await getStoredVaultKey();
  if (!derivedKey)
    throw new Error("Encryption key not found. Please login again.");

  const record = await getUserProfileRecord(session.userId);
  let current;
  try {
    current = decryptUserProfile(
      record.encrypted_profile,
      record.profile_nonce,
      derivedKey,
    );
  } catch {
    throw new Error("Could not read your profile. Please sign in again.");
  }

  const enc = encryptUserProfile({ ...current, name }, derivedKey);
  await updateUserEncryptedProfile(
    session.userId,
    enc.encryptedProfileHex,
    enc.profileNonceHex,
  );
  await saveLocalProfile(
    session.userId,
    name,
    session.photoUri,
    session.kemKeys?.publicKeyHex ?? "",
  );
  return name;
}

export async function propagateNameToDiaries(
  session: UserSessionData,
): Promise<number> {
  const diaries = await db.select().from(diariesTable);
  let failed = 0;
  for (const d of diaries) {
    if (!d.remoteId || d.syncState !== "synced") continue;
    try {
      await updateMyMemberBlob(
        d.remoteId,
        d.keyEpoch,
        await getSharePhotoPreference(d.remoteId, d.keyEpoch, session),
        session,
      );
    } catch (e) {
      failed++;
      console.warn(`[Profile] member blob update failed for ${d.remoteId}`, e);
    }
  }
  return failed;
}

export async function adoptVaultKey(
  record: UserProfileRecord,
  kek: Uint8Array,
  vaultKey: Uint8Array,
): Promise<DecryptedProfile> {
  const current = decryptUserProfile(
    record.encrypted_profile,
    record.profile_nonce,
    kek,
  );
  const enc = encryptUserProfile(current, vaultKey);
  await updateUserEncryptedProfile(
    record.id,
    enc.encryptedProfileHex,
    enc.profileNonceHex,
  );
  return current;
}
