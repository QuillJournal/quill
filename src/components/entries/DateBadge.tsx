import { radius } from "@/src/constants/radius";
import { fontSizes } from "@/src/constants/typography";
import useTheme from "@/src/hooks/useTheme";
import { fromDateKey } from "@/src/utils/dates";
import { StyleSheet, Text, View } from "react-native";

type DateBadgeProps = { date: string };
export default function DateBadge({ date }: DateBadgeProps) {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  return (
    <View style={styles.dateBadge}>
      <Text
        style={{
          color: colors.textMuted,
          fontSize: fontSizes.xs,
          textTransform: "uppercase",
          flex: 1,
        }}
      >
        {fromDateKey(date).toLocaleDateString("en-US", {
          weekday: "short",
        })}
      </Text>
      <Text style={styles.text}>{date.split("-")[2]}</Text>
    </View>
  );
}

const getStyles = (colors: ReturnType<typeof useTheme>["colors"]) =>
  StyleSheet.create({
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
