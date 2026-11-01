import * as SecureStore from "expo-secure-store";

const KEY_DERIVED_KEY = "e2ee_derived_encryption_key";

export async function saveDerivedKey(keyBytes: Uint8Array): Promise<void> {
  const hex = Array.from(keyBytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  await SecureStore.setItemAsync(KEY_DERIVED_KEY, hex, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}

export async function getStoredDerivedKey(): Promise<Uint8Array | null> {
  const hex = await SecureStore.getItemAsync(KEY_DERIVED_KEY);
  if (!hex) return null;
  const match = hex.match(/.{1,2}/g);
  if (!match) return null;
  return new Uint8Array(match.map((byte) => parseInt(byte, 16)));
}

const KEY_VAULT_KEY = "e2ee_vault_key";

export async function saveVaultKey(keyBytes: Uint8Array): Promise<void> {
  const hex = Array.from(keyBytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  await SecureStore.setItemAsync(KEY_VAULT_KEY, hex, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}

export async function getStoredVaultKey(): Promise<Uint8Array | null> {
  const hex = await SecureStore.getItemAsync(KEY_VAULT_KEY);
  if (!hex) return null;
  const match = hex.match(/.{1,2}/g);
  if (!match) return null;
  return new Uint8Array(match.map((byte) => parseInt(byte, 16)));
}

export async function clearDerivedKey(): Promise<void> {
  await SecureStore.deleteItemAsync(KEY_DERIVED_KEY);
  await SecureStore.deleteItemAsync(KEY_VAULT_KEY);
}
