import { entriesTable as entries } from "../db/schema";
import type { AttachmentCounts } from "./attachment";

export type Entry = typeof entries.$inferSelect;
export type EntryWithCounts = Entry & { counts: AttachmentCounts };
export type EntryWithAuthor = EntryWithCounts & { authorName: string };
export type NewEntry = typeof entries.$inferInsert;
export type EntrySection = {
  key: string;
  title: string;
  subtitle: string;
  data: EntryWithAuthor[];
};