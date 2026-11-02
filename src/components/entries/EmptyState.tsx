import { fonts } from "@/src/constants/typography";
import useTheme from "@/src/hooks/useTheme";
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

type EmptyStateProps = { accentColor: string };
export default function EmptyState({ accentColor }: EmptyStateProps) {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  return (
    <View style={styles.emptyWrap}>
      <Ionicons name="book-outline" size={44} color={accentColor} />
      <Text style={styles.emptyTitle}>No Memories Yet</Text>
      <Text style={styles.emptySubtitle}>
        Tap the button below or long-press any calendar day to capture a moment.
      </Text>
    </View>
  );
}
const getStyles = (colors: ReturnType<typeof useTheme>["colors"]) =>
  StyleSheet.create({
    emptyWrap: {
      alignItems: "center",
      gap: 8,
      flexGrow: 1,
      justifyContent: "center",
      paddingHorizontal: 32,
    },
    emptyTitle: {
      fontFamily: fonts.heading,
      fontSize: 18,
      color: colors.text,
      marginTop: 8,
    },
    emptySubtitle: {
      fontFamily: fonts.body,
      fontSize: 14,
      color: colors.textMuted,
      textAlign: "center",
      lineHeight: 20,
    },
  });
