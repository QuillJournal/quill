import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { StyleSheet } from "react-native";
import { FlatList } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Pill from "../Pill";

type FilterPillsProps = { diaryAccent: string };
type Filter = {
  label: string;
  value: string;
  icon?: keyof typeof Ionicons.glyphMap;
};

const filters = [
  { label: "All", value: "all" },
  { label: "Media", value: "media", icon: "image-outline" as const },
  { label: "Audio", value: "audio", icon: "mic-outline" as const },
  { label: "Mine", value: "mine", icon: "person-outline" as const },
];

export default function FilterPills({ diaryAccent }: FilterPillsProps) {
  const [selectedFilter, setSelectedFilter] = useState("all");
  const insets = useSafeAreaInsets();

  const renderItem = (item: Filter) => (
    <Pill
      text={item.label}
      selected={item.value == selectedFilter}
      onPress={() => setSelectedFilter(item.value)}
      icon={item.icon}
      iconColor={diaryAccent}
      isInteractive={true}
    />
  );

  return (
    <FlatList
      data={filters}
      keyExtractor={(item) => item.value}
      renderItem={({ item }) => renderItem(item)}
      contentContainerStyle={[
        styles.container,
        { paddingRight: 200 + insets.right },
      ]}
      horizontal
    />
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    flexDirection: "row",
    gap: 5,
    flex: 1,
  },
});
