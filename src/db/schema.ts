import { sql } from "drizzle-orm";
import { check, index, int, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const diariesTable = sqliteTable("diaries", {
  id: int().primaryKey({ autoIncrement: true }).notNull(),
  remoteId: text("remote_id").unique(),
  ownerId: text("owner_id"),
  name: text().notNull(),
  description: text(),
  color: text().notNull().default("cobalt"),
  keyEpoch: int("key_epoch").notNull().default(1),
  lastSyncedSeq: int("last_synced_seq").notNull().default(0),
  syncState: text("sync_state").notNull().default("synced"),
  lastOpenedAt: int("last_opened_at", { mode: "timestamp_ms" }),
  createdAt: int("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const diaryKeysTable = sqliteTable(
  "diary_keys",
  {
    diaryRemoteId: text("diary_remote_id").notNull(),
    keyEpoch: int("key_epoch").notNull().default(1),
    diaryKeyHex: text("diary_key_hex").notNull(),
  },
  (t) => [index("idx_diary_keys_remote").on(t.diaryRemoteId, t.keyEpoch)],
);

export const diaryMembersTable = sqliteTable(
  "diary_members",
  {
    diaryRemoteId: text("diary_remote_id").notNull(),
    userId: text("user_id").notNull(),
    username: text("username"),
    role: text("role").notNull(),
    name: text("name"),
    photoUri: text("photo_uri"),
    joinedAt: text("joined_at"),
  },
  (t) => [index("idx_diary_members_remote").on(t.diaryRemoteId, t.userId)],
);

export const diaryInvitesTable = sqliteTable("diary_invites", {
  id: text("id").primaryKey().notNull(),
  diaryRemoteId: text("diary_remote_id").notNull(),
  inviterId: text("inviter_id").notNull(),
  inviterName: text("inviter_name"),
  diaryName: text("diary_name"),
  diaryColor: text("diary_color"),
  wrappedKey: text("wrapped_key").notNull(),
  wrappedSig: text("wrapped_sig").notNull(),
  previewBlob: text("preview_blob").notNull(),
  keyEpoch: int("key_epoch").notNull().default(1),
  createdAt: text("created_at").notNull(),
});

export const appStateTable = sqliteTable(
  "app_state",
  {
    id: int().primaryKey().notNull(),
    resumeDiaryId: int("resume_diary_id").references(() => diariesTable.id, {
      onDelete: "set null",
    }),
  },
  (t) => [check("app_state_singleton", sql`${t.id} = 1`)],
);

export const entriesTable = sqliteTable(
  "entries",
  {
    id: int().primaryKey({ autoIncrement: true }).notNull(),
    remoteId: text("remote_id").unique(),
    diaryId: int("diary_id")
      .references(() => diariesTable.id, { onDelete: "cascade" })
      .notNull(),
    authorId: text("author_id").notNull(),
    title: text().notNull(),
    body: text(),
    entryDate: text("entry_date").notNull(),
    version: int("version").notNull().default(1),
    keyEpoch: int("key_epoch").notNull().default(1),
    changeSeq: int("change_seq").notNull().default(0),
    deleted: int("deleted").notNull().default(0),
    syncState: text("sync_state").notNull().default("synced"),
    conflictServerData: text("conflict_server_data"),
    createdAt: int("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: int("updated_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (e) => [
    index("idx_entries_diary_date").on(e.diaryId, e.entryDate),
    index("idx_entries_sync_state").on(e.syncState),
    index("idx_entries_remote_id").on(e.remoteId),
  ],
);

export const localProfileTable = sqliteTable("local_profile", {
  userId: text("user_id").primaryKey().notNull(),
  name: text().notNull(),
  photoUri: text("photo_uri"),
  publicKey: text("public_key"),
  updatedAt: int("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const AttachmentsTable = sqliteTable(
  "attachments",
  {
    id: int().primaryKey({ autoIncrement: true }).notNull(),
    entryId: int("entry_id")
      .references(() => entriesTable.id, { onDelete: "cascade" })
      .notNull(),
    kind: text("kind", { enum: ["image", "video", "audio"] }).notNull(),
    relPath: text("rel_path").notNull(),
    mimeType: text("mimeType").notNull(),
    width: int(),
    height: int(),
    durationMs: int("duration_ms"),
    sizeBytes: int("size_bytes"),
    name: text(),
    remoteId: text("remote_id").unique(),
    syncState: text("sync_state", {
      enum: [
        "pending_upload",
        "synced",
        "pending_download",
        "local_only",
        "failed",
      ],
    })
      .notNull()
      .default("pending_upload"),
    createdAt: int("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [index("idx_attachments_entry").on(t.entryId)],
);
