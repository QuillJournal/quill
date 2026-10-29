import { EXPRESSIVE } from "@/src/constants/mojiFaces";
import { MOOD_KEYS, MOODS, type MoodKey } from "@/src/constants/moods";
import { fonts, fontSizes } from "@/src/constants/typography";
import useTheme from "@/src/hooks/useTheme";
import { haptic } from "@/src/services/haptics";
import { moodHaptics } from "@/src/services/moodHaptics";
import { useEffect, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import AnimatedMojiFace from "./AnimatedMojiFace";
import MojiFace from "./MojiFace";
import PressableScale from "./PressableScale";
import AppModal from "./ui/AppModal";

type Props = {
  isOpen: boolean;
  value: MoodKey | null;
  onSelect: (mood: MoodKey | null) => void;
  onClose: () => void;
};

// Matched to each expression's exact keyframe cycle in AnimatedMojiFace.tsx
const EXPRESSION_DURATION_MS: Record<string, number> = {
  happy: 950,     // Fast double-bounce (180+240+150+200 = 770ms)
  anxious: 1450,  // Rapid shake + sweat drop (100+1300 = 1400ms)
  meh: 1750,      // Look left -> look right -> center
  sad: 1800,      // Sad brow + full tear drop fall (350+1400 = 1750ms)
  awesome: 2000,  // Full star-beam cycle (1100+1100 = 2200ms)
  angry: 2200,    // Build (900) + Hold (700) + Release (600) = 2200ms
  calm: 2200,     // Slow peaceful zen breath
  none: 1000,
};

const FADE_IN_MS = 220;
const FADE_OUT_MS = 260;

export default function MoodPicker({ isOpen, value, onSelect, onClose }: Props) {
  const { colors } = useTheme();
  const styles = getStyles(colors);

  const [burstMood, setBurstMood] = useState<MoodKey | null>(null);
  const burstOpacity = useRef(new Animated.Value(0)).current;
  const burstScale = useRef(new Animated.Value(0.75)).current;

  useEffect(() => {
    if (!burstMood) return;

    burstOpacity.setValue(0);
    burstScale.setValue(0.75);

    const exprKind = EXPRESSIVE[burstMood] ?? "none";
    const holdDuration = EXPRESSION_DURATION_MS[exprKind] ?? 1200;

    const anim = Animated.sequence([
      // 1. Smoothly fade & scale in right as the sheet starts closing
      Animated.parallel([
        Animated.timing(burstOpacity, {
          toValue: 1,
          duration: FADE_IN_MS,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.spring(burstScale, {
          toValue: 1,
          damping: 14,
          stiffness: 180,
          useNativeDriver: true,
        }),
      ]),
      // 2. Hold for the exact duration of this mood's animation
      Animated.delay(holdDuration),
      // 3. Fade & scale out quickly
      Animated.parallel([
        Animated.timing(burstOpacity, {
          toValue: 0,
          duration: FADE_OUT_MS,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(burstScale, {
          toValue: 1.15,
          duration: FADE_OUT_MS,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    ]);

    anim.start(({ finished }) => {
      if (finished) {
        setBurstMood(null);
      }
    });

    return () => anim.stop();
  }, [burstMood]);

  const handlePick = (key: MoodKey) => {
    const isClearing = value === key;
    if (isClearing) {
      haptic.tap();
      onSelect(null);
      onClose();
    } else {
      moodHaptics.onSelect(key);
      onSelect(key);
      setBurstMood(key);
      onClose();
    }
  };

  return (
    <AppModal
      title="How are you feeling?"
      isOpen={isOpen}
      onClose={onClose}
      keepMounted={burstMood !== null}
      overlay={
        burstMood ? (
          <View style={styles.burstOverlay} pointerEvents="none">
            <Animated.View
              style={[
                styles.burstCard,
                {
                  opacity: burstOpacity,
                  transform: [{ scale: burstScale }],
                },
              ]}
            >
              <AnimatedMojiFace
                key={burstMood}
                mood={burstMood}
                size={148}
                intro
                startDelay={0}
              />
            </Animated.View>
          </View>
        ) : null
      }
    >
      <View style={styles.grid}>
        {MOOD_KEYS.map((key) => {
          const selected = value === key;
          return (
            <PressableScale
              key={key}
              onPress={() => handlePick(key)}
              accessibilityRole="button"
              accessibilityLabel={MOODS[key].label}
              accessibilityState={{ selected }}
              style={styles.item}
            >
              <View style={[styles.ring, selected && styles.ringSelected]}>
                {selected ? (
                  <AnimatedMojiFace mood={key} size={52} startDelay={0} />
                ) : (
                  <MojiFace mood={key} size={52} animated={false} />
                )}
              </View>
              <Text style={[styles.label, selected && styles.labelSelected]}>
                {MOODS[key].label}
              </Text>
            </PressableScale>
          );
        })}
      </View>
      <Text style={styles.hint}>
        Your mood will be visible to everyone in the diary. Tap on a selected
        mood to clear it.
      </Text>
    </AppModal>
  );
}

const getStyles = (colors: ReturnType<typeof useTheme>["colors"]) =>
  StyleSheet.create({
    grid: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "center",
      gap: 16,
      paddingVertical: 8,
    },
    item: {
      width: 76,
      alignItems: "center",
      gap: 6,
    },
    ring: {
      padding: 4,
      borderRadius: 999,
      borderWidth: 2,
      borderColor: "transparent",
    },
    ringSelected: {
      borderColor: colors.accent,
    },
    label: {
      fontFamily: fonts.label,
      fontSize: fontSizes.xs,
      color: colors.textMuted,
    },
    labelSelected: {
      color: colors.text,
    },
    hint: {
      fontFamily: fonts.body,
      fontSize: fontSizes.xs,
      color: colors.textMuted,
      textAlign: "center",
      marginTop: 12,
      marginBottom: 8,
    },
    burstOverlay: {
      ...StyleSheet.absoluteFill,
      alignItems: "center",
      justifyContent: "center",
    },
    burstCard: {
      alignItems: "center",
      justifyContent: "center",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.22,
      shadowRadius: 20,
      elevation: 10,
    },
  });