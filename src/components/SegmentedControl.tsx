import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { radius } from "../constants/radius";
import { spacing } from "../constants/spacings";
import { fonts, fontSizes } from "../constants/typography";
import useTheme from "../hooks/useTheme";
import { select } from "../services/hapticPatterns";
import { playEvents as play } from "../services/haptics";

type Option<T extends string> = {
  label: string;
  value: T;
  icon?: keyof typeof Ionicons.glyphMap;
};

type SegmentedControlProps<T extends string> = {
  options: readonly Option<T>[];
  selectedValue: T;
  onSelect: (value: T) => void;
};
export default function SegmentedControl<T extends string>({
  options,
  selectedValue,
  onSelect,
}: SegmentedControlProps<T>) {
  const { colors } = useTheme();
  const [containerHeight, setContainerHeight] = useState(0);
  const highlightPillHeight = Math.max(
    0,
    (containerHeight - 2 - spacing.xs * 2) / options.length,
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
    return {
      transform: [{ translateY: progress.value * highlightPillHeight }],
    };
  });

  const highlightPill = (
    <Animated.View
      style={[
        {
          height: highlightPillHeight,
          backgroundColor: colors.accentContainer,
          margin: 2,
          borderRadius: radius.md,
          position: "absolute",

          left: 0,
          right: 0,
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

  const handlePress = (value: T) => {
    play(select);
    onSelect(value);
  };

  return (
    <View
      onLayout={(e) => setContainerHeight(e.nativeEvent.layout.height)}
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
        const color =
          o.value === selectedValue
            ? colors.onAccentContainer
            : colors.textMuted;

        return (
          <Pressable
            key={o.value}
            onPress={() => handlePress(o.value)}
            style={[styles.segment]}
          >
            <Ionicons name={o.icon} size={16} />
            <Text
              style={{ color, fontFamily: fonts.label, fontSize: fontSizes.sm }}
            >
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: radius.md,
    marginVertical: spacing.sm,
    padding: spacing.xs,
    borderWidth: 1,
    position: "absolute",
    top: "75%",
    zIndex: 100,
    left: 0,
    right: 0,
    paddingHorizontal: 10,
    paddingVertical: 5,
    boxShadow: "0px 0px 10px 2px rgba(0, 0, 0, 0.15)",
  },
  segment: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-start",
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.md,
    flexDirection: "row",
    gap: 5,
  },
});
