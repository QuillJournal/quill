import { fontSizes } from "@/src/constants/typography";
import { useUserSession } from "@/src/context/UserSessionContext";
import useTheme from "@/src/hooks/useTheme";
import { haptic } from "@/src/services/haptics";
import type { Entry, EntryWithAuthor } from "@/src/types/entry";
import { formatEntryDate, toDateKey } from "@/src/utils/dates";
import { useMemo } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { dialog } from "../Dialog/DialogProvider";
import Pill from "../Pill";
import EmptyState from "./EmptyState";
import EntryCard from "./EntryCard";

type ListViewProps = {
  entries: EntryWithAuthor[];
  selectedDate: Date | null;
  onSelectEntry?: (entry: Entry) => void;
  onDeleteEntry?: (id: number) => void;
  diaryAccent: string;
};
export default function ListView({
  entries,
  selectedDate,
  onSelectEntry,
  onDeleteEntry,
  diaryAccent,
}: ListViewProps) {
  const { colors } = useTheme();
  const { session } = useUserSession();
  const insets = useSafeAreaInsets();
  const styles = getStyles(colors);
  const selectedKey = selectedDate ? toDateKey(selectedDate) : null;

  const isMine = (entry: Entry) =>
    entry.authorId === session?.userId;

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
    if (!isMine(entry)) {
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
      onPress={() => onSelectEntry?.(entry)}
      onLongPress={handleLongPress}
      diaryAccent={diaryAccent}
      isMe={isMine(entry)}
    />
  );

  const header = selectedDate ? (
    <View style={styles.header}>
      <View style={styles.selectedDayRow}>
        <View style={styles.selectedDayTitle}>
          <Pill text="Selected Day" />
          <Text style={styles.selectedDayDate}>
            {formatEntryDate(selectedDate)}
          </Text>
        </View>
        <Text style={styles.entryCount}>
          {`${selectedDateEntries.length} ${selectedDateEntries.length === 1 ? "entry" : "entries"}`}
        </Text>
      </View>
      {selectedDateEntries.map((entry) => (
        <View key={entry.id}>{renderCard(entry)}</View>
      ))}
      {otherEntries.length > 0 && <Pill text="Other entries" />}
    </View>
  ) : null;

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={otherEntries}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => renderCard(item)}
        ListHeaderComponent={header}
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