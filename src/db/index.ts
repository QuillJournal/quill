import { drizzle } from "drizzle-orm/expo-sqlite";
import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";
import * as SQLite from "expo-sqlite";
import * as schema from "./schema";

const DB_NAME = "quill.sqlite";
const DB_KEY_ID = "quill.db.key";

const DB_KEY_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
};

const toHex = (bytes: Uint8Array) =>
  Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");

export const sqlite = SQLite.openDatabaseSync(DB_NAME);

export type DbStatus = "ready" | "locked";

function unlockDatabase(): DbStatus {
  if (!sqlite.getFirstSync("PRAGMA cipher_version;")) {
    throw new Error(
      "SQLCipher is not available in this build. Enable `useSQLCipher` for expo-sqlite in app.json bro sir + rebuild dev client.",
    );
  }

  let storedKey: string | null;
  try {
    storedKey = SecureStore.getItem(DB_KEY_ID);
  } catch {
    return "locked";
  }

  const key = storedKey ?? toHex(Crypto.getRandomBytes(32));

  try {
    sqlite.execSync(`PRAGMA key = "x'${key}'";`);
    sqlite.getFirstSync("SELECT count(*) FROM sqlite_master;");
  } catch {
    return "locked";
  }

  if (storedKey === null) {
    try {
      SecureStore.setItem(DB_KEY_ID, key, DB_KEY_OPTIONS);
    } catch {
      return "locked";
    }
  }
  return "ready";
}

function ensureSchema(): void {
  sqlite.execSync(`
    PRAGMA foreign_keys = ON;
    
    CREATE TABLE IF NOT EXISTS diaries (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    remote_id TEXT UNIQUE,
    owner_id TEXT,
    name TEXT NOT NULL,
    description TEXT,
    color TEXT NOT NULL DEFAULT 'cobalt',
    key_epoch INTEGER NOT NULL DEFAULT 1,
    last_synced_seq INTEGER NOT NULL DEFAULT 0,
    sync_state TEXT NOT NULL DEFAULT 'synced',
    last_opened_at INTEGER,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
    
    CREATE TABLE IF NOT EXISTS diary_keys (
    diary_remote_id TEXT NOT NULL,
    key_epoch INTEGER NOT NULL DEFAULT 1,
    diary_key_hex TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_diary_keys_remote ON diary_keys (diary_remote_id, key_epoch);

    CREATE TABLE IF NOT EXISTS diary_members (
    diary_remote_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    username TEXT,
    role TEXT NOT NULL,
    name TEXT,
    photo_uri TEXT,
    joined_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_diary_members_remote ON diary_members (diary_remote_id, user_id);

    CREATE TABLE IF NOT EXISTS diary_invites (
    id TEXT PRIMARY KEY NOT NULL,
    diary_remote_id TEXT NOT NULL,
    inviter_id TEXT NOT NULL,
    inviter_name TEXT,
    diary_name TEXT,
    diary_color TEXT,
    wrapped_key TEXT NOT NULL,
    wrapped_sig TEXT NOT NULL,
    preview_blob TEXT NOT NULL,
    key_epoch INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS app_state (
    id INTEGER PRIMARY KEY NOT NULL,
    resume_diary_id INTEGER REFERENCES diaries(id) ON DELETE SET NULL,
    CONSTRAINT app_state_singleton CHECK(id = 1)
    );

    CREATE TABLE IF NOT EXISTS entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    remote_id TEXT UNIQUE,
    diary_id INTEGER NOT NULL REFERENCES diaries(id) ON DELETE CASCADE,
    author_id TEXT,
    title TEXT NOT NULL,
    body TEXT,
    entry_date TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    key_epoch INTEGER NOT NULL DEFAULT 1,
    change_seq INTEGER NOT NULL DEFAULT 0,
    deleted INTEGER NOT NULL DEFAULT 0,
    sync_state TEXT NOT NULL DEFAULT 'synced',
    conflict_server_data TEXT,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
  );
  CREATE INDEX IF NOT EXISTS idx_entries_diary_date ON entries (diary_id, entry_date);
  CREATE INDEX IF NOT EXISTS idx_entries_sync_state ON entries (sync_state);
  CREATE INDEX IF NOT EXISTS idx_entries_remote_id ON entries (remote_id);

  CREATE TABLE IF NOT EXISTS local_profile (
  user_id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  photo_uri TEXT,
  public_key TEXT,
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS attachments (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  entry_id INTEGER NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  rel_path TEXT NOT NULL,
  mimeType TEXT NOT NULL,
  width INTEGER,
  height INTEGER,
  duration_ms INTEGER,
  size_bytes INTEGER,
  name TEXT,
  remote_id TEXT,
  sync_state TEXT NOT NULL DEFAULT 'pending_upload',
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
  );
  CREATE INDEX IF NOT EXISTS idx_attachments_entry ON attachments (entry_id);
    `);
  migrateAttachmentSync();
}

function migrateAttachmentSync(): void {
  const cols = sqlite.getAllSync<{ name: string }>(
    "PRAGMA table_info(attachments);",
  );
  if (!cols.some((c) => c.name === "remote_id")) {
    sqlite.withTransactionSync(() => {
      sqlite.execSync(`
  ALTER TABLE attachments ADD COLUMN remote_id TEXT;
  ALTER TABLE attachments ADD COLUMN sync_state TEXT NOT NULL DEFAULT 'pending_upload';
  UPDATE entries SET sync_state = 'pending_update'
    WHERE sync_state = 'synced'
    AND id IN (SELECT DISTINCT entry_id FROM attachments);
`);
    });
  }
  sqlite.execSync(
    "CREATE UNIQUE INDEX IF NOT EXISTS idx_attachments_remote ON attachments (remote_id);",
  );
}

export const dbStatus: DbStatus = (() => {
  const status = unlockDatabase();
  if (status === "ready") {
    ensureSchema();
  }
  return status;
})();
export const db = drizzle(sqlite, { schema });

export const resetLockedDatabase = async () => {
  sqlite.closeSync();
  await SQLite.deleteDatabaseAsync(DB_NAME);
  await SecureStore.deleteItemAsync(DB_KEY_ID);
};

export const clearLocalDatabase = async () => {
  await db.transaction(async (tx) => {
    await tx.delete(schema.entriesTable);
    await tx.delete(schema.diaryMembersTable);
    await tx.delete(schema.diaryInvitesTable);
    await tx.delete(schema.diaryKeysTable);
    await tx.delete(schema.diariesTable);
    await tx.delete(schema.appStateTable);
    await tx.delete(schema.localProfileTable);
  });
  sqlite.execSync("VACUUM;");
};
