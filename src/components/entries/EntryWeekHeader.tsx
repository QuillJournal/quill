import { spacing } from "@/src/constants/spacings";
import { fontSizes } from "@/src/constants/typography";
import useTheme from "@/src/hooks/useTheme";
import { StyleSheet, Text, View } from "react-native";

type EntryWeekHeaderProps = {
  title: string;
  subtitle: string;
};

export default function EntryWeekHeader({
  title,
  subtitle,
}: EntryWeekHeaderProps) {
  const { colors } = useTheme();
  const styles = getStyles(colors);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
    </View>
  );
}

const getStyles = (colors: ReturnType<typeof useTheme>["colors"]) =>
  StyleSheet.create({
    container: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      gap: 10,
      paddingBottom: spacing.sm,
      paddingTop: spacing.md,
      backgroundColor: colors.background,
    },
    title: {
      fontWeight: 600,
      textTransform: "uppercase",
      fontSize: fontSizes.md,
      color: colors.textMuted,
      letterSpacing: 0.3,
      flex: 1,
    },
    subtitle: {
      fontWeight: 400,
      color: colors.textMuted,
      fontSize: fontSizes.xs,
    },
  });
