import { Ionicons } from "@expo/vector-icons";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import {
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { radius } from "../constants/radius";
import { spacing } from "../constants/spacings";
import { fonts, fontSizes } from "../constants/typography";
import useTheme from "../hooks/useTheme";
import { useSyncProgress } from "../services/syncEngine";

export const DecryptGateContext = createContext<{
    baseline: number | null;
    finish: () => void;
}>({ baseline: null, finish: () => {} });

const MIN_STEP_MS = 50;

const STEPS = [
    "Keys unlocked on this device",
    "Unlocking your diaries",
    "Decrypting your entries",
    "Finishing up...",
];

export default function DecryptingScreen() {
    const { colors } = useTheme();
    const { label, fraction, phase, runs } = useSyncProgress();
    const { baseline, finish } = useContext(DecryptGateContext);

    const livePhase = phase === "done" && runs <= (baseline ?? runs) ? "idle" : phase;
    const targetIndex =
    livePhase === "entries" ? 2 : livePhase === "invites" ? 3 : livePhase === "done" ? 4 : 1;

    const [activeIndex, setActiveIndex] = useState(0);
    const enteredAt = useRef(Date.now());
    useEffect(() => {
        if (activeIndex >= targetIndex) return;
        const wait = Math.max(0, MIN_STEP_MS - (Date.now() - enteredAt.current));
        const t = setTimeout(() => {
            enteredAt.current = Date.now();
            setActiveIndex((i) => i + 1);
        }, wait);
        return () => clearTimeout(t);
    }, [activeIndex, targetIndex]);

    useEffect(() => {
        if (activeIndex < STEPS.length) return;
        const t = setTimeout(finish, MIN_STEP_MS);
        return () => clearTimeout(t);
    }, [activeIndex, finish]);

    const peak = useRef(0);
    peak.current = Math.max(peak.current, Math.min(1, Math.max(0, fraction)));
    const progress = useSharedValue(0);
    useEffect(() => {
        progress.value = withTiming(peak.current, {
            duration: 300,
            easing: Easing.out(Easing.cubic),
        });
    }, [fraction]);
    const fillStyle = useAnimatedStyle(() => ({
        width: `${progress.value * 100}%`,
    }));

    return (
        <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
            <View style={styles.header}>
                <Ionicons name="lock-closed" size={32} color={colors.accent} />
                <Text style={[styles.title, { color: colors.text }]}>
                    Setting up your diaries
                </Text>
                <Text style={[styles.subtitle, { color: colors.textMuted }]}>
                    Everything is end-to-end encrypted. Decrypting on your device only.
                </Text>
            </View>

            <View style={styles.steps}>
                {STEPS.map((title, i) => {
                    const done = i < activeIndex;
                    const active = i === activeIndex;
                    return (
                                    <View key={title} style={styles.stepRow}>
              <View style={styles.stepIcon}>
                {done ? (
                  <Ionicons
                    name="checkmark-circle"
                    size={22}
                    color={colors.success}
                  />
                ) : active ? (
                  <ActivityIndicator size="small" color={colors.accent} />
                ) : (
                  <Ionicons
                    name="ellipse-outline"
                    size={22}
                    color={colors.border}
                  />
                )}
              </View>
              <View style={styles.stepText}>
                <Text
                  style={[
                    styles.stepTitle,
                    { color: done || active ? colors.text : colors.textMuted },
                  ]}
                >
                  {title}
                </Text>
                {active && i >= 2 && (
                  <Text style={[styles.stepDetail, { color: colors.textMuted }]}>
                    {label}
                  </Text>
                )}
              </View>
            </View>
                    );
                })}
            </View>
        </SafeAreaView>
    )
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFill,
    zIndex: 10,
    elevation: 10,
    justifyContent: "center",
    gap: spacing.lg,
    paddingHorizontal: spacing.xl,
  },
  header: { alignItems: "center", gap: spacing.sm },
  title: { fontFamily: fonts.heading, fontSize: fontSizes.xl, textAlign: "center" },
  subtitle: { fontFamily: fonts.body, fontSize: fontSizes.sm, textAlign: "center" },
  steps: { gap: spacing.md },
  stepRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md },
  stepIcon: { width: 24, height: 24, alignItems: "center", justifyContent: "center" },
  stepText: { flex: 1, gap: 2 },
  stepTitle: { fontFamily: fonts.label, fontSize: fontSizes.md },
  stepDetail: { fontFamily: fonts.body, fontSize: fontSizes.xs },
  track: { width: "100%", height: 8, borderRadius: radius.md, overflow: "hidden" },
  fill: { height: "100%" },
});