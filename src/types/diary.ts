import type { DiaryColorKey } from "../constants/colors";
import { diariesTable as diaries } from "../db/schema";
import { Entry, EntryWithAuthor } from "./entry";

export type DiaryRow = typeof diaries.$inferSelect;
export type Diary = DiaryRow & { entryCount: number };
export type DiaryFormData = { name: string; color: DiaryColorKey };
export type ViewProps = {
  entries: EntryWithAuthor[];
  selectedDate: Date | null;
  onSelectEntry?: (entry: Entry) => void;
  onDeleteEntry?: (id: number) => void;
  diaryAccent: string;
};

export type ViewType = "feed" | "list" | "timeline";
