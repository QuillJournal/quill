import { xchacha20poly1305 } from "@noble/ciphers/chacha.js";
import { ed25519, x25519 } from "@noble/curves/ed25519.js";
import { argon2id } from "@noble/hashes/argon2.js";
import { hkdf } from "@noble/hashes/hkdf.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex, hexToBytes } from "@noble/hashes/utils.js";
import { ml_dsa65 } from "@noble/post-quantum/ml-dsa.js";
import { ml_kem768 } from "@noble/post-quantum/ml-kem.js";
import * as Crypto from "expo-crypto";
import sodium from "react-native-libsodium";

export { bytesToHex, hexToBytes };

// --- Constants & Types ---
export const KEM_X25519_PUB_LEN = 32;
export const KEM_MLKEM_PUB_LEN = 1184;
export const KEM_PUB_LEN = KEM_X25519_PUB_LEN + KEM_MLKEM_PUB_LEN; // 1216 bytes

export const SIGN_ED25519_PUB_LEN = 32;
export const SIGN_MLDSA_PUB_LEN = 1952;
export const SIGN_PUB_LEN = SIGN_ED25519_PUB_LEN + SIGN_MLDSA_PUB_LEN; // 1984 bytes

export const SIGN_ED25519_SIG_LEN = 64;
export const SIGN_MLDSA_SIG_LEN = 3309;
export const DUAL_SIG_LEN = SIGN_ED25519_SIG_LEN + SIGN_MLDSA_SIG_LEN; // 3373 bytes

export interface HybridKemKeyPair {
  publicKeyBytes: Uint8Array;
  x25519Priv: Uint8Array;
  mlkem768Priv: Uint8Array;
}

export interface DualSignKeyPair {
  publicKeyBytes: Uint8Array;
  ed25519Priv: Uint8Array;
  mldsa65Priv: Uint8Array;
}

export interface UserSecretKeyBundle {
  kemX25519Priv: string;
  kemMlkem768Priv: string;
  signEd25519Priv: string;
  signMldsa65Priv: string;
  recoveryKey?: string;
}

export function padBytes(
  bytes: Uint8Array,
  blockSize: number = 64,
): Uint8Array {
  const padLen = blockSize - (bytes.length % blockSize);
  const padded = new Uint8Array(bytes.length + padLen);
  padded.set(bytes, 0);
  padded.fill(padLen, bytes.length);
  return padded;
}

export function unpadBytes(padded: Uint8Array): Uint8Array {
  if (padded.length === 0) throw new Error("Invalid empty ciphertext to unpad");
  const padLen = padded[padded.length - 1];
  if (padLen <= 0 || padLen > 64 || padLen > padded.length) {
    throw new Error("Invalid padding size");
  }
  for (let i = padded.length - padLen; i < padded.length; i++) {
    if (padded[i] !== padLen) throw new Error("Invalid padding byte");
  }
  return padded.slice(0, padded.length - padLen);
}

export async function deriveAuthAndEncKeys(
  password: string,
  email: string,
): Promise<{ authSecret: string; localEncKey: Uint8Array }> {
  const normalizedEmail = email.trim().toLowerCase();
  const fullHash = sha256(
    new TextEncoder().encode(`quill-v1${normalizedEmail}`),
  );
  const salt = new Uint8Array(16);
  salt.set(fullHash.subarray(0, 16));

  const passwordBytes = new TextEncoder().encode(password);
  let masterKey: Uint8Array;

  try {
    await sodium.ready;
    masterKey = sodium.crypto_pwhash(
      64,
      password,
      salt,
      3,
      64 * 1024 * 1024,
      sodium.crypto_pwhash_ALG_ARGON2ID13 ?? 2,
    );
  } catch {
    masterKey = argon2id(passwordBytes, salt, {
      t: 3,
      m: 65536,
      p: 1,
      dkLen: 64,
    });
  }

  const localEncKey = hkdf(
    sha256,
    masterKey,
    undefined,
    new TextEncoder().encode("quill-local-key-enc"),
    32,
  );
  const authSecretBytes = hkdf(
    sha256,
    masterKey,
    undefined,
    new TextEncoder().encode("quill-supabase-auth"),
    32,
  );

  // Auth secret sent as Supabase password
  const authSecret = bytesToHex(authSecretBytes);

  return { authSecret, localEncKey };
}

// --- Recovery Key Formatting ---
export function formatRecoveryKey(rawKey: Uint8Array): string {
  const hex = bytesToHex(rawKey).toUpperCase();
  const chunks = hex.match(/.{1,4}/g) || [];
  return chunks.join("-");
}

export function generateRecoveryKey(): {
  rawKey: Uint8Array;
  formattedKey: string;
} {
  const rawKey = Crypto.getRandomValues(new Uint8Array(32));
  return { rawKey, formattedKey: formatRecoveryKey(rawKey) };
}

export function wrapKeyBundles(
  bundle: UserSecretKeyBundle,
  localEncKey: Uint8Array,
  recoveryKeyBytes: Uint8Array,
): { encryptedKeyBundle: string; recoveryKeyBundle: string } {
  const { recoveryKey: _ignored, ...secret } = bundle;
  return {
    encryptedKeyBundle: encryptKeyBundle(
      { ...secret, recoveryKey: bytesToHex(recoveryKeyBytes) },
      localEncKey,
    ),
    recoveryKeyBundle: encryptKeyBundle(secret, recoveryKeyBytes),
  };
}

export function parseRecoveryKey(formattedKey: string): Uint8Array {
  const cleanHex = formattedKey.replace(/[^0-9A-Fa-f]/g, "");
  if (cleanHex.length !== 64) {
    throw new Error("Invalid recovery key: expected 64 hex characters.");
  }
  return hexToBytes(cleanHex);
}

// --- Key Pair Generation ---
export function generateHybridKemKeyPair(): HybridKemKeyPair {
  const xPriv = Crypto.getRandomValues(new Uint8Array(32));
  const xPub = x25519.getPublicKey(xPriv);

  const mlKemKeys = ml_kem768.keygen();

  const combinedPub = new Uint8Array(KEM_PUB_LEN);
  combinedPub.set(xPub, 0);
  combinedPub.set(mlKemKeys.publicKey, KEM_X25519_PUB_LEN);

  return {
    publicKeyBytes: combinedPub,
    x25519Priv: xPriv,
    mlkem768Priv: mlKemKeys.secretKey,
  };
}

export function generateDualSignKeyPair(): DualSignKeyPair {
  const edPriv = Crypto.getRandomValues(new Uint8Array(32));
  const edPub = ed25519.getPublicKey(edPriv);

  const mlDsaKeys = ml_dsa65.keygen();

  const combinedPub = new Uint8Array(SIGN_PUB_LEN);
  combinedPub.set(edPub, 0);
  combinedPub.set(mlDsaKeys.publicKey, SIGN_ED25519_PUB_LEN);

  return {
    publicKeyBytes: combinedPub,
    ed25519Priv: edPriv,
    mldsa65Priv: mlDsaKeys.secretKey,
  };
}

// --- Dual Signing & Verification ---
export function dualSign(
  message: Uint8Array,
  ed25519Priv: Uint8Array,
  mldsa65Priv: Uint8Array,
): Uint8Array {
  const edSig = ed25519.sign(message, ed25519Priv);
  const mlSig = ml_dsa65.sign(message, mldsa65Priv);

  const dualSig = new Uint8Array(DUAL_SIG_LEN);
  dualSig.set(edSig, 0);
  dualSig.set(mlSig, SIGN_ED25519_SIG_LEN);
  return dualSig;
}

export function dualVerify(
  message: Uint8Array,
  dualSig: Uint8Array,
  combinedSignPub: Uint8Array,
): boolean {
  if (
    dualSig.length !== DUAL_SIG_LEN ||
    combinedSignPub.length !== SIGN_PUB_LEN
  ) {
    return false;
  }
  const edPub = combinedSignPub.slice(0, SIGN_ED25519_PUB_LEN);
  const mlPub = combinedSignPub.slice(SIGN_ED25519_PUB_LEN);

  const edSig = dualSig.slice(0, SIGN_ED25519_SIG_LEN);
  const mlSig = dualSig.slice(SIGN_ED25519_SIG_LEN);

  const okEd = ed25519.verify(edSig, message, edPub);
  if (!okEd) return false;
  return ml_dsa65.verify(mlSig, message, mlPub);
}

// Bundle Self-Signature
export function signPublicBundle(
  userId: string,
  kemPubHex: string,
  signPubHex: string,
  ed25519Priv: Uint8Array,
  mldsa65Priv: Uint8Array,
): string {
  const payload = new TextEncoder().encode(
    `quill-v1-bundle:${userId}:${kemPubHex}:${signPubHex}`,
  );
  const hash = sha256(payload);
  const sig = dualSign(hash, ed25519Priv, mldsa65Priv);
  return bytesToHex(sig);
}

export function verifyPublicBundle(
  userId: string,
  kemPubHex: string,
  signPubHex: string,
  bundleSigHex: string,
): boolean {
  try {
    const payload = new TextEncoder().encode(
      `quill-v1-bundle:${userId}:${kemPubHex}:${signPubHex}`,
    );
    const hash = sha256(payload);
    return dualVerify(hash, hexToBytes(bundleSigHex), hexToBytes(signPubHex));
  } catch {
    return false;
  }
}

// Safety Number computation from public bundles
export function computeSafetyNumber(
  userAId: string,
  userABundleHex: string,
  userBId: string,
  userBBundleHex: string,
): string {
  const combined =
    userAId < userBId
      ? `${userAId}:${userABundleHex}:${userBId}:${userBBundleHex}`
      : `${userBId}:${userBBundleHex}:${userAId}:${userABundleHex}`;
  const hash = sha256(
    new TextEncoder().encode(`quill-v1-safety-number:${combined}`),
  );
  const hex = bytesToHex(hash).toUpperCase();
  const chunks = hex.slice(0, 32).match(/.{1,4}/g) || [];
  return chunks.join(" ");
}

// --- Hybrid KEM Wrapping (X-Wing style) ---
export function wrapDiaryKey(
  diaryKey: Uint8Array,
  recipientKemPubBytes: Uint8Array,
): string {
  const x25519Pub = recipientKemPubBytes.slice(0, KEM_X25519_PUB_LEN);
  const mlkemPub = recipientKemPubBytes.slice(KEM_X25519_PUB_LEN);

  // Ephemeral X25519
  const ephXPriv = Crypto.getRandomValues(new Uint8Array(32));
  const ephXPub = x25519.getPublicKey(ephXPriv);
  const xShared = x25519.getSharedSecret(ephXPriv, x25519Pub);

  // ML-KEM encaps
  const { cipherText: mlkemCt, sharedSecret: mlShared } =
    ml_kem768.encapsulate(mlkemPub);

  // Combine shared secrets with HKDF
  const combinedShared = new Uint8Array(mlShared.length + xShared.length);
  combinedShared.set(mlShared, 0);
  combinedShared.set(xShared, mlShared.length);

  const sharedKey = hkdf(
    sha256,
    combinedShared,
    undefined,
    new TextEncoder().encode("quill-v1-hybrid-kem"),
    32,
  );

  // Encrypt the diary key with XChaCha20-Poly1305
  const nonce = Crypto.getRandomValues(new Uint8Array(24));
  const chacha = xchacha20poly1305(sharedKey, nonce);
  const encDiaryKey = chacha.encrypt(diaryKey);

  // Wire format: ephXPub (32) || mlkemCt (1088) || nonce (24) || encDiaryKey (32 + 16 auth tag = 48)
  const wrapped = new Uint8Array(
    ephXPub.length + mlkemCt.length + nonce.length + encDiaryKey.length,
  );
  wrapped.set(ephXPub, 0);
  wrapped.set(mlkemCt, ephXPub.length);
  wrapped.set(nonce, ephXPub.length + mlkemCt.length);
  wrapped.set(encDiaryKey, ephXPub.length + mlkemCt.length + nonce.length);

  return bytesToHex(wrapped);
}

export function unwrapDiaryKey(
  wrappedKeyHex: string,
  myKemPrivKeys: { x25519Priv: Uint8Array; mlkem768Priv: Uint8Array },
): Uint8Array {
  const wrapped = hexToBytes(wrappedKeyHex);
  const ephXPub = wrapped.slice(0, 32);
  const mlkemCt = wrapped.slice(32, 32 + 1088);
  const nonce = wrapped.slice(32 + 1088, 32 + 1088 + 24);
  const encDiaryKey = wrapped.slice(32 + 1088 + 24);

  const xShared = x25519.getSharedSecret(myKemPrivKeys.x25519Priv, ephXPub);
  const mlShared = ml_kem768.decapsulate(mlkemCt, myKemPrivKeys.mlkem768Priv);

  const combinedShared = new Uint8Array(mlShared.length + xShared.length);
  combinedShared.set(mlShared, 0);
  combinedShared.set(xShared, mlShared.length);

  const sharedKey = hkdf(
    sha256,
    combinedShared,
    undefined,
    new TextEncoder().encode("quill-v1-hybrid-kem"),
    32,
  );

  const chacha = xchacha20poly1305(sharedKey, nonce);
  return chacha.decrypt(encDiaryKey);
}

// Sign wrapped key for invitations / membership
export function signWrappedKey(
  wrappedKeyHex: string,
  diaryId: string,
  inviteeId: string,
  inviterId: string,
  ed25519Priv: Uint8Array,
  mldsa65Priv: Uint8Array,
): string {
  const msg = new TextEncoder().encode(
    `quill-v1-wrapped:${wrappedKeyHex}:${diaryId}:${inviteeId}:${inviterId}`,
  );
  const hash = sha256(msg);
  return bytesToHex(dualSign(hash, ed25519Priv, mldsa65Priv));
}

export function verifyWrappedKeySig(
  wrappedKeyHex: string,
  diaryId: string,
  inviteeId: string,
  inviterId: string,
  wrappedSigHex: string,
  inviterSignPubHex: string,
): boolean {
  try {
    const msg = new TextEncoder().encode(
      `quill-v1-wrapped:${wrappedKeyHex}:${diaryId}:${inviteeId}:${inviterId}`,
    );
    const hash = sha256(msg);
    return dualVerify(
      hash,
      hexToBytes(wrappedSigHex),
      hexToBytes(inviterSignPubHex),
    );
  } catch {
    return false;
  }
}

// --- Symmetric Padded AAD Blob Encryption (XChaCha20-Poly1305) ---
export function encryptBlob(
  data: Record<string, any>,
  key32Bytes: Uint8Array,
  aadFields?: { diaryId: string; entryId?: string; keyEpoch: number },
): string {
  const jsonStr = JSON.stringify(data);
  const rawBytes = new TextEncoder().encode(jsonStr);
  const padded = padBytes(rawBytes, 64);

  const nonce = Crypto.getRandomValues(new Uint8Array(24));
  let aad: Uint8Array | undefined = undefined;
  if (aadFields) {
    aad = new TextEncoder().encode(
      `quill-aad:${aadFields.diaryId}:${aadFields.entryId ?? ""}:${aadFields.keyEpoch}`,
    );
  }

  const chacha = xchacha20poly1305(key32Bytes, nonce, aad);
  const ciphertext = chacha.encrypt(padded);

  const blobBytes = new Uint8Array(nonce.length + ciphertext.length);
  blobBytes.set(nonce, 0);
  blobBytes.set(ciphertext, nonce.length);

  return bytesToHex(blobBytes);
}

export function decryptBlob<T = any>(
  blobHex: string,
  key32Bytes: Uint8Array,
  aadFields?: { diaryId: string; entryId?: string; keyEpoch: number },
): T {
  const blobBytes = hexToBytes(blobHex);
  const nonce = blobBytes.slice(0, 24);
  const ciphertext = blobBytes.slice(24);

  let aad: Uint8Array | undefined = undefined;
  if (aadFields) {
    aad = new TextEncoder().encode(
      `quill-aad:${aadFields.diaryId}:${aadFields.entryId ?? ""}:${aadFields.keyEpoch}`,
    );
  }

  const chacha = xchacha20poly1305(key32Bytes, nonce, aad);
  const decryptedPadded = chacha.decrypt(ciphertext);
  const unpadded = unpadBytes(decryptedPadded);
  const jsonStr = new TextDecoder().decode(unpadded);
  return JSON.parse(jsonStr) as T;
}

// --- Encrypted Key Bundles Storage ---
export function encryptKeyBundle(
  bundle: UserSecretKeyBundle,
  encKey: Uint8Array,
): string {
  return encryptBlob(bundle, encKey);
}

export function decryptKeyBundle(
  bundleHex: string,
  encKey: Uint8Array,
): UserSecretKeyBundle {
  return decryptBlob<UserSecretKeyBundle>(bundleHex, encKey);
}

// --- Profile Encryption ---
export interface DecryptedProfile {
  name: string;
  photoPath: string | null;
  photoNonce?: string | null;
}

export function encryptUserProfile(
  profileData: DecryptedProfile,
  derivedKey: Uint8Array,
): { encryptedProfileHex: string; profileNonceHex: string } {
  const nonce = Crypto.getRandomValues(new Uint8Array(24));
  const rawBytes = padBytes(
    new TextEncoder().encode(JSON.stringify(profileData)),
    64,
  );
  const chacha = xchacha20poly1305(derivedKey, nonce);
  const ciphertext = chacha.encrypt(rawBytes);

  return {
    encryptedProfileHex: bytesToHex(ciphertext),
    profileNonceHex: bytesToHex(nonce),
  };
}

export function decryptUserProfile(
  encryptedProfileHex: string,
  profileNonceHex: string,
  derivedKey: Uint8Array,
): DecryptedProfile {
  const nonce = hexToBytes(profileNonceHex);
  const ciphertext = hexToBytes(encryptedProfileHex);
  const chacha = xchacha20poly1305(derivedKey, nonce);
  const decrypted = unpadBytes(chacha.decrypt(ciphertext));
  return JSON.parse(new TextDecoder().decode(decrypted));
}
export function encryptData(
  plainBytes: Uint8Array,
  key32Bytes: Uint8Array,
): { cipherHex: string; nonceHex: string } {
  const nonce = Crypto.getRandomValues(new Uint8Array(24));
  const chacha = xchacha20poly1305(key32Bytes, nonce);
  const encryptedBytes = chacha.encrypt(plainBytes);

  return {
    cipherHex: bytesToHex(encryptedBytes),
    nonceHex: bytesToHex(nonce),
  };
}

export function decryptData(
  cipherHex: string,
  nonceHex: string,
  key32Bytes: Uint8Array,
): Uint8Array {
  const nonce = hexToBytes(nonceHex);
  const encryptedBytes = hexToBytes(cipherHex);
  const chacha = xchacha20poly1305(key32Bytes, nonce);
  return chacha.decrypt(encryptedBytes);
}
