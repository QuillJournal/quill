import AnimatedMojiFace from "@/src/components/AnimatedMojiFace";
import Button from "@/src/components/Button";
import { TUTORIAL_STEPS } from "@/src/constants/tutorial";
import useTheme from "@/src/hooks/useTheme";
import { moodHaptics } from "@/src/services/moodHaptics";
import { useEffect } from "react";
import { StyleSheet, Text, useWindowDimensions, View } from "react-native";
import Animated, {
    cancelAnimation,
    useAnimatedStyle,
    useReducedMotion,
    useSharedValue,
    withSpring,
} from "react-native-reanimated";

function Pip({ active, done}: { active: boolean; done: boolean }) {
    const { colors } = useTheme();
    const w = useSharedValue(6);
    useEffect(() => {
        w.value = withSpring(active ? 20 : 6, { damping: 14, stiffness: 200 });
    }, [active, w]);
    const style = useAnimatedStyle(() => ({ width: w.value }));
    return (
        <Animated.View
        style={[
            styles.pip,
            style,
            { backgroundColor: active || done ? colors.accent : colors.border },
        ]}
        />
    );
}

export default function TutorialTip({
    step,
    onSkip,
    onNext,
    nextLabel,
}: {
    step: number;
    onSkip: () => void;
    onNext?: () => void;
    nextLabel?: string;
}) {
    const { colors, spacing, fonts, fontSizes, lineHeights } = useTheme();
    const { width } = useWindowDimensions();
    const reduce = useReducedMotion();
    const s = TUTORIAL_STEPS[step];
    const enter = useSharedValue(reduce ? 1 : 0);

    useEffect(() => {
        if (!reduce) enter.value = withSpring(1, { damping: 14, stiffness: 160 });
        moodHaptics.onOpen(s.mood);
        return () => {
            cancelAnimation(enter);
            moodHaptics.cancel();
        };
    }, []);

    const card = useAnimatedStyle(() => ({
        opacity: enter.value,
        transform: [
            { translateY: (1 - enter.value) * 12 },
            { scale: 0.96 + 0.04 * enter.value },
        ],
    }));

    return (
        <Animated.View
        style={[
            {width: Math.min(320, width - spacing.lg * 2), padding: spacing.md, gap: spacing.md },
            card,
        ]}
        >
            <View style={[styles.row, { gap: spacing.md }]}>
                <AnimatedMojiFace mood={s.mood} size={56} intro introDelay={150} />
                <View style={{ flex: 1, gap: spacing.xs }}>
                    <View style={styles.pips}>
                        {TUTORIAL_STEPS.map((_, i) => (
                            <Pip key={i} active={i === step} done={i < step} />
                        ))}
                    </View>
                    <Text style={{ color: colors.text, fontFamily: fonts.heading, fontSize: fontSizes.lg }}>
                        {s.title}
                    </Text>
                </View>
            </View>
            <Text
            style={{
                color: colors.textMuted,
                fontFamily: fonts.body,
                fontSize: fontSizes.sm,
                lineHeight: fontSizes.sm * lineHeights.normal,
            }}
            >
                {s.body}
            </Text>
            <View style={[styles.row, { gap: spacing.sm, justifyContent: "flex-end" }]}>
                {step < TUTORIAL_STEPS.length - 1 && (
                    <Button
                    label="Skip all"
                    variant="outline"
                    size="sm"
                    onPress={onSkip}
                    style={{ width: "auto" }}
                    />
                )}
                {onNext && (
                    <Button
                    label={nextLabel ?? "Next"}
                    size="sm"
                    onPress={onNext}
                    style={{ width: "auto" }}
                    />
                )}
            </View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    row: {
        flexDirection: "row",
        alignItems: "center",
    },
    pips: {
        flexDirection: "row",
        gap: 4,
        alignItems: "center",
    },
    pip: {
        height: 6,
        borderRadius: 3,
    },
})