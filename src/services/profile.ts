import type { UserSessionData } from "../context/UserSessionContext";
import { db } from "../db";
import { saveLocalProfile } from "../db/localProfile";
import { diariesTable } from "../db/schema";
import {
    getUserProfileRecord,
    updateUserEncryptedProfile,
} from "../utils/auth";
import { decryptUserProfile, encryptUserProfile } from "../utils/crypto";
import { getSharePhotoPreference, updateMyMemberBlob } from "./sharing";
import { getStoredDerivedKey } from "./storage/secureKeyStore";

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
  const derivedKey = await getStoredDerivedKey();
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
        await getSharePhotoPreference(d.remoteId),
        session,
      );
    } catch (e) {
      failed++;
      console.warn(`[Profile] member blob update failed for ${d.remoteId}`, e);
    }
  }
  return failed;
}
