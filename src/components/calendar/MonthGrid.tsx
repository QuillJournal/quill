import type { EntryWithAuthor } from "@/src/types/entry";
import { View } from "react-native";
import WeekStrip from "./WeekStrip";

type MonthGridProps = {
  entries: EntryWithAuthor[];
  weeks: Date[][];
  month: Date;
  selectedDate: Date | null;
  onDayPress: (date: Date) => void;
  onDayLongPress: (date: Date) => void;
};

export default function MonthGrid({
  entries,
  weeks,
  month,
  selectedDate,
  onDayPress,
  onDayLongPress,
}: MonthGridProps) {
  return (
    <View>
      {weeks.map((week) => {
        const weekKey = week[0].toISOString();
        return (
          <WeekStrip
            entries={entries}
            key={weekKey}
            week={week}
            month={month}
            selectedDate={selectedDate}
            onDayPress={onDayPress}
            onDayLongPress={onDayLongPress}
          />
        );
      })}
    </View>
  );
}
