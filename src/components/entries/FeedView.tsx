import { ViewProps } from "@/src/types/diary";
import { StyleSheet, View } from "react-native";
import FeedEntryCard from "./FeedEntryCard";

export default function FeedView({
  entries,
  selectedDate,
  onSelectEntry,
  onDeleteEntry,
  diaryAccent,
}: ViewProps) {
  return (
    <View style={styles.listContent}>
      <FeedEntryCard entry={entries[0]} diaryAccent={diaryAccent} />
    </View>
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 50,
  },
});
