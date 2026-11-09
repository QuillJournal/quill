import { moodColors } from "@/src/constants/colors";
import { MoodKey } from "@/src/constants/moods";
import useTheme from "@/src/hooks/useTheme";
import type { EntryWithAuthor } from "@/src/types/entry";
import { isSameDay, toDateKey } from "@/src/utils/dates";
import { useWindowDimensions, View } from "react-native";
import DayCell from "./DayCell";

type WeekStripProps = {
  week: Date[];
  month: Date;
  entries: EntryWithAuthor[];
  selectedDate: Date | null;
  onDayPress: (date: Date) => void;
  onDayLongPress: (date: Date) => void;
};

export default function WeekStrip({
  week,
  month,
  entries,
  selectedDate,
  onDayPress,
  onDayLongPress,
}: WeekStripProps) {
  const isCurrentMonth = (day: Date) => {
    return (
      day.getMonth() == month.getMonth() &&
      day.getFullYear() == month.getFullYear()
    );
  };
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const height = width / 7;
  const { isDark } = useTheme();

  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-around",
        height: height,
      }}
    >
      {week.map((day: Date) => {
        const entry = entries.find((e) => e.entryDate === toDateKey(day));
        const markColor = !entry
          ? null
          : entry.mood
            ? (moodColors[entry.mood as MoodKey]?.[isDark ? "dark" : "light"] ??
              colors.accent)
            : colors.accent;
        return (
          <DayCell
            key={day.toISOString()}
            day={day}
            markColor={markColor}
            isCurrentMonth={isCurrentMonth(day)}
            isSelected={selectedDate ? isSameDay(day, selectedDate) : false}
            onPress={onDayPress}
            onLongPress={onDayLongPress}
          />
        );
      })}
    </View>
  );
}
