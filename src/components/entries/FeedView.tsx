import { getPreviewAttachments } from "@/src/db/attachments";
import type { Attachment } from "@/src/types/attachment";
import { ViewProps } from "@/src/types/diary";
import type { EntryWithAuthor } from "@/src/types/entry";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { Rect, ViewerItem } from "../MediaViewer";
import MediaViewer from "../MediaViewer";
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
  const [viewing, setViewing] = useState<{
    key: string;
    item: ViewerItem;
    origin: Rect;
  } | null>(null);

  useEffect(() => {
    getPreviewAttachments(ids).then((map) => setMedia(map));
  });

  const handleOpenMedia = useCallback(
    (item: ViewerItem, origin: Rect) =>
      setViewing({
        key: `n${item.uri}`,
        origin,
        item,
      }),
    [],
  );

  const renderCard = (entry: EntryWithAuthor) => (
    <FeedEntryCard
      entry={entry}
      diaryAccent={diaryAccent}
      media={media?.get(entry.id) ?? []}
      onMediaOpen={handleOpenMedia}
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
      <MediaViewer
        item={viewing?.item ?? null}
        origin={viewing?.origin ?? null}
        onClose={() => setViewing(null)}
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
