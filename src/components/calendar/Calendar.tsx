import { radius } from "@/src/constants/radius";
import { spacing } from "@/src/constants/spacings";
import useCalendarCollapse from "@/src/hooks/useCalendarCollapse";
import useTheme from "@/src/hooks/useTheme";
import { EntryWithAuthor } from "@/src/types/entry";
import {
  addDays,
  addMonths,
  fromDateKey,
  getMonthWeeks,
  isSameDay,
  startOfMonth,
  toDateKey,
} from "@/src/utils/dates";
import { DatePicker } from "@quidone/react-native-wheel-picker";
import { useEffect, useMemo, useState } from "react";
import { Text, View } from "react-native";
import { GestureDetector } from "react-native-gesture-handler";
import Animated from "react-native-reanimated";
import AppModal from "../ui/AppModal";
import CalendarHeader from "./CalendarHeader";
import MonthGrid from "./MonthGrid";
import NavButton from "./NavButton";

type CalendarProps = {
  entries: EntryWithAuthor[];
  selectedDate: Date | null;
  onDayPress: (date: Date) => void;
  onDayLongPress: (date: Date) => void;
};

const computeStreak = (dayKeys: Set<string>, today: Date) => {
  let cursor = dayKeys.has(toDateKey(today)) ? today : addDays(today, -1);
  let streak = 0;
  while (dayKeys.has(toDateKey(cursor))) {
    streak++;
    cursor = addDays(cursor, -1);
  }
  return streak;
};

export default function Calendar({
  entries,
  selectedDate,
  onDayPress,
  onDayLongPress,
}: CalendarProps) {
  const { colors } = useTheme();
  const [showPicker, setShowPicker] = useState(false);

  const today = useMemo(() => new Date(), []);

  const anchorDate = selectedDate ?? today;
  const anchorKey = toDateKey(anchorDate);

  const [currentMonth, setCurrentMonth] = useState(() =>
    startOfMonth(anchorDate),
  );

  const weeks = useMemo(() => getMonthWeeks(currentMonth, 0), [currentMonth]);
  const journaledDays = useMemo(
    () => new Set(entries.map((e) => e.entryDate)),
    [entries],
  );

  const streak = useMemo(
    () => computeStreak(journaledDays, today),
    [journaledDays, today],
  );
  const found = weeks.findIndex((w) => w.some((d) => isSameDay(d, anchorDate)));
  const selectedRow = found === -1 ? 0 : found;

  const {
    toggle,
    headerStyle,
    gridContainerStyle,
    gridStyle,
    panGesture,
    isExpanded,
    chevronRotation,
  } = useCalendarCollapse(selectedRow);

  useEffect(() => {
    setCurrentMonth(startOfMonth(fromDateKey(anchorKey)));
  }, [anchorKey, isExpanded]);

  const handlePrevMonth = () => setCurrentMonth((prev) => addMonths(prev, -1));
  const handleNextMonth = () => setCurrentMonth((prev) => addMonths(prev, 1));
  const handleJumpToToday = () => setCurrentMonth(startOfMonth(today));

  const navButton = (
    <Animated.View style={chevronRotation}>
      <NavButton icon={"chevron-up-outline"} onPress={toggle} />
    </Animated.View>
  );

  return (
    <View
      style={{
        marginHorizontal: spacing.md,
        backgroundColor: colors.calendarBackground,
        borderWidth: 1,
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderColor: colors.surfaceHigh,
        borderRadius: radius.lg,
      }}
    >
      <CalendarHeader
        month={currentMonth}
        onJumpToToday={handleJumpToToday}
        onPrev={handlePrevMonth}
        onNext={handleNextMonth}
        onTitlePress={() => setShowPicker((prev) => !prev)}
      />
      {/* <WeekHeader weekStartOn={0} /> */}
      <GestureDetector gesture={panGesture}>
        <View>
          <Animated.View style={[gridContainerStyle, { overflow: "hidden" }]}>
            <Animated.View style={gridStyle}>
              <MonthGrid
                entries={entries}
                month={currentMonth}
                weeks={weeks}
                selectedDate={selectedDate}
                onDayPress={onDayPress}
                onDayLongPress={onDayLongPress}
              />
            </Animated.View>
          </Animated.View>
          <View
            style={{
              borderTopWidth: 1,
              borderTopColor: colors.border,
              flexDirection: "row",
              gap: 10,
              paddingTop: 10,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "baseline" }}>
              <View
                style={{
                  width: 10,
                  height: 10,
                  backgroundColor: colors.accent,
                  borderRadius: 5,
                  marginRight: 5,
                }}
              ></View>
              <Text
                style={{ color: colors.calendarText, fontWeight: 600 }}
              >{`${journaledDays.size} days `}</Text>
              <Text style={{ color: colors.textMuted }}>journaled</Text>
            </View>
            <Text style={{ color: colors.textMuted }}>•</Text>
            <Text style={{ color: colors.streak }}>
              {`${streak}-days`} streak
            </Text>
          </View>
          <View
            style={{
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            {navButton}
          </View>
        </View>
      </GestureDetector>
      <AppModal
        title="Jump To"
        isOpen={showPicker}
        onClose={() => setShowPicker(false)}
      >
        <View style={{ alignItems: "center" }}>
          <DatePicker
            itemTextStyle={{ color: colors.text }}
            date={toDateKey(anchorDate)}
            onDateChanged={({ date }: { date: string }) =>
              onDayPress(new Date(date))
            }
          />
        </View>
      </AppModal>
    </View>
  );
}
