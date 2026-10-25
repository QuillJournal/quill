import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

let enabled = true;
let last = 0;
export const setHapticsEnabled = (v: boolean) => {
  enabled = v;
};

const fire = (fn: () => Promise<void>) => {
  const now = Date.now();
  if (!enabled || Platform.OS === "web" || now - last < 60) return;
  last = now;
  fn().catch(() => {});
};

export const haptic = {
  tap: () => fire(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  soft: () => fire(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft)),
  press: () =>
    fire(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
  thud: () =>
    fire(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid)),
  select: () => fire(() => Haptics.selectionAsync()),
  success: () =>
    fire(() =>
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
    ),
  warning: () =>
    fire(() =>
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning),
    ),
  error: () =>
    fire(() =>
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error),
    ),
};

type Style = "soft" | "light" | "medium" | "rigid";
type Beat = [atMs: number, style: Style];

const STYLE: Record<Style, Haptics.ImpactFeedbackStyle> = {
  soft: Haptics.ImpactFeedbackStyle.Soft,
  light: Haptics.ImpactFeedbackStyle.Light,
  medium: Haptics.ImpactFeedbackStyle.Medium,
  rigid: Haptics.ImpactFeedbackStyle.Rigid,
};

const PATTERNS: Record<string, Beat[]> = {
  celebrate: [
    [0, "rigid"],
    [70, "medium"],
    [150, "light"],
    [240, "soft"],
  ],
  expand: [
    [0, "soft"],
    [90, "soft"],
    [160, "light"],
    [220, "medium"],
    [270, "rigid"],
  ],
  confirm: [
    [0, "rigid"],
    [75, "medium"],
  ],
  moodSelectPositive: [
    [0, "light"],
    [70, "light"],
  ],
  moodSelectNeutral: [[0, "light"]],
  moodSelectNegative: [[0, "soft"]],
  moodOpenPositive: [
    [0, "light"],
    [90, "medium"],
  ],
  moodOpenNegative: [
    [0, "soft"],
    [170, "soft"],
    [360, "soft"],
  ],
};

export function play(name: keyof typeof PATTERNS) {
  if (!enabled || Platform.OS === "web") return () => {};
  const timers = PATTERNS[name].map(([t, s]) =>
    setTimeout(() => Haptics.impactAsync(STYLE[s]).catch(() => {}), t),
  );
  return () => timers.forEach(clearTimeout); // cancel if the animation is interrupted
}

export const isHapticsEnabled = () => enabled;
