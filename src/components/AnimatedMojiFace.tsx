import { moodColors } from "@/src/constants/colors";
import {
    FACE_PARAMS,
    faceGeometry,
    lerpParams,
    type FaceParams,
} from "@/src/constants/mojiFaces";
import { MOODS, type MoodKey, type MoodValence } from "@/src/constants/moods";
import useTheme from "@/src/hooks/useTheme";
import { useEffect, useRef } from "react";
import Animated, {
    cancelAnimation,
    Easing,
    interpolateColor,
    useAnimatedProps,
    useAnimatedStyle,
    useDerivedValue,
    useReducedMotion,
    useSharedValue,
    withDelay,
    withRepeat,
    withSequence,
    withSpring,
    withTiming,
} from "react-native-reanimated";
import Svg, { Circle, Ellipse, Path } from "react-native-svg";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedEllipse = Animated.createAnimatedComponent(Ellipse);
const AnimatedPath = Animated.createAnimatedComponent(Path);

const SPRING = { damping: 11, stiffness: 150, mass: 0.7 };
const BREATH_MS: Record<MoodValence, number> = {
    positive: 1300,
    neutral: 2000,
    negative: 3200,
};

const BOB: Record<MoodValence, number> = {
    positive: -0.03,
    neutral: 0,
    negative: 0.025,
};

type Props = {
    mood: MoodKey,
    size?: number,
    intro?: boolean,
    introDelay?: number;
};

export default function AnimatedMojiFace({
    mood,
    size = 40,
    intro = false,
    introDelay = 0,
}: Props) {
    const { colors, isDark } = useTheme();
    const reduce = useReducedMotion();
    const ink = colors.textOnAccent;
    const scheme = isDark ? "dark" : "light";
    const fill: string = moodColors[mood][scheme];
    const valence = MOODS[mood].valence;

    const startMood: MoodKey = intro ? "meh" : mood;
    const from = useSharedValue<FaceParams>(FACE_PARAMS[startMood]);
    const to = useSharedValue<FaceParams>(FACE_PARAMS[mood]);
    const fromFill = useSharedValue<string>(moodColors[startMood][scheme]);
    const toFill = useSharedValue<string>(fill);
    const progress = useSharedValue(intro ? 0 : 1);

    const blink = useSharedValue(0);
    const breath = useSharedValue(0);
    const pop = useSharedValue(1);

    const mounted = useRef(false);
    const lastMood = useRef<MoodKey>(mood);

    useEffect(() => {
        if (!mounted.current) return;

        if (lastMood.current === mood) {
            fromFill.value = fill;
            toFill.value = fill;
            return;
        }

        lastMood.current = mood;
        from.value = to.value;
        fromFill.value = toFill.value;
        to.value = FACE_PARAMS[mood];
        toFill.value = fill;

        progress.value = 0;
        if (reduce) {
            progress.value = 1;
            return;
        }
        progress.value = withSpring(1, SPRING);
        pop.value = withSequence(
            withTiming(1.2, { duration: 90 }),
            withSpring(1, { damping: 8, stiffness: 260 }),
        );
    }, [mood, fill]);

    useEffect(() => {
        mounted.current = true;
        if (!intro) return;
        progress.value = reduce
        ? 1
        : withDelay(introDelay, withSpring(1, SPRING));
    }, []);

    useEffect(() => {
        if (reduce) {
            blink.value = 0;
            return;
        }
        const wait = 1800 + Math.random() * 3200;
        blink.value = withRepeat(
            withSequence(
                withDelay(wait, withTiming(1, { duration: 80 })),
                withTiming(0, { duration: 120 }),
            ),
            -1
        );
        return () => cancelAnimation(blink);
    }, [reduce]);

    useEffect(() => {
        if (reduce) {
            breath.value = 0;
            return;
        }
        breath.value = withRepeat(
            withTiming(1, {
                duration: BREATH_MS[valence],
                easing: Easing.inOut(Easing.sin),
            }),
            -1,
            true,
        );
        return () => cancelAnimation(breath);
    }, [valence, reduce]);

    const geo = useDerivedValue(() =>
    faceGeometry(lerpParams(from.value, to.value, progress.value), blink.value),
);

const wrapStyle = useAnimatedStyle(() => ({
    transform: [
        { translateY: BOB[valence] * size * breath.value },
        { scale: (1 + 0.035 * breath.value) * pop.value },
    ],
}));

const circleProps = useAnimatedProps(() => ({
    fill: interpolateColor(
        progress.value,
        [0, 1],
        [fromFill.value, toFill.value],
    ),
}));
const leftBrowProps = useAnimatedProps(() => ({
    d: geo.value.leftBrow,
    opacity: geo.value.browOpacity,
}));
const rightBrowProps = useAnimatedProps(() => ({
    d: geo.value.rightBrow,
    opacity: geo.value.browOpacity,
}));
const eyeProps = useAnimatedProps(() => ({ ry: geo.value.eyeRy }));
const mouthProps = useAnimatedProps(() => ({ d: geo.value.mouth }));

return (
    <Animated.View
      accessible
      accessibilityRole="image"
      accessibilityLabel={`${MOODS[mood].label} face`}
      style={[{ width: size, height: size }, wrapStyle]}
    >
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <AnimatedCircle cx={50} cy={50} r={46} animatedProps={circleProps} />
        <AnimatedPath
          animatedProps={leftBrowProps}
          stroke={ink}
          strokeWidth={3.5}
          strokeLinecap="round"
          fill="none"
        />
        <AnimatedPath
          animatedProps={rightBrowProps}
          stroke={ink}
          strokeWidth={3.5}
          strokeLinecap="round"
          fill="none"
        />
        <AnimatedEllipse cx={35} cy={44} rx={5.2} animatedProps={eyeProps} fill={ink} />
        <AnimatedEllipse cx={65} cy={44} rx={5.2} animatedProps={eyeProps} fill={ink} />
        <AnimatedPath
          animatedProps={mouthProps}
          stroke={ink}
          strokeWidth={4}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill={ink}
        />
      </Svg>
    </Animated.View>
  );
}