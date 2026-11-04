import useTheme from "@/src/hooks/useTheme";
import { View } from "react-native";
import Pill from "../Pill";
import SegmentedControl from "../SegmentedControl";
const option = [{ label: "List", value: "list" }];
export default function ViewMenuButton({
  diaryAccent,
  showSwitcher,
  onPillPress,
}) {
  const { colors } = useTheme();
  const VIEW_OPTIONS = [
    { label: "Feed", value: "feed" },
    { label: "Timeline", value: "timeline" },
    { label: "List", value: "list" },
  ] as const;
  return (
    <View
      style={{
        justifyContent: "center",
        alignItems: "center",
        position: "relative",
      }}
    >
      <Pill
        text={"List"}
        icon={"list"}
        iconColor={diaryAccent}
        isInteractive={true}
        selected={showSwitcher == true}
        onPress={onPillPress}
      />
      {showSwitcher && <SegmentedControl options={VIEW_OPTIONS} />}
    </View>
  );
}
