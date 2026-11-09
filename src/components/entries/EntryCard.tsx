import { isMoodKey } from "@/src/constants/moods";
import { radius } from "@/src/constants/radius";
import { fonts, fontSizes } from "@/src/constants/typography";
import usePressAnimation from "@/src/hooks/usePressAnimation";
import useTheme from "@/src/hooks/useTheme";
import { resolveAttachmentUri } from "@/src/services/attachments";
import { Attachment } from "@/src/types/attachment";
import type { EntryWithAuthor } from "@/src/types/entry";
import { formatEntryDate, fromDateKey } from "@/src/utils/dates";
import { splitMedia } from "@/src/utils/media";
import { Ionicons } from "@expo/vector-icons";
import { useMemo } from "react";
import { Animated, Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";
import MediaThumb from "../MediaThumb";
import MojiFace from "../MojiFace";
import AuthorPill from "./AuthorPill";
import DateBadge from "./DateBadge";

type EntryCardProps = {
  entry: EntryWithAuthor;
  media: Attachment[];
  onPress: () => void;
  onLongPress: (entry: EntryWithAuthor) => void;
  diaryAccent: string;
  isMe: boolean;
  style: StyleProp<ViewStyle>
};

export default function EntryCard({
  entry,
  media,
  onPress,
  onLongPress,
  diaryAccent,
  isMe,
  style,
}: EntryCardProps) {
  const { colors } = useTheme();
  const styles = getStyles(colors, diaryAccent);
  const entryDate = fromDateKey(entry.entryDate);
  const mood = isMoodKey(entry.mood) ? entry.mood : null;
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
  const { animatePress, animatedColor } = usePressAnimation(
    colors.card,
    colors.cardPressed,
  );

  return (
    <Pressable
    accessibilityRole="button"
    accessibilityLabel={`${entry.title || "Untitled entry"}, ${formatEntryDate(entryDate)}`}
      onPress={onPress}
      onLongPress={() => onLongPress(entry)}
      onPressIn={() => animatePress(true)}
      onPressOut={() => animatePress(false)}
    >
      <Animated.View style={[styles.card, { backgroundColor: animatedColor }, style]}>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <View style={styles.cardHeader}>
            <DateBadge date={entry.entryDate} />
            <View
              style={{ alignSelf: "stretch", flex: 1, gap: 5, minWidth: 0 }}
            >
              <Text
                style={styles.cardTitle}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {entry.title}
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <AuthorPill
                  name={entry.authorName}
                  isMe={isMe}
                  diaryAccent={diaryAccent}
                />
                {mood && <MojiFace mood={mood} size={22} />}
                {audios.length > 0 && (
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "center",
                      alignItems: "center",
                      flexShrink: 0,
                      borderRadius: radius.lg,
                      paddingHorizontal: 5,
                      backgroundColor: colors.cardPressed,
                    }}
                  >
                    <Ionicons
                      name="mic-outline"
                      color={colors.secondaryAccent}
                      size={18}
                      accessibilityLabel={`mic icon`}
                    />
                    {audios[0]?.durationMs && (
                      <Text>{audios[0]?.durationMs / 1000}s</Text>
                    )}
                  </View>
                )}
              </View>
            </View>
            {visuals.length > 0 && (
              <View style={{ flexShrink: 0, height: 56, width: 56 }}>
                <MediaThumb
                  uri={visuals[0].uri}
                  kind={visuals[0].kind}
                  borderRadius={5}
                  onOpen={onPress}
                  label={visuals[0].kind === "image" ? "Photo" : "Video"}
                  hidden={false}
                />
              </View>
            )}
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
      padding: 16,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 2,
    },
    cardHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    cardTitleRow: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginRight: 12,
    },
    cardTitle: {
      fontSize: fontSizes.lg,
      color: colors.text,
      fontFamily: fonts.body,
      flexShrink: 1,
    },
    cardDate: {
      fontFamily: fonts.label,
      fontSize: 12,
      color: colors.textMuted,
    },
    cardPreview: {
      fontFamily: fonts.body,
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
