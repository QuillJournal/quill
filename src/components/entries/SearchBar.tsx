import { radius } from "@/src/constants/radius";
import useTheme from "@/src/hooks/useTheme";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, TextInput, View } from "react-native";

type SearchBarProps = {
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  onSubmit: () => void;
};
export default function SearchBar({
  placeholder,
  value,
  onChangeText,
  onSubmit,
}: SearchBarProps) {
  const { colors } = useTheme();
  const styles = getStyles(colors);

  return (
    <View style={styles.container}>
      <Pressable onPress={onSubmit} hitSlop={20}>
        <Ionicons size={20} name="search" color={colors.textMuted} />
      </Pressable>
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        value={value}
        onChangeText={onChangeText}
        onSubmitEditing={onSubmit}
      />
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
