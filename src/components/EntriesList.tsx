import { resolveDiaryColor } from "@/src/constants/colors";
import { fonts, fontSizes } from "@/src/constants/typography";
import useTheme from "@/src/hooks/useTheme";
import { haptic } from "@/src/services/haptics";
import { useSyncStatus } from "@/src/services/syncEngine";
import type { Entry, EntryWithAuthor } from "@/src/types/entry";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ViewType } from "../types/diary";
import { isSameDay } from "../utils/dates";
import Calendar from "./calendar/Calendar";
import EmptyState from "./entries/EmptyState";
import FeedView from "./entries/FeedView";
import ListView from "./entries/ListView";
import TimelineView from "./entries/TimelineView";
import SegmentedControl from "./SegmentedControl";

interface EntriesListProps {
  entries: EntryWithAuthor[];
  diaryName?: string;
  diaryColor?: string;
  onNewEntry: (date?: Date) => void;
  onSelectEntry?: (entry: Entry) => void;
  onClose?: () => void;
  onDeleteEntry?: (id: number) => void;
  onOpenMembers?: () => void;
  closing?: boolean;
}

export default function EntriesList({
  entries,
  diaryName = "Diary",
  diaryColor = "cobalt",
  onNewEntry,
  onSelectEntry,
  onClose,
  onDeleteEntry,
  onOpenMembers,
  closing,
}: EntriesListProps) {
  const { colors } = useTheme();
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedView, setSelectedView] = useState<ViewType>("list");
  const scheme = useColorScheme() === "dark" ? "dark" : "light";
  const diaryAccent = resolveDiaryColor(diaryColor, scheme);
  const isSyncing = useSyncStatus();
  const insets = useSafeAreaInsets();
  const styles = getStyles(colors, diaryAccent, insets.top);

  const VIEW_OPTIONS = [
    { label: "Feed", value: "feed" },
    { label: "Timeline", value: "timeline" },
    { label: "List", value: "list" },
  ] as const;
  const VIEW_COMPONENTS = {
    feed: FeedView,
    list: ListView,
    timeline: TimelineView,
  };

  const handleDayPress = (date: Date) => {
    haptic.press();
    setSelectedDate((prev) => {
      if (prev && isSameDay(prev, date)) return null;
      return date;
    });
  };

  const handleDayLongPress = (date: Date) => {
    onNewEntry(date);
  };

  const ViewProps = {
    entries,
    selectedDate,
    onDeleteEntry,
    onSelectEntry,
    diaryAccent,
  };
  const SelectedComponent = VIEW_COMPONENTS[selectedView];

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        {onClose && (
          <TouchableOpacity
            style={[styles.iconButton, closing && styles.hidden]}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close diary"
            hitSlop={12}
          >
            <Ionicons name="close" size={20} color={colors.text} />
          </TouchableOpacity>
        )}
        <View style={styles.titleContainer}>
          <View style={[styles.titleRow, closing && styles.hidden]}>
            <View style={styles.diaryDot} />
            <Text style={styles.diaryHeading} numberOfLines={1}>
              {diaryName}
            </Text>
          </View>
          <View style={styles.subtitleRow}>
            <Text style={styles.entryCountSubtitle}>
              {entries.length} {entries.length === 1 ? "entry" : "entries"}
            </Text>
            {isSyncing && (
              <View style={styles.syncInline}>
                <ActivityIndicator size="small" color={diaryAccent} />
                <Text style={styles.syncInlineText}>Syncing</Text>
              </View>
            )}
          </View>
        </View>
        {onOpenMembers && (
          <TouchableOpacity
            style={[styles.iconButton, styles.membersButton]}
            onPress={onOpenMembers}
            accessibilityRole="button"
            accessibilityLabel="Diary members"
            hitSlop={12}
          >
            <Ionicons name="people" size={18} color={diaryAccent} />
          </TouchableOpacity>
        )}
      </View>
      <SegmentedControl
        options={VIEW_OPTIONS}
        selectedValue={selectedView}
        onSelect={setSelectedView}
      />
      <View style={styles.calendarWrap}>
        <Calendar
          entries={entries}
          selectedDate={selectedDate}
          onDayPress={handleDayPress}
          onDayLongPress={handleDayLongPress}
        />
      </View>
      {entries.length > 0 ? (
        <SelectedComponent {...ViewProps} />
      ) : (
        <EmptyState accentColor={diaryAccent} />
      )}
    </View>
  );
}

const getStyles = (
  colors: ReturnType<typeof useTheme>["colors"],
  diaryAccent: string,
  topInset: number,
) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    topBar: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 20,
      paddingTop: topInset + 10,
      paddingBottom: 12,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      gap: 12,
    },
    iconButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
    },
    membersButton: {
      borderColor: diaryAccent,
    },
    titleContainer: {
      flex: 1,
    },
    titleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    diaryDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: diaryAccent,
    },
    diaryHeading: {
      fontFamily: fonts.heading,
      fontSize: fontSizes.lg,
      fontWeight: "700",
      color: colors.text,
      flexShrink: 1,
    },
    subtitleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginTop: 2,
    },
    entryCountSubtitle: {
      fontSize: fontSizes.xs,
      fontFamily: fonts.body,
      color: colors.textMuted,
    },
    syncInline: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    syncInlineText: {
      fontSize: 11,
      fontFamily: fonts.label,
      fontWeight: "700",
      color: diaryAccent,
    },
    calendarWrap: {
      marginVertical: 10,
    },
    hidden: {
      opacity: 0,
    },
  });
