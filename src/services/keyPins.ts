import * as SecureStore from "expo-secure-store";
import { clearTrackedItems, setTrackedItem } from "./storage/trackedStore";

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
  await setTrackedItem(storeKey, combined);
  return false;
}

export const clearKeyPins = () => clearTrackedItems("quill_pin_");
