import * as FileSystem from "expo-file-system/legacy";
import * as SecureStore from "expo-secure-store";
import { clearLocalDatabase } from "../db";
import { clearLocalAvatarCache } from "../utils/photoCrypto";
import { removeAllMedia } from "./attachments";
const PENDING_KEY = "quill.wipe.pending";
const OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
};

async function runWipe(): Promise<void> {
  const cache = FileSystem.cacheDirectory;
  const results = await Promise.allSettled([
    clearLocalDatabase(),
    removeAllMedia(),
    clearLocalAvatarCache(),
    cache
      ? FileSystem.deleteAsync(`${cache}DocumentPicker`, { idempotent: true })
      : Promise.resolve(),
  ]);
  const failed = results.filter(
    (r): r is PromiseRejectedResult => r.status === "rejected",
  );
  if (failed.length > 0) {
    throw new Error(
      `Local wipe incomplete (${failed.length} step(s)): ${failed.map((f) => String(f.reason)).join("; ")}`,
    );
  }
  await SecureStore.deleteItemAsync(PENDING_KEY);
}

export async function wipeLocalData(): Promise<void> {
  await SecureStore.setItemAsync(PENDING_KEY, "1", OPTIONS);
  await runWipe();
}

export async function finishPendingWipe(): Promise<void> {
  if (await SecureStore.getItemAsync(PENDING_KEY)) await runWipe();
}
