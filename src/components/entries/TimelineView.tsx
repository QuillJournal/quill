import useTheme from "@/src/hooks/useTheme";
import type { ViewProps } from "@/src/types/diary";
import { Text, View } from "react-native";
export default function TimelineView({
  entries,
  selectedDate,
  onSelectEntry,
  onDeleteEntry,
  diaryAccent,
}: ViewProps) {
  const { colors } = useTheme();
  return (
    <View style={{ justifyContent: "center", alignItems: "center" }}>
      <Text style={{ color: colors.text, fontSize: 22 }}>Coming soon!!</Text>
    </View>
  );
}
