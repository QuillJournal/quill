import { isMoodKey } from "@/src/constants/moods";
import { fonts } from "@/src/constants/typography";
import usePressAnimation from "@/src/hooks/usePressAnimation";
import useTheme from "@/src/hooks/useTheme";
import { resolveAttachmentUri } from "@/src/services/attachments";
import { Attachment } from "@/src/types/attachment";
import type { EntryWithAuthor } from "@/src/types/entry";
import { formatCreatedMeta, fromDateKey } from "@/src/utils/dates";
import { splitMedia } from "@/src/utils/media";
import { Ionicons } from "@expo/vector-icons";
import { useMemo } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import AudioRow from "../AudioRow";
import type { Rect } from "../MediaViewer";
import MojiFace from "../MojiFace";
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
  onLongPress,
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
  const { visuals, audios } = useMemo(() => {
    const { visuals, audios } = splitMedia(media);
    return {
      visuals: visuals.map((v) => ({
        uri: resolveAttachmentUri(v.relPath),
        kind: v.kind as "image" | "video",
      })),
      audios: audios.map((a) => ({
        uri: resolveAttachmentUri(a.relPath),
        name: a.name ?? "Audio",
        durationMs: a.durationMs,
      })),
    };
  }, [media]);

  const countWords = (str: string) => {
    return str
      .trim()
      .split(/\s+/)
      .filter((word: string) => word.length > 0).length;
  };

  const isMe = true;
  const mood = isMoodKey(entry.mood) ? entry.mood : null;

  return (
    <Pressable
      onPressIn={() => animatePress(true)}
      onPressOut={() => animatePress(false)}
      onPress={onPress}
      onLongPress={() => onLongPress(entry)}
    >
      <Animated.View style={[styles.card, { backgroundColor: animatedColor }]}>
        <View style={{ padding: 16 }}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardDate}>{cardHeader}</Text>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "center",
                alignItems: "center",
                gap: 5,
              }}
            >
              <AuthorPill
                name={entry.authorName}
                isMe={isMe}
                diaryAccent={diaryAccent}
              />
              {mood && <MojiFace mood={mood} size={22} />}
            </View>
          </View>
          <Text style={styles.cardTitle}>
            {entry.title || "Untitled Entry"}
          </Text>
          <InlineReadMore text={cleanPreview} />
        </View>
        {visuals.length > 0 && (
          <FeedMedia
            items={visuals}
            onOpen={onMediaOpen}
            onExtraPress={onPress}
          />
        )}
        {audios.length > 0 &&
          audios.map((a) => (
            <AudioRow
              key={`n${a.uri}`}
              uri={a.uri}
              name={a.name}
              durationMs={a.durationMs}
            />
          ))}
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
      alignItems: "center",
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
      color: colors.textMuted,
      fontFamily: fonts.label,
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
