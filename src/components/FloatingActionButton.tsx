import { Ionicons } from "@expo/vector-icons";
import { Animated, Pressable, StyleSheet } from "react-native";
import usePressAnimation from "../hooks/usePressAnimation";
import useTheme from "../hooks/useTheme";

export default function FloatingActionButton({
  onPress,
  positioned = true,
}: {
  onPress: () => void;
  positioned?: boolean;
}) {
  const { colors } = useTheme();
  const { animatePress, animatedColor } = usePressAnimation(
    colors.accent,
    colors.accentPressed,
  );
  return (
    <Pressable
      style={[
        styles.fabContainer,
        !positioned && styles.inlineFabContainer,
      ]}
      onPress={onPress}
      onPressIn={() => animatePress(true)}
      onPressOut={() => animatePress(false)}
    >
      <Animated.View
        style={[
          styles.fab,
          { backgroundColor: animatedColor, shadowColor: colors.shadow },
        ]}
      >
        <Ionicons name="add" size={22} color={colors.textOnAccent} />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fabContainer: {
    position: "absolute",
    right: 24,
    bottom: 30,
    width: 54,
    height: 54,
  },
  inlineFabContainer: {
    position: "relative",
    right: 0,
    bottom: 0,
  },
  fab: {
    height: "100%",
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.5,
    elevation: 6,
  },
});
