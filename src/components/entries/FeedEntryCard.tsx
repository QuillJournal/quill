import { fonts } from "@/src/constants/typography";
import useTheme from "@/src/hooks/useTheme";
import { resolveAttachmentUri } from "@/src/services/attachments";
import { Attachment } from "@/src/types/attachment";
import type { EntryWithAuthor } from "@/src/types/entry";
import { formatCreatedMeta, fromDateKey } from "@/src/utils/dates";
import { StyleSheet, Text, View } from "react-native";
import FeedMedia from "./FeedMedia";

type EntryCardProps = {
  entry: EntryWithAuthor;
  onPress: () => void;
  onLongPress: (entry: EntryWithAuthor) => void;
  diaryAccent: string;
  isMe: boolean;
  media: Attachment[];
};

export default function FeedEntryCard({
  entry,
  onPress,
  diaryAccent,
  media,
  isMe,
}: EntryCardProps) {
  const { colors } = useTheme();
  const styles = getStyles(colors, diaryAccent);
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
  const mediaItems = media.map((m) => ({
    uri: resolveAttachmentUri(m.relPath),
    kind: m.kind,
  }));
  return (
    <View style={styles.card}>
      <View style={{ padding: 16 }}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardDate}>{cardHeader}</Text>
        </View>
        <Text style={styles.cardTitle}>{entry.title}</Text>
        <Text style={styles.cardPreview}>{cleanPreview}</Text>
      </View>
      {media.length > 0 && <FeedMedia items={mediaItems} />}
    </View>
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
    authorPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 9,
      paddingVertical: 3,
      borderRadius: 999,
      borderWidth: 1,
    },
    authorPillMe: {
      backgroundColor: colors.surface,
      borderColor: diaryAccent,
    },
    authorPillOther: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
    },
    authorDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    authorText: {
      fontSize: 11,
      fontFamily: fonts.label,
      fontWeight: "700",
    },
  });
