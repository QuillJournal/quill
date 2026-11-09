import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  LayoutChangeEvent,
  Platform,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";
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
  orientation?: "horizontal" | "vertical";
  style?: StyleProp<ViewStyle>;
  onSelect: (value: T) => void;
};
export default function SegmentedControl<T extends string>({
  options,
  selectedValue,
  orientation = "horizontal",
  style,
  onSelect,
}: SegmentedControlProps<T>) {
  const { colors } = useTheme();
  const [containerLength, setContainerLength] = useState(0);
  const isVertical = orientation == "vertical";
  const highlightLength = containerLength / options.length;
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
      transform: [
        isVertical
          ? { translateY: progress.value * highlightLength }
          : { translateX: progress.value * highlightLength },
      ],
    };
  });

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setContainerLength(isVertical ? height : width);
  };

  const highlightPill = (
    <Animated.View
      style={[
        {
          backgroundColor: colors.accentContainer,
          borderRadius: radius.md,
          position: "absolute",
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
        isVertical
          ? { top: 0, left: 0, right: 0, height: highlightLength }
          : { top: 0, bottom: 0, left: 0, width: highlightLength },
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
      style={[
        styles.container,
        style,
        {
          backgroundColor: colors.SegmentedControl,
          borderColor: colors.border,
          flexDirection: isVertical ? "column" : "row",
        },
      ]}
    >
      <View
        onLayout={onLayout}
        style={{ flexDirection: isVertical ? "column" : "row", flex: 1 }}
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
              style={[
                styles.segment,
                { justifyContent: isVertical ? "flex-start" : "center" },
              ]}
            >
              <Ionicons name={o.icon} size={16} color={colors.textMuted} />
              <Text
                style={{
                  color,
                  fontFamily: fonts.label,
                  fontSize: fontSizes.sm,
                }}
              >
                {o.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: radius.md,
    marginVertical: spacing.sm,
    borderWidth: 1,
    padding: 5,
  },
  segment: {
    flex: 1,
    alignItems: "center",
    paddingVertical: spacing.sm,
    flexDirection: "row",
    gap: 5,
    paddingHorizontal: 10,
  },
});
