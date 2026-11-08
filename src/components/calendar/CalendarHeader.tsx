import { fonts, fontSizes } from "@/src/constants/typography";
import useTheme from "@/src/hooks/useTheme";
import { StyleSheet, Text, View } from "react-native";
import Pill from "../Pill";
import NavButton from "./NavButton";

type MonthHeaderProps = {
  month: Date;
  onJumpToToday: () => void;
  onPrev: () => void;
  onNext: () => void;
  onTitlePress: () => void;
};
const formatter = new Intl.DateTimeFormat("en", {
  year: "numeric",
  month: "long",
});

export default function MonthHeader({
  month,
  onJumpToToday,
  onPrev,
  onNext,
  onTitlePress,
}: MonthHeaderProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 5,
        }}
      >
        <Text
          style={[styles.text, { color: colors.calendarText }]}
          maxFontSizeMultiplier={1.2}
        >
          {formatter.format(month)}
        </Text>
        <NavButton icon="chevron-down" iconSize={16} onPress={onTitlePress} />
      </View>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 5,
        }}
      >
        <Pill
          text="Today"
          isInteractive={true}
          onPress={onJumpToToday}
          textStyle={{ fontSize: fontSizes.xs }}
        />
        <View style={{ flexDirection: "row" }}>
          <NavButton icon="arrow-back" onPress={onPrev} />
          <NavButton icon="arrow-forward" onPress={onNext} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
    flexDirection: "row",
    height: 48,
  },
  text: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.md + 1,
    fontWeight: "800",
  },
  ionButton: { padding: 2, borderRadius: 999 },
});
