import { getPreviewAttachments } from "@/src/db/attachments";
import type { Attachment } from "@/src/types/attachment";
import { ViewProps } from "@/src/types/diary";
import type { EntryWithAuthor } from "@/src/types/entry";
import { useEffect, useMemo, useState } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import FeedEntryCard from "./FeedEntryCard";
export default function FeedView({
  entries,
  selectedDate,
  onSelectEntry,
  onDeleteEntry,
  diaryAccent,
}: ViewProps) {
  const [media, setMedia] = useState<Map<number, Attachment[]>>();
  const ids = useMemo(() => entries.map((e) => e.id), [entries]);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    getPreviewAttachments(ids).then((map) => setMedia(map));
  });
  const renderCard = (entry: EntryWithAuthor) => (
    <FeedEntryCard
      entry={entry}
      diaryAccent={diaryAccent}
      media={media?.get(entry.id) ?? []}
    />
  );
  return (
    <View>
      <FlatList
        data={entries}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => renderCard(item)}
        contentContainerStyle={[
          styles.listContent,
          // room for the FAB + home indicator
          { paddingBottom: 200 + insets.bottom },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 50,
  },
});
