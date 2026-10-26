import { fonts } from "@/src/constants/typography";
import useTheme from "@/src/hooks/useTheme";
import { StyleSheet, Text, View } from "react-native";

type AuthorPillProps = { isMe: boolean; name: string; diaryAccent: string };
export default function AuthorPill({
  isMe,
  name,
  diaryAccent,
}: AuthorPillProps) {
  const { colors } = useTheme();
  const styles = getStyles(colors, diaryAccent);
  return (
    <View>
      <View
        style={[
          styles.authorPill,
          isMe ? styles.authorPillMe : styles.authorPillOther,
        ]}
      >
        <View
          style={[
            styles.authorDot,
            {
              backgroundColor: isMe ? diaryAccent : colors.textMuted,
            },
          ]}
        />
        <Text
          style={[
            styles.authorText,
            { color: isMe ? diaryAccent : colors.textMuted },
          ]}
          numberOfLines={1}
        >
          {isMe ? `${name} • YOU` : name}
        </Text>
      </View>
    </View>
  );
}

const getStyles = (
  colors: ReturnType<typeof useTheme>["colors"],
  diaryAccent: string,
) =>
  StyleSheet.create({
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
