import * as SecureStore from "expo-secure-store";

export async function checkAndPinBundle(
  userId: string,
  kemPub: string,
  signPub: string,
): Promise<boolean> {
  const storeKey = `quill_pin_${userId}`;
  const combined = `${kemPub}:${signPub}`;
  const existing = await SecureStore.getItemAsync(storeKey);
  if (existing && existing !== combined) {
    return true;
  }
  await SecureStore.setItemAsync(storeKey, combined);
  return false;
}
