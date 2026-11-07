import { UserSessionData } from "../context/UserSessionContext";
import { signOut } from "../utils/auth";
import { supabase } from "../utils/supabase";
import { resetAppLock } from "./appLock";
import { clearKeyPins } from "./keyPins";
import { wipeLocalData } from "./localWipe";
import { clearDerivedKey } from "./storage/secureKeyStore";
import { runSync, waitForSyncIdle } from "./syncEngine";

export async function endLocalSession(
  clearSession: () => void,
  opts: { accountDeleted?: boolean; session?: UserSessionData | null } = {},
): Promise<void> {
  const s = opts.session;
  if (!opts.accountDeleted && s?.kemKeys && s?.signKeys) {
    await waitForSyncIdle();
    await runSync({
      userId: s.userId,
      kemKeys: s.kemKeys,
      signKeys: s.signKeys,
    }).catch(() => {});
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
