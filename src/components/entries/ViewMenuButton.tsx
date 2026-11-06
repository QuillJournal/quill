import useTheme from "@/src/hooks/useTheme";
import { Ionicons } from "@expo/vector-icons";
import { View } from "react-native";
import Pill from "../Pill";
import SegmentedControl from "../SegmentedControl";

const option = [{ label: "List", value: "list" }];
export default function ViewMenuButton({
  diaryAccent,
  showSwitcher,
  onPillPress,
  selectedView,
  onSelectView,
}) {
  const { colors } = useTheme();
  const VIEW_OPTIONS = [
    { label: "Feed", value: "feed", icon: "albums-outline" },
    { label: "Timeline", value: "timeline", icon: "calendar-outline" },
    { label: "List", value: "list", icon: "list-outline" },
  ] as const;

  const selectedOption = VIEW_OPTIONS.find((v) => v.value == selectedView);
  return (
    <View
      style={{
        justifyContent: "center",
        alignItems: "center",
        position: "relative",
      }}
    >
      <Pill
        text={selectedOption?.label || "View"}
        icon={selectedOption?.icon}
        iconColor={diaryAccent}
        isInteractive={true}
        selected={showSwitcher == true}
        onPress={onPillPress}
        style={{ width: 120, gap: 5 }}
      >
        <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
      </Pill>
      {showSwitcher && (
        <SegmentedControl
          options={VIEW_OPTIONS}
          selectedValue={selectedView}
          onSelect={onSelectView}
        />
      )}
    </View>
  );
}
