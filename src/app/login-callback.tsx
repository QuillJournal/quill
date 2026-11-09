import AnimatedMojiFace from "@/src/components/AnimatedMojiFace";
import Button from "@/src/components/Button";
import { diaryColors, moodColors } from "@/src/constants/colors";
import type { MoodKey } from "@/src/constants/moods";
import useTheme from "@/src/hooks/useTheme";
import { celebrate } from "@/src/services/hapticPatterns";
import { haptic, playTimeline } from "@/src/services/haptics";
import { clearAuthLinkResult, useAuthLinkResult } from "@/src/utils/auth";
import { supabase } from "@/src/utils/supabase";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, Text, useWindowDimensions, View } from "react-native";
import ConfettiCannon from "react-native-confetti-cannon";
import Animated, { FadeInDown, useReducedMotion } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

type Outcome =
  | { status: "checking" }
  | { status: "verified" }
  | { status: "already" }
  | { status: "error"; code: string | null };

const VIEW: Record<
  "verified" | "already" | "error",
  { mood: MoodKey; title: string; body: string; cta: string }
> = {
  verified: {
    mood: "awesome",
    title: "You're verified!",
    body: "Your email is confirmed. Sign in and start writing — your diary stays private, just for you and the people you choose.",
    cta: "Continue",
  },
  already: {
    mood: "happy",
    title: "Already verified",
    body: "This account is all set. Pick up right where you left off.",
    cta: "Continue",
  },
  error: {
    mood: "sad",
    title: "Link didn't work",
    body: "We couldn't verify this link.",
    cta: "Back to sign in",
  },
};

const ERROR_BODY: Record<string, string> = {
  otp_expired:
    "This verification link has expired, was already used, or its account no longer exists. Try signing in or create the account again.",
};

export default function LoginCallBack() {
  const { colors, isDark, spacing, fonts, fontSizes, lineHeights } = useTheme();
  const router = useRouter();
  const reduce = useReducedMotion();
  const { width } = useWindowDimensions();
  const link = useAuthLinkResult();
  const [outcome, setOutcome] = useState<Outcome>({ status: "checking" });
  const scheme = isDark ? "dark" : "light";

  useEffect(() => {
    let active = true;
    const resolve = async () => {
      if (link?.kind === "success") {
        setOutcome({ status: "verified" });
        return;
      }
      let confirmed = false;
      try {
        const { data } = await supabase.auth.getSession();
        confirmed = Boolean(data.session?.user.email_confirmed_at);
      } catch (e) {
        console.warn("Could not read session on verify callback:", e);
      }
      if (!active) return;
      setOutcome(
        confirmed
          ? { status: "already" }
          : { status: "error", code: link?.kind === "error" ? link.code : null },
      );
    };

    if (link?.kind === "pending") return;
    if (link) {
      void resolve();
      return () => {
        active = false;
      };
    }
    const id = setTimeout(() => void resolve(), 1200);
    return () => {
      active = false;
      clearTimeout(id);
    };
  }, [link]);

  useEffect(() => {
    if (outcome.status === "verified") {
      return playTimeline(celebrate, [
        [0, "rigid"],
        [70, "medium"],
        [150, "light"],
        [240, "soft"],
      ]);
    }
    if (outcome.status === "already") haptic.success();
    if (outcome.status === "error") haptic.error();
  }, [outcome.status]);

  if (outcome.status === "checking") {
    return <View style={[styles.fill, { backgroundColor: colors.background }]} />;
  }

  const view = VIEW[outcome.status];
  const body =
    outcome.status === "error" && outcome.code && ERROR_BODY[outcome.code]
      ? ERROR_BODY[outcome.code]
      : view.body;
  const halo = moodColors[view.mood][scheme];

  return (
    <SafeAreaView style={[styles.fill, { backgroundColor: colors.background }]}>
      {outcome.status === "verified" && !reduce && (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <ConfettiCannon
            count={150}
            origin={{ x: width / 2, y: -20 }}
            fallSpeed={3000}
            fadeOut
            autoStart
            colors={Object.values(diaryColors).map((c) => c[scheme])}
          />
        </View>
      )}

      <View style={[styles.center, { paddingHorizontal: spacing.xl, gap: spacing.lg }]}>
        <Animated.View
          entering={FadeInDown.springify().damping(12)}
          style={[styles.halo, { backgroundColor: `${halo}26` }]}
        >
          <AnimatedMojiFace mood={view.mood} size={128} intro introDelay={200} />
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(250).springify()}
          style={{ alignItems: "center", gap: spacing.sm }}
        >
          <Text
            style={{
              color: colors.text,
              fontFamily: fonts.heading,
              fontSize: fontSizes.xxxl,
              textAlign: "center",
            }}
          >
            {view.title}
          </Text>
          <Text
            style={{
              color: colors.textMuted,
              fontFamily: fonts.body,
              fontSize: fontSizes.md,
              lineHeight: fontSizes.md * lineHeights.normal,
              textAlign: "center",
            }}
          >
            {body}
          </Text>
        </Animated.View>
      </View>

      <Animated.View entering={FadeInDown.delay(450).springify()} style={{ padding: spacing.lg }}>
        <Button
          label={view.cta}
          onPress={async () => {
            const { data } = await supabase.auth.getSession();
            clearAuthLinkResult();
            if (!data.session) router.replace("/(auth)/login");
          }}
        />
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  halo: {
    width: 208,
    height: 208,
    borderRadius: 104,
    alignItems: "center",
    justifyContent: "center",
  },
});