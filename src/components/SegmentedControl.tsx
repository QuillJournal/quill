import { useEffect, useState } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { radius } from "../constants/radius";
import { spacing } from "../constants/spacings";
import useTheme from "../hooks/useTheme";
import { select } from "../services/hapticPatterns";
import { playEvents as play } from "../services/haptics";
import type { ViewType } from "../types/diary";

type Option = { label: string; value: ViewType };
type SegmentedControlProps = {
  options: readonly Option[];
  selectedValue: ViewType;
  onSelect: (value: ViewType) => void;
};
export default function SegmentedControl({
  options,
  selectedValue,
  onSelect,
}: SegmentedControlProps) {
  const { colors } = useTheme();
  const [containerWidth, setContainerWidth] = useState(0);
  const highlightPillWidth = Math.max(
    0,
    (containerWidth - 2 - spacing.xs * 2) / options.length,
  );
  const progress = useSharedValue(0);
  const selectedIndex = Math.max(
    0,
    options.findIndex((o) => o.value === selectedValue),
  );
  const [activeIndex, setActiveIndex] = useState(selectedIndex);

  useEffect(() => {
    progress.value = withSpring(activeIndex);
  }, [activeIndex]);

  useEffect(() => {
    setActiveIndex(selectedIndex);
  }, [selectedValue]);

  const animatedStyle = useAnimatedStyle(() => {
    return { transform: [{ translateX: progress.value * highlightPillWidth }] };
  });

  const highlightPill = (
    <Animated.View
      style={[
        {
          width: highlightPillWidth,
          backgroundColor: colors.background,
          margin: 2,
          borderRadius: radius.md,
          position: "absolute",
          top: 0,
          bottom: 0,
          ...Platform.select({
            ios: {
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.18,
              shadowRadius: 1.0,
            },
            android: {
              elevation: 1,
            },
          }),
        },

        animatedStyle,
      ]}
    ></Animated.View>
  );

  const handlePress = (value: ViewType) => {
    play(select);
    onSelect(value);
  };

  return (
    <View
    onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
      style={[
        styles.container,
        {
          backgroundColor: colors.SegmentedControl,
          borderColor: colors.border,
        },
      ]}
    >
      {highlightPill}
      {options.map((o, index) => {
        const color = o.value == selectedValue ? colors.text : colors.textMuted;

        return (
          <Pressable
            key={o.value}
            onPress={() => handlePress(o.value)}
            style={[styles.segment]}
          >
            <Text style={{ color }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    borderRadius: radius.md,
    marginHorizontal: spacing.md,
    marginVertical: spacing.sm,
    padding: spacing.xs,
    borderWidth: 1,
  },
  segment: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.md,
  },
});
