import { moodColors } from "@/src/constants/colors";
import {
  applyExpression,
  expressionExtras,
  EXPRESSIVE,
  FACE_PARAMS,
  faceGeometry,
  lerpParams,
  type ExpressionKind,
  type FaceParams,
} from "@/src/constants/mojiFaces";
import { MOODS, type MoodKey } from "@/src/constants/moods";
import useTheme from "@/src/hooks/useTheme";
import { useEffect, useRef } from "react";
import { View } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  interpolateColor,
  useAnimatedProps,
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
const ANGRY_BUILD_MS = 900;
const ANGRY_HOLD_MS = 700;
const ANGRY_RELEASE_MS = 600;
const ANGRY_REST_MS = 500;
const SHAKE_MS = 45;

type Props = {
  mood: MoodKey;
  size?: number;
  intro?: boolean;
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

  const startMood: MoodKey = intro ? "meh" : mood;
  const from = useSharedValue<FaceParams>(FACE_PARAMS[startMood]);
  const to = useSharedValue<FaceParams>(FACE_PARAMS[mood]);
  const fromFill = useSharedValue<string>(moodColors[startMood][scheme]);
  const toFill = useSharedValue<string>(fill);
  const progress = useSharedValue(intro ? 0 : 1);

  const exprKind = useSharedValue<ExpressionKind>(EXPRESSIVE[mood] ?? "none");
  const expr = useSharedValue(0);
  const shake = useSharedValue(0);
  const drop = useSharedValue(0);

  const blink = useSharedValue(0);

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
    progress.value = reduce ? 1 : withSpring(1, SPRING);
  }, [mood, fill]);

  useEffect(() => {
    mounted.current = true;
    if (!intro) return;
    progress.value = reduce
      ? 1
      : withDelay(introDelay, withSpring(1, SPRING));
  }, []);

  useEffect(() => {
    const kind = EXPRESSIVE[mood] ?? "none";
    cancelAnimation(expr);
    cancelAnimation(shake);
    cancelAnimation(drop);
    expr.value = 0;
    shake.value = 0;
    drop.value = 0;
    exprKind.value = reduce ? "none" : kind;
    if (reduce || kind === "none") return;

    const startDelay = Math.random() * 1200;
    const ease = Easing.inOut(Easing.sin);
    const loop = (...steps: number[]) =>
      withDelay(startDelay, withRepeat(withSequence(...steps), -1));

    if (kind === "awesome") {
      expr.value = loop(
        withTiming(1, { duration: 1100, easing: ease }),
        withTiming(0, { duration: 1100, easing: ease }),
        withTiming(0, { duration: 600 }),
      );
    }

    if (kind === "happy") {
      const up = Easing.out(Easing.quad);
      const down = Easing.in(Easing.quad);
      expr.value = loop(
        withTiming(1, { duration: 180, easing: up }),
        withTiming(0, { duration: 240, easing: down }),
        withTiming(0.55, { duration: 150, easing: up }),
        withTiming(0, { duration: 200, easing: down }),
        withTiming(0, { duration: 1300 }),
      );
    }

    if (kind === "calm") {
      expr.value = loop(
        withTiming(1, { duration: 2400, easing: ease }),
        withTiming(0, { duration: 2400, easing: ease }),
      );
    }

    if (kind === "meh") {
      expr.value = 0.5;
      expr.value = loop(
        withTiming(0, { duration: 350, easing: ease }),
        withTiming(0, { duration: 700 }),
        withTiming(1, { duration: 600, easing: ease }),
        withTiming(1, { duration: 700 }),
        withTiming(0.5, { duration: 350, easing: ease }),
        withTiming(0.5, { duration: 1800 }),
      );
    }

    if (kind === "sad") {
      expr.value = loop(
        withTiming(1, { duration: 1600, easing: ease }),
        withTiming(1, { duration: 1400 }),
        withTiming(0.2, { duration: 1300, easing: ease }),
        withTiming(0.2, { duration: 500 }),
      );
      drop.value = withDelay(
        startDelay + 1900,
        withRepeat(
          withSequence(
            withTiming(1, { duration: 1400, easing: Easing.in(Easing.quad) }),
            withTiming(0, { duration: 0 }),
            withTiming(0, { duration: 3400 }),
          ),
          -1,
        ),
      );
    }

    if (kind === "anxious") {
      expr.value = loop(
        withTiming(1, { duration: 220 }),
        withTiming(0.45, { duration: 260 }),
        withTiming(1, { duration: 220 }),
        withTiming(0.45, { duration: 380 }),
        withTiming(0, { duration: 320 }),
        withTiming(0, { duration: 1100 }),
      );
      shake.value = withRepeat(withTiming(1, { duration: 40 }), -1, true);
      drop.value = withDelay(
        startDelay + 300,
        withRepeat(
          withSequence(
            withTiming(1, { duration: 1300, easing: Easing.in(Easing.quad) }),
            withTiming(0, { duration: 0 }),
            withTiming(0, { duration: 1200 }),
          ),
          -1
        ),
      );
    }

    if (kind === "angry") {
      expr.value = withDelay(
        startDelay,
        withRepeat(
          withSequence(
            withTiming(1, {
              duration: ANGRY_BUILD_MS,
              easing: Easing.in(Easing.quad),
            }),
            withTiming(1, { duration: ANGRY_HOLD_MS }),
            withTiming(0.15, {
              duration: ANGRY_RELEASE_MS,
              easing: Easing.out(Easing.quad),
            }),
            withTiming(0.15, { duration: ANGRY_REST_MS }),
          ),
          -1,
        ),
      );
      shake.value = withRepeat(withTiming(1, { duration: SHAKE_MS }), -1, true);
    }

    return () => {
      cancelAnimation(expr);
      cancelAnimation(shake);
      cancelAnimation(drop);
    };
  }, [mood, reduce]);

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
      -1,
    );
    return () => cancelAnimation(blink);
  }, [reduce]);

  const geo = useDerivedValue(() => {
    const base = lerpParams(from.value, to.value, progress.value);
    const w = Math.min(1, Math.max(0, progress.value));
    const s = shake.value * 2 - 1;
    const p = applyExpression(base, exprKind.value, expr.value, s, w);
    const x = expressionExtras(exprKind.value, expr.value, s, drop.value, w);
    return faceGeometry(p, blink.value, x);
  });

  const circleProps = useAnimatedProps(() => ({
    cx: geo.value.faceCx,
    cy: geo.value.faceCy,
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
  
  const leftEyeProps = useAnimatedProps(() => ({
    cx: geo.value.eyeLx,
    cy: geo.value.eyeCy,
    ry: geo.value.eyeRy,
  }));
  const rightEyeProps = useAnimatedProps(() => ({
    cx: geo.value.eyeRx,
    cy: geo.value.eyeCy,
    ry: geo.value.eyeRy,
  }));
  const dropProps = useAnimatedProps(() => ({
    cx: geo.value.dropCx,
    cy: geo.value.dropCy,
    opacity: geo.value.dropOpacity,
  }));

  const mouthProps = useAnimatedProps(() => ({ d: geo.value.mouth }));

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={`${MOODS[mood].label} face`}
      style={{ width: size, height: size }}
    >
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <AnimatedCircle r={46} animatedProps={circleProps} />
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
        <AnimatedEllipse rx={5.2} animatedProps={leftEyeProps} fill={ink} />
        <AnimatedEllipse rx={5.2} animatedProps={rightEyeProps} fill={ink} />
        <AnimatedEllipse rx={2.6} ry={3.6} animatedProps={dropProps} fill={ink} />
        <AnimatedPath
          animatedProps={mouthProps}
          stroke={ink}
          strokeWidth={4}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill={ink}
        />
      </Svg>
    </View>
  );
}