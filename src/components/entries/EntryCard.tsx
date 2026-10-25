import usePressAnimation from "@/src/hooks/usePressAnimation";
import useTheme from "@/src/hooks/useTheme";
import type { EntryWithAuthor } from "@/src/types/entry";
import {
  formatCreatedMeta,
  formatEntryDate,
  fromDateKey,
} from "@/src/utils/dates";
import { Ionicons } from "@expo/vector-icons";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import AttachmentSummary from "./AttachmentSummary";
import AuthorPill from "./AuthorPill";
import { isMoodKey } from "@/src/constants/moods";
import MojiFace from "../MojiFace";

type EntryCardProps = {
  entry: EntryWithAuthor;
  onPress: () => void;
  onLongPress: (entry: EntryWithAuthor) => void;
  diaryAccent: string;
  isMe: boolean;
};

export default function EntryCard({
  entry,
  onPress,
  onLongPress,
  diaryAccent,
  isMe,
}: EntryCardProps) {
  const { colors } = useTheme();
  const styles = getStyles(colors, diaryAccent);
  const entryDate = fromDateKey(entry.entryDate);
  const mood = isMoodKey(entry.mood) ? entry.mood : null;

  const { animatePress, animatedColor } = usePressAnimation(
    colors.card,
    colors.cardPressed,
  );
  const cleanPreview =
    entry.body
      ?.replace(/<br\s*\/?>/gi, "\n")
      ?.replace(/<\/p>|<\/div>/gi, "\n")
      ?.replace(/<[^>]+>/g, "")
      ?.replace(/\n\s*\n/g, "\n\n")
      .trim() || "Empty entry.";

  return (
    <Pressable
      onPress={onPress}
      onLongPress={() => onLongPress(entry)}
      onPressIn={() => animatePress(true)}
      onPressOut={() => animatePress(false)}
    >
      <Animated.View style={[styles.card, { backgroundColor: animatedColor }]}>
                <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            {mood && <MojiFace mood={mood} size={22} />}
            <Text style={styles.cardTitle} numberOfLines={1}>
              {entry.title || "Untitled Entry"}
            </Text>
          </View>
          <Text style={styles.cardDate}>{formatEntryDate(entryDate)}</Text>
        </View>
        <Text style={styles.cardPreview} numberOfLines={3}>
          {cleanPreview}
        </Text>
        <View style={styles.hr}></View>
        <View style={styles.cardFooter}>
          <AttachmentSummary counts={entry.counts} />
          <View style={styles.cardFooterRight}>
            <Text style={styles.cardDate}>
              {formatCreatedMeta(entry.createdAt, entryDate)}
            </Text>
            <AuthorPill
              name={entry.authorName}
              isMe={isMe}
              diaryAccent={diaryAccent}
            />
            <Ionicons
              size={16}
              color={colors.textMuted}
              name="chevron-forward-outline"
            />
          </View>
        </View>
      </Animated.View>
    </Pressable>
  );
}

const getStyles = (
  colors: ReturnType<typeof useTheme>["colors"],
  diaryAccent: string,
) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.card,
      borderRadius: 14,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 2,
    },
        cardHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 8,
    },
    cardTitleRow: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginRight: 12,
    },
    cardTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.text,
      flexShrink: 1,
    },
    cardDate: {
      fontSize: 12,
      fontWeight: "500",
      color: colors.textMuted,
    },
    cardPreview: {
      fontSize: 14,
      lineHeight: 20,
      color: colors.textMuted,
    },
    cardFooter: { flexDirection: "row", justifyContent: "space-between" },
    cardFooterRight: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 5,
    },
    hr: {
      width: "100%",
      borderBottomColor: colors.border,
      borderBottomWidth: 1,
      marginVertical: 15,
    },
  });
