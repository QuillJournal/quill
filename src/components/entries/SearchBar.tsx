import { radius } from "@/src/constants/radius";
import useTheme from "@/src/hooks/useTheme";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { StyleSheet, TextInput, View } from "react-native";

type SearchBarProps = { placeholder: string };
export default function SearchBar({ placeholder }: SearchBarProps) {
  const [query, setQuery] = useState("");
  const { colors } = useTheme();
  const styles = getStyles(colors);
  return (
    <View style={styles.container}>
      <Ionicons size={20} name="search" color={colors.textMuted} />
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        value={query}
        onChangeText={setQuery}
      />
      <Ionicons size={20} name="mic" color={colors.textMuted} />
    </View>
  );
}

const getStyles = (colors: ReturnType<typeof useTheme>["colors"]) =>
  StyleSheet.create({
    container: {
      height: 48,
      flexDirection: "row",
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      alignItems: "center",
      paddingHorizontal: 10,
      gap: 5,
    },
    input: { flex: 1 },
  });
