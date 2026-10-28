import { isMoodKey } from "@/src/constants/moods";
import { fonts, fontSizes } from "@/src/constants/typography";
import usePressAnimation from "@/src/hooks/usePressAnimation";
import useTheme from "@/src/hooks/useTheme";
import type { EntryWithAuthor } from "@/src/types/entry";
import { fromDateKey } from "@/src/utils/dates";
import { Ionicons } from "@expo/vector-icons";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import AuthorPill from "./AuthorPill";
import DateBadge from "./DateBadge";

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

  return (
    <Pressable
      onPress={onPress}
      onLongPress={() => onLongPress(entry)}
      onPressIn={() => animatePress(true)}
      onPressOut={() => animatePress(false)}
    >
      <Animated.View style={[styles.card, { backgroundColor: animatedColor }]}>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <View style={styles.cardHeader}>
            <DateBadge date={entry.entryDate} />
            <View style={{ alignItems: "flex-start", gap: 5 }}>
              <Text style={styles.cardTitle}>{entry.title}</Text>
              <AuthorPill
                name={entry.authorName}
                isMe={isMe}
                diaryAccent={diaryAccent}
              />
            </View>
          </View>
          <Ionicons
            size={18}
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
