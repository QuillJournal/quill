import { useMemo, useState } from "react";
import type { EntryWithAuthor } from "../types/entry";
import useDebounced from "./useDebouncedValue";

export default function useEntrySearch(entries: EntryWithAuthor[]) {
  const [query, setQuery] = useState("");
  const { debouncedValue, flush } = useDebounced(query, 200);
  console.log(query);
  console.log(debouncedValue);
  const lowerCaseDebounced = debouncedValue.toLowerCase();
  const results = useMemo(() => {
    return entries.filter((e) =>
      e.title.toLowerCase().includes(lowerCaseDebounced),
    );
  }, [entries, lowerCaseDebounced]);

  return { results, query, setQuery, flush };
}
