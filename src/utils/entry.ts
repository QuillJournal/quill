import type { EntrySection } from "../types/entry";
import { EntryWithAuthor } from "../types/entry";
import {
  fromDateKey,
  getWeekOfYear,
  getWeekRange,
  isCurrentYear,
} from "./dates";
import { countWords, pluralize, stripHtml } from "./string";

export const isMine = (authorId: string, userId: string | undefined) => {
  if (!userId) return false;
  return authorId === userId;
};

export const groupByWeek = (entries: EntryWithAuthor[]) => {
  const sections = new Map<string, EntrySection & { words: number }>();

  for (const entry of entries) {
    const date = fromDateKey(entry.entryDate);
    const key = getWeekOfYear(date);
    let s = sections.get(key);
    if (!s) {
      const { firstDay, lastDay } = getWeekRange(date);
      s = {
        key,
        title: `${isCurrentYear(date) ? key.split("-")[1].trim() : key} · ${firstDay} - ${lastDay}`,
        subtitle: "",
        data: [],
        words: 0,
      };
      sections.set(key, s);
    }
    s.data.push(entry);
    s.words += countWords(stripHtml(entry.body ?? ""));
  }

  return Array.from(sections.values()).map(({ words, ...s }) => ({
    ...s,
    subtitle: `${s.data.length} ${pluralize(entries.length, "entry", "entries")} · ${words} ${pluralize(words, "word", "words")}`,
  }));
};
