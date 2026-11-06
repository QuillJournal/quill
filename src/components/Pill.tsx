import { Ionicons } from "@expo/vector-icons";
import { Animated, Pressable, StyleSheet, Text } from "react-native";
import { radius } from "../constants/radius";
import { spacing } from "../constants/spacings";
import usePressAnimation from "../hooks/usePressAnimation";
import useTheme from "../hooks/useTheme";

type PillProps = {
  text: string;
  isInteractive: boolean;
  selected?: boolean;
  onPress?: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  style: React.CSSProperties;
  children?: React.ReactNode;
};

export default function Pill({
  text,
  isInteractive,
  selected,
  onPress,
  icon,
  iconColor,
  style,
  children,
}: PillProps) {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const fromColor = selected ? colors.cardPressed : colors.surface;
  const toColor = selected ? colors.surface : colors.cardPressed;
  const { animatePress, animatedColor } = usePressAnimation(fromColor, toColor);

  return (
    <Pressable
      onPress={isInteractive ? onPress : undefined}
      onPressIn={() => isInteractive && animatePress(true)}
      onPressOut={() => isInteractive && animatePress(false)}
      disabled={!isInteractive}
      hitSlop={10}
    >
      <Animated.View
        style={[styles.container, { backgroundColor: animatedColor }, style]}
      >
        {icon && (
          <Ionicons
            size={18}
            name={icon}
            color={iconColor ?? colors.textMuted}
          />
        )}
        <Text style={styles.text}>{text}</Text>
        {children}
      </Animated.View>
    </Pressable>
  );
}

const getStyles = (colors: ReturnType<typeof useTheme>["colors"]) =>
  StyleSheet.create({
    container: {
      borderRadius: radius.md,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      justifyContent: "center",
      alignItems: "baseline",
      flexDirection: "row",
      gap: 10,
    },
    text: {
      color: colors.textMuted,
      fontWeight: 600,
    },
  });
