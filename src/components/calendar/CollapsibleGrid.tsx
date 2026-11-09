import { useState } from "react";
import { View } from "react-native";
import NavButton from "./NavButton";
import WeekHeader from "./WeekHeader";

const ROW_H = 20;
export default function CollapsibleGrid({
  currentWeek,
  header,
  grid,
}: {
  currentWeek: any;
  header: React.ReactNode;
  grid: React.ReactNode;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  return (
    <View style={{ justifyContent: "space-around", overflow: "hidden" }}>
      {header}
      <WeekHeader weekStartOn={0} />
      <View style={{ height: isExpanded ? ROW_H * 6 : ROW_H }}>{grid}</View>
      <View
        style={{
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <NavButton
          icon={"reorder-three-outline"}
          onPress={() => setIsExpanded((prev) => !prev)}
        />
      </View>
    </View>
  );
}
