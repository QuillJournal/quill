import { fontSizes } from "@/src/constants/typography";
import { useUserSession } from "@/src/context/UserSessionContext";
import useTheme from "@/src/hooks/useTheme";
import { haptic } from "@/src/services/haptics";
import { ViewProps } from "@/src/types/diary";
import type { EntryWithAuthor } from "@/src/types/entry";
import { toDateKey } from "@/src/utils/dates";
import { isMine } from "@/src/utils/entry";
import { useMemo } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { dialog } from "../Dialog/DialogProvider";
import EmptyState from "./EmptyState";
import EntryCard from "./EntryCard";
import SearchBar from "./SearchBar";

export default function ListView({
  entries,
  media,
  selectedDate,
  onSelectEntry,
  onDeleteEntry,
  diaryAccent,
}: ViewProps) {
  const { colors } = useTheme();
  const { session } = useUserSession();
  const insets = useSafeAreaInsets();
  const styles = getStyles(colors);
  const selectedKey = selectedDate ? toDateKey(selectedDate) : null;

  const selectedDateEntries = useMemo(() => {
    return selectedDate
      ? entries.filter((e) => e.entryDate === selectedKey)
      : [];
  }, [selectedDate, selectedKey, entries]);

  const otherEntries = useMemo(() => {
    return selectedDate
      ? entries.filter((e) => e.entryDate !== selectedKey)
      : entries;
  }, [selectedDate, selectedKey, entries]);

  const handleLongPress = (entry: EntryWithAuthor) => {
    if (!onDeleteEntry) return;
    if (!isMine(entry.authorId, session?.userId)) {
      dialog.alert(
        "Read Only",
        "You can only delete entries that you created.",
      );
      return;
    }
    haptic.press();
    dialog.alert(
      "Delete Entry",
      `Are you sure you want to delete "${entry.title}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            haptic.warning();
            onDeleteEntry(entry.id);
          },
        },
      ],
    );
  };

  const renderCard = (entry: EntryWithAuthor) => (
    <EntryCard
      entry={entry}
      media={media?.get(entry.id) ?? []}
      onPress={() => onSelectEntry?.(entry)}
      onLongPress={handleLongPress}
      diaryAccent={diaryAccent}
      isMe={isMine(entry.authorId, session?.userId)}
    />
  );

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.searchWrap}>
        <SearchBar placeholder="Search in diary" />
      </View>
      <FlatList
        data={otherEntries}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => renderCard(item)}
        contentContainerStyle={[
          styles.listContent,
          // room for the FAB + home indicator
          { paddingBottom: 110 + insets.bottom },
        ]}
        ListEmptyComponent={EmptyState}
      />
    </View>
  );
}

const getStyles = (colors: ReturnType<typeof useTheme>["colors"]) =>
  StyleSheet.create({
    listContent: {
      paddingHorizontal: 16,
      paddingBottom: 50,
    },
    searchWrap: { paddingHorizontal: 16, paddingBottom: 10 },
    header: { marginBottom: 10 },
    selectedDayRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 10,
      marginBottom: 10,
    },
    selectedDayTitle: { flexDirection: "row", alignItems: "center", gap: 10 },
    selectedDayDate: {
      color: colors.textMuted,
      fontWeight: "500",
      fontSize: fontSizes.xs,
    },
    entryCount: {
      color: colors.textMuted,
      fontWeight: "500",
      fontSize: fontSizes.xs,
    },
  });
