import { radius } from "@/src/constants/radius";
import { fontSizes } from "@/src/constants/typography";
import { useUserSession } from "@/src/context/UserSessionContext";
import useTheme from "@/src/hooks/useTheme";
import { haptic } from "@/src/services/haptics";
import type { ViewProps } from "@/src/types/diary";
import type { EntryWithAuthor } from "@/src/types/entry";
import { isSameDay, toDateKey } from "@/src/utils/dates";
import { isMine } from "@/src/utils/entry";
import { useMemo, useRef, useState } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Calendar from "../calendar/Calendar";
import { dialog } from "../Dialog/DialogProvider";
import DateBadge from "./DateBadge";
import EmptyState from "./EmptyState";
import TimelineEntryCard from "./TimelineEntryCard";

export default function TimelineView({
  entries,
  onSelectEntry,
  onDeleteEntry,
  onNewEntry,
  diaryAccent,
}: ViewProps) {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const insets = useSafeAreaInsets();
  const [selectedDate, setSelectedDate] = useState<null | Date>(null);
  const { session } = useUserSession();
  const listRef = useRef<FlatList>(null);

  const indexByDay = useMemo(() => {
    const byDay = new Map();
    entries.forEach((entry, index) => {
      if (!byDay.has(entry.entryDate)) byDay.set(entry.entryDate, index);
    });
    return byDay;
  }, [entries]);

  const handleDayPress = (date: Date) => {
    haptic.press();
    setSelectedDate((prev) => {
      if (prev && isSameDay(prev, date)) return null;
      return date;
    });
    const index = indexByDay.get(toDateKey(date));
    if (index == undefined) return;

    listRef.current?.scrollToIndex({
      index,
      animated: true,
      viewPosition: 0,
    });
  };

  const handleDayLongPress = (date: Date) => {
    onNewEntry?.(date);
  };

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
  const renderCard = (entry: EntryWithAuthor) => {
    return (
      <View style={styles.container}>
        <View style={styles.row}>
          <View style={styles.line}></View>
          <DateBadge date={entry.entryDate} />
        </View>
        <View style={{ flex: 1 }}>
          <TimelineEntryCard
            entry={entry}
            onPress={() => onSelectEntry?.(entry)}
            onLongPress={handleLongPress}
            diaryAccent={diaryAccent}
            isMe={isMine(entry.authorId, session?.userId)}
          />
        </View>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, gap: 40 }}>
      <Calendar
        entries={entries}
        onDayPress={handleDayPress}
        onDayLongPress={handleDayLongPress}
        selectedDate={selectedDate}
      />
      <FlatList
        ref={listRef}
        data={entries}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => renderCard(item)}
        contentContainerStyle={[
          styles.listContent,
          // room for the FAB + home indicator
          { paddingBottom: 110 + insets.bottom },
        ]}
        onScrollToIndexFailed={({ index, averageItemLength }) =>
          listRef.current?.scrollToOffset({
            offset: index * averageItemLength,
            animated: true,
          })
        }
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
    container: {
      flexDirection: "row",
      justifyContent: "space-around",
      gap: 10,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      width: 56,
      position: "relative",
    },
    line: {
      position: "absolute",
      top: 0,
      bottom: 0,
      left: 25,
      backgroundColor: colors.border,
      width: 2,
    },
    dateBadge: {
      backgroundColor: colors.card,
      borderRadius: radius.md,
      width: 50,
      height: 50,
      justifyContent: "center",
      alignItems: "center",
    },
    text: {
      color: colors.text,
      fontSize: fontSizes.lg,
    },
  });
