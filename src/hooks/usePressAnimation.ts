import { useRef } from "react";
import { Animated } from "react-native";

export default function usePressAnimation(
  fromColor: string,
  toColor: string,
  delay: number = 0,
) {
  const pressProgress = useRef(new Animated.Value(0)).current;
  const animatePress = (pressed: boolean) =>
    Animated.timing(pressProgress, {
      toValue: pressed ? 1 : 0,
      duration: 200,
      delay: delay,
      useNativeDriver: true,
    }).start();
  const animatedColor = pressProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [fromColor, toColor],
  });
  return { animatePress, animatedColor };
}
