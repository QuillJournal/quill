import { useRef, useState, useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  CardRect,
  useDiaryTransition,
} from "../context/DiaryTransitionContext";
import usePressAnimation from "../hooks/usePressAnimation";
import useTheme from "../hooks/useTheme";
import { haptic } from "../services/haptics";
import type { Diary } from "../types/diary";
import { dialog } from "./Dialog/DialogProvider";
import DiaryBook, { RIBBON_OVERHANG } from "./DiaryBook";
import SwipeableCard from "./SwipeableCard";
type DiaryCardProps = {
  diary: Diary;
  isFirst?: boolean;
  onPress: (origin: CardRect) => void;
  onDelete: (id: number) => void;
};

export const STACK_SIDE_PADDING = RIBBON_OVERHANG + 6;

export default function DiaryCard({
  diary,
  isFirst,
  onPress,
  onDelete,
}: DiaryCardProps) {
  const { colors } = useTheme();
  const { animatePress, animatedColor } = usePressAnimation(
    colors.card,
    colors.cardPressed,
  );
  const { activeId, reportFirst } = useDiaryTransition();
  const ref = useRef<View>(null);
  const titleRef = useRef<Text>(null);

  const entryLabel = `${diary.entryCount} ${diary.entryCount === 1 ? "entry" : "entries"}`;
  /// 
  const measure = (cb: (r: CardRect) => void) =>
    ref.current?.measureInWindow((x, y, width, height) =>
      titleRef.current?.measureInWindow((tx, ty, tw, th) =>
        cb({
          x,
          y,
          width,
          height,
          title: { x: tx, y: ty, width: tw, height: th },
        }),
      ),
    );
  const handlePress = () => measure(onPress);
  const handleLayout = () => {
    if (isFirst) requestAnimationFrame(() => measure(reportFirst));
  };

  const handleLongPress = () => {
    haptic.warning();
    dialog.alert(
      "Delete Diary",
      `Are you sure you want to delete "${diary.name}"? This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            haptic.thud();
            onDelete(diary.id);
          },
        },
      ],
    );
  };

  return (
    <SwipeableCard onDelete={handleLongPress}>
      <Pressable
        ref={ref}
        onLayout={handleLayout}
        onPress={handlePress}
        onLongPress={handleLongPress}
        delayLongPress={500}
        onPressIn={() => animatePress(true)}
        onPressOut={() => animatePress(false)}
        accessibilityRole="button"
        accessibilityLabel={`${diary.name}, ${entryLabel}`}
        style={[styles.wrapper, activeId === diary.id && styles.hidden]}
      >
        <DiaryBook
          diary={diary}
          backgroundColor={animatedColor}
          titleRef={titleRef}
        />
      </Pressable>
    </SwipeableCard>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: -1 },
  hidden: { opacity: 0 },
});
