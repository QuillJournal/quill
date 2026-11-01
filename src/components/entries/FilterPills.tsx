import { FilterObject, FilterValue } from "@/src/types/filter";
import { StyleSheet } from "react-native";
import { FlatList } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Pill from "../Pill";

type FilterPillsProps = {
  diaryAccent: string;
  selectedFilter: string;
  onSelectFilter: (filter: FilterValue) => void;
};

const filters = [
  { label: "All", value: "all" as const },
  { label: "Media", value: "media" as const, icon: "image-outline" as const },
  { label: "Audio", value: "audio" as const, icon: "mic-outline" as const },
  { label: "Mine", value: "mine" as const, icon: "person-outline" as const },
];

export default function FilterPills({
  diaryAccent,
  selectedFilter,
  onSelectFilter,
}: FilterPillsProps) {
  const insets = useSafeAreaInsets();

  const renderItem = (item: FilterObject) => (
    <Pill
      text={item.label}
      selected={item.value == selectedFilter}
      onPress={() => onSelectFilter(item.value)}
      icon={item.icon}
      iconColor={diaryAccent}
      isInteractive={true}
    />
  );

  return (
    <FlatList
      style={{ flexGrow: 0 }}
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
