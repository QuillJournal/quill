import usePressAnimation from "@/src/hooks/usePressAnimation";
import useTheme from "@/src/hooks/useTheme";
import { Ionicons } from "@expo/vector-icons";
import { Animated, Pressable, StyleSheet } from "react-native";

type NavIconProps = {
  icon: keyof typeof Ionicons.glyphMap;
  iconSize?: number;
  onPress: () => void;
};

export default function NavButton({
  icon,
  iconSize = 20,
  onPress,
}: NavIconProps) {
  const { colors } = useTheme();
  const { animatePress, animatedColor } = usePressAnimation(
    colors.calendarBackground,
    colors.surface,
  );
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      onPressIn={() => animatePress(true)}
      onPressOut={() => animatePress(false)}
    >
      <Animated.View
        style={[{ backgroundColor: animatedColor }, styles.ionButton]}
      >
        <Ionicons name={icon} size={iconSize} color={colors.textMuted} />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  ionButton: { padding: 2, borderRadius: 999 },
});
