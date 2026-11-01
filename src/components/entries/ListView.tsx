import { spacing } from "@/src/constants/spacings";
import { fontSizes } from "@/src/constants/typography";
import { useUserSession } from "@/src/context/UserSessionContext";
import useEntrySearch from "@/src/hooks/useEntrySearch";
import useTheme from "@/src/hooks/useTheme";
import { haptic } from "@/src/services/haptics";
import { ViewProps } from "@/src/types/diary";
import type { EntryWithAuthor } from "@/src/types/entry";
import {
  fromDateKey,
  getWeekOfYear,
  getWeekRange,
  toDateKey,
} from "@/src/utils/dates";
import { isMine } from "@/src/utils/entry";
import { pluralize } from "@/src/utils/pluralize";
import { countWords, stripHtml } from "@/src/utils/string";
import { useMemo } from "react";
import { SectionList, StyleSheet, Text, View } from "react-native";
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
  const { query, setQuery, results, flush } = useEntrySearch(entries);
  const data = Object.values(
    results.reduce((acc, item) => {
      const entryDate = fromDateKey(item.entryDate);
      const title = getWeekOfYear(entryDate);
      const { firstDay, lastDay } = getWeekRange(entryDate);
      const headerText = `Week ${title} · ${firstDay} - ${lastDay}`;
      if (!acc[title]) {
        acc[title] = {
          title: headerText.toUpperCase(),
          subtitle: "",
          data: [],
        };
      }
      acc[title].data.push(item);
      const wordCount = acc[title].data.reduce((sum, item) => {
        return sum + countWords(stripHtml(item.body));
      }, 0);
      acc[title].subtitle =
        `${acc[title].data.length} ${pluralize(entries.length, "entry", "entries")} · ${wordCount} ${pluralize(wordCount, "word", "words")}`;
      return acc;
    }, {}),
  );
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
        <SearchBar
          placeholder="Search in diary"
          value={query}
          onChangeText={setQuery}
          onSubmit={flush}
        />
      </View>
      <SectionList
        sections={data}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => renderCard(item)}
        renderSectionHeader={({ section }) => (
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              padding: spacing.sm,
            }}
          >
            <Text
              style={{
                fontWeight: "bold",
                fontSize: fontSizes.sm,
                color: colors.textMuted,
              }}
            >
              {section.title}
            </Text>
            <Text
              style={{
                color: colors.textMuted,
                fontSize: fontSizes.xs,
                fontWeight: "light",
              }}
            >
              {section.subtitle}
            </Text>
          </View>
        )}
        contentContainerStyle={[
          styles.listContent,
          // room for the FAB + home indicator
          { paddingBottom: 110 + insets.bottom },
        ]}
        ListEmptyComponent={<EmptyState accentColor={diaryAccent} />}
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
