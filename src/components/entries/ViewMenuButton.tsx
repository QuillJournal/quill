import useTheme from "@/src/hooks/useTheme";
import { ViewType } from "@/src/types/diary";
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, View } from "react-native";
import Pill from "../Pill";
import SegmentedControl from "../SegmentedControl";

type ViewMenuButtonProps = {
  diaryAccent: string;
  showSwitcher: boolean;
  onPillPress: () => void;
  selectedView: ViewType;
  onSelectView: (view: ViewType) => void;
};
export default function ViewMenuButton({
  diaryAccent,
  showSwitcher,
  onPillPress,
  selectedView,
  onSelectView,
}: ViewMenuButtonProps) {
  const { colors } = useTheme();
  const VIEW_OPTIONS = [
    { label: "Feed", value: "feed", icon: "albums-outline" },
    { label: "Timeline", value: "timeline", icon: "calendar-outline" },
    { label: "List", value: "list", icon: "list-outline" },
  ] as const;

  const selectedOption = VIEW_OPTIONS.find((v) => v.value == selectedView);
  return (
    <View style={styles.container}>
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
        <View
          style={{
            flex: 1,
            position: "absolute",
            top: "75%",
            zIndex: 100,
            left: 0,
            right: 0,
          }}
        >
          <SegmentedControl
            options={VIEW_OPTIONS}
            selectedValue={selectedView}
            onSelect={onSelectView}
            orientation="vertical"
            style={{ boxShadow: "0px 0px 10px 2px rgba(0, 0, 0, 0.15)" }}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
});
