import LottieView from "lottie-react-native";
import { useEffect, useRef } from "react";
import { Animated, Easing } from "react-native";
import { trampoline, trampolineBeats } from "../services/hapticPatterns";
import { playTimeline } from "../services/haptics";

const LOTTIE_FILE = require("@/assets/images/orgasm.lottie");
const LOTTIE_FPS = 30;
const LOTTIE_FRAMES = 165;
const LOOP_MS = (LOTTIE_FRAMES / LOTTIE_FPS) * 1000;

const AnimatedLottieView = Animated.createAnimatedComponent(LottieView);

type Props = { active?: boolean; size: number; haptics?: boolean };

export default function HapticLottie({ active = true, size, haptics = true }: Props) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!active) {
      progress.setValue(0);
      return;
    }

    let stopped = false;
    let anim: Animated.CompositeAnimation | null = null;
    let stopHaptics = () => {};

    const runLoop = () => {
      if (stopped) return;
      progress.setValue(0);
      stopHaptics();
      stopHaptics = haptics
        ? playTimeline(trampoline, trampolineBeats)
        : () => {};
      anim = Animated.timing(progress, {
        toValue: 1,
        duration: LOOP_MS,
        easing: Easing.linear,
        useNativeDriver: false,
      });
      anim.start(({ finished }) => {
        if (finished) runLoop();
      });
    };
    runLoop();

    return () => {
      stopped = true;
      anim?.stop();
      stopHaptics();
      progress.setValue(0);
    };
  }, [active, haptics, progress]);

  return (
    <AnimatedLottieView
      source={LOTTIE_FILE}
      progress={progress}
      style={{ width: size, height: size }}
    />
  );
}