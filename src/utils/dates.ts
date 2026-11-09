import dayjs from "dayjs";
import weekOfYear from "dayjs/plugin/weekOfYear";

dayjs.extend(weekOfYear);

export const getWeekHeaders = (weekStartOn: number): string[] => {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const start = ((weekStartOn % 7) + 7) % 7;
  return [...days.slice(start), ...days.slice(0, start)];
};

export const isSameDay = (date1: Date, date2: Date) => {
  return dayjs(date1).isSame(dayjs(date2), "day");
};

export const isCurrentYear = (date: Date) => {
  return dayjs(date).isSame(dayjs(), "year");
};

export const getMonthWeeks = (
  monthStart: Date,
  weekStartOn: number,
): Date[][] => {
  const first = dayjs(monthStart);
  const offset = (first.day() - weekStartOn + 7) % 7;
  const girdStart = first.subtract(offset, "day");
  const grid = Array.from({ length: 6 }, (_, row) =>
    Array.from({ length: 7 }, (_, col) =>
      girdStart.add(7 * row + col, "day").toDate(),
    ),
  );
  return grid;
};

export const startOfMonth = (date: Date): Date => {
  return dayjs(date).startOf("M").toDate();
};

export const addMonths = (date: Date, months: number): Date => {
  return dayjs(date).add(months, "M").toDate();
};

export const toDateKey = (date: Date): string => {
  return dayjs(date).format("YYYY-MM-DD");
};

export const fromDateKey = (key: string): Date => {
  const parsed = dayjs(key, "YYYY-MM-DD", true);
  if (!parsed) throw new Error(`Invalid date key: ${key}`);
  return parsed.toDate();
};

export const formatEntryDate = (date: Date): string => {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

export const formatCreatedMeta = (createdAt: Date, entryDate: Date): string => {
  const isSame = isSameDay(createdAt, entryDate);
  if (isSame) {
    return createdAt.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  }
  const createdDateStr = createdAt.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  return `Created ${createdDateStr}`;
};

export const formatEntryTime = (
  entryTime: string | null | undefined,
  fallback: Date,
): string =>
  entryTime
    ? dayjs(`2000-01-01T${entryTime}`).format("h:mm A")
    : dayjs(fallback).format("h:mm A");

export const getWeekOfYear = (date: Date) => {
  const baseDate = dayjs(date);
  const weekNumber = baseDate.week();
  return baseDate.format(`YYYY - [Week] ${weekNumber}`);
};

export const getWeekRange = (date: Date) => {
  const baseDate = dayjs(date);
  const firstDay = baseDate.startOf("week");
  const lastDay = baseDate.endOf("week");
  return {
    firstDay: firstDay.format("MMM D"),
    lastDay: lastDay.format("MMM D"),
  };
};

export const addDays = (date: Date, days: number) => {
  return dayjs(date).add(days, "d").toDate();
};
