import { useState } from "react";
import { StyleSheet, View } from "react-native";
import Pill from "../Pill";

type FilterPillsProps = { diaryAccent: string };

const filters = [
  { label: "All", value: "all" },
  { label: "Starred", value: "starred", icon: "star-outline" as const },
];

export default function FilterPills({ diaryAccent }: FilterPillsProps) {
  const [selectedFilter, setSelectedFilter] = useState("all");

  return (
    <View style={styles.container}>
      {filters.map((f) => (
        <Pill
          text={f.label}
          selected={f.value == selectedFilter}
          onPress={() => setSelectedFilter(f.value)}
          icon={f.icon}
          iconColor={diaryAccent}
          isInteractive={true}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    flexDirection: "row",
    gap: 10,
  },
});
