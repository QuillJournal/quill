import usePressAnimation from "@/src/hooks/usePressAnimation";
import useTheme from "@/src/hooks/useTheme";
import { resolveAttachmentUri } from "@/src/services/attachments";
import { Attachment } from "@/src/types/attachment";
import type { EntryWithAuthor } from "@/src/types/entry";
import { formatCreatedMeta, fromDateKey } from "@/src/utils/dates";
import { Ionicons } from "@expo/vector-icons";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import type { Rect } from "../MediaViewer";
import AuthorPill from "./AuthorPill";
import type { FeedMediaItem } from "./FeedMedia";
import FeedMedia from "./FeedMedia";
import InlineReadMore from "./InlineReadMore";

type EntryCardProps = {
  entry: EntryWithAuthor;
  onPress: () => void;
  onLongPress: (entry: EntryWithAuthor) => void;
  diaryAccent: string;
  isMe: boolean;
  media: Attachment[];
  onMediaOpen: (item: FeedMediaItem, origin: Rect) => void;
};

export default function FeedEntryCard({
  entry,
  onPress,
  diaryAccent,
  media,
  onMediaOpen,
}: EntryCardProps) {
  const { colors } = useTheme();
  const styles = getStyles(colors, diaryAccent);
  const { animatePress, animatedColor } = usePressAnimation(
    colors.card,
    colors.cardPressed,
    200,
  );
  const cleanPreview =
    entry.body
      ?.replace(/<br\s*\/?>/gi, "\n")
      ?.replace(/<\/p>|<\/div>/gi, "\n")
      ?.replace(/<[^>]+>/g, "")
      ?.replace(/\n\s*\n/g, "\n\n")
      .trim() || "Empty entry.";
  const entryDate = fromDateKey(entry.entryDate);
  const formatter = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const cardHeader = `${formatter.format(entryDate)} • ${formatCreatedMeta(entry.createdAt, entryDate)}`;
  const mediaItems = media
    .filter((m) => m.kind !== "audio")
    .map((m) => ({
      uri: resolveAttachmentUri(m.relPath),
      kind: m.kind as "image" | "video",
    }));
  const countWords = (str: string) => {
    return str
      .trim()
      .split(/\s+/)
      .filter((word: string) => word.length > 0).length;
  };
  const isMe = true;

  return (
    <Pressable
      onPressIn={() => animatePress(true)}
      onPressOut={() => animatePress(false)}
      onPress={onPress}
    >
      <Animated.View style={[styles.card, { backgroundColor: animatedColor }]}>
        <View style={{ padding: 16 }}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardDate}>{cardHeader}</Text>
            <AuthorPill
              name={entry.authorName}
              isMe={isMe}
              diaryAccent={diaryAccent}
            />
          </View>
          <Text style={styles.cardTitle}>
            {entry.title || "Untitled Entry"}
          </Text>
          <InlineReadMore text={cleanPreview} />
        </View>
        {media.length > 0 && (
          <FeedMedia items={mediaItems} onOpen={onMediaOpen} onExtraPress={onPress} />
        )}
        <View style={styles.cardFooter}>
          <Text
            style={styles.cardDate}
          >{`${countWords(cleanPreview)} words`}</Text>
          <Ionicons
            size={16}
            color={colors.textMuted}
            name="chevron-forward-outline"
          />
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
      marginBottom: 12,
      paddingBottom: 16,
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
      alignItems: "baseline",
      marginBottom: 8,
    },
    cardTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: colors.text,
      marginRight: 12,
      marginBottom: 10,
    },
    cardDate: {
      fontSize: 12,
      fontWeight: "500",
      color: colors.textMuted,
    },
    cardPreview: {
      fontSize: 14,
      lineHeight: 20,
      color: colors.text,
    },
    cardFooter: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "flex-end",
      marginHorizontal: 10,
      marginTop: 10,
    },
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
