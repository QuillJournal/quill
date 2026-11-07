import { signOut } from "../utils/auth";
import { supabase } from "../utils/supabase";
import { resetAppLock } from "./appLock";
import { clearKeyPins } from "./keyPins";
import { wipeLocalData } from "./localWipe";
import { clearDerivedKey } from "./storage/secureKeyStore";
import { waitForSyncIdle } from "./syncEngine";

export async function endLocalSession(
  clearSession: () => void,
  opts: { accountDeleted?: boolean; flush?: () => Promise<void> } = {},
): Promise<void> {
  if (!opts.accountDeleted && opts.flush) {
    await waitForSyncIdle();
    await opts.flush().catch(() => {});
    await waitForSyncIdle();
  }
  clearSession();
  await clearDerivedKey().catch(() => {});
  resetAppLock();
  await signOut()
    .catch(() => supabase.auth.signOut({ scope: "local" }))
    .catch(() => {});

  await waitForSyncIdle();

  if (opts.accountDeleted) await clearKeyPins().catch(() => {});

  await wipeLocalData().catch((e) =>
    console.error("Local wipe incomplete, will retry on next launch: ", e),
  );
}
