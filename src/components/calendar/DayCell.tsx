import { moodColors } from "@/src/constants/colors";
import { radius } from "@/src/constants/radius";
import useTheme from "@/src/hooks/useTheme";
import { isSameDay } from "@/src/utils/dates";
import { Pressable, StyleSheet, Text, View } from "react-native";

type DayCellProps = {
  day: Date;
  moodColor:
    | (typeof moodColors)[keyof typeof moodColors]["dark" | "light"]
    | null;
  isCurrentMonth: boolean;
  isSelected: boolean;
  onPress: (day: Date) => void;
  onLongPress: (day: Date) => void;
};
export default function DayCell({
  day,
  moodColor,
  isCurrentMonth,
  isSelected,
  onPress,
  onLongPress,
}: DayCellProps) {
  const { colors } = useTheme();
  const isToday = isSameDay(day, new Date());
  return (
    <Pressable
      style={[styles.cellContainer, !isCurrentMonth && { opacity: 0.4 }]}
      onPress={() => onPress(day)}
      onLongPress={() => onLongPress(day)}
    >
      <View
        style={[
          styles.textWrapper,
          isSelected && { backgroundColor: colors.accent },
        ]}
      >
        <Text
          style={[
            styles.dayText,
            { color: colors.text },
            isToday &&
              !isSelected && {
                color: colors.accent,
              },
            isSelected && {
              color: colors.textOnAccent,
            },
          ]}
        >
          {day.getDate()}
        </Text>
        {moodColor && (
          <View
            style={[
              styles.dot,
              {
                backgroundColor: moodColor,
              },
            ]}
          ></View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cellContainer: {
    justifyContent: "center",
    alignItems: "center",
    aspectRatio: 1,
    flex: 1,
  },
  dayText: {
    fontSize: 14,
  },
  textWrapper: {
    justifyContent: "center",
    alignItems: "center",
    width: 32,
    height: 32,
    borderRadius: radius.md + 5,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    position: "absolute",
    bottom: -10,
  },
});
