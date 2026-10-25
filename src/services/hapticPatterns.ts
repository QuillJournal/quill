import { HapticEvent } from "@/modules/haptic-engine";

const t = (
  time: number,
  intensity: number,
  sharpness: number,
): HapticEvent => ({ type: "transient", time, intensity, sharpness });

export const expand = (ms: number): HapticEvent[] => {
  const d = ms / 1000;
  return [
    {
      type: "continuous",
      time: 0,
      duration: d * 0.85,
      intensity: 0.15,
      endIntensity: 0.6,
      sharpness: 0.2,
    },
    t(d, 1, 0.9),
  ];
};

export const celebrate: HapticEvent[] = [
  t(0, 1, 0.9),
  t(0.08, 0.7, 0.7),
  t(0.17, 0.45, 0.5),
  t(0.28, 0.25, 0.3),
  {
    type: "continuous",
    time: 0.05,
    duration: 0.3,
    intensity: 0.35,
    endIntensity: 0,
    sharpness: 0.15,
  },
];

export const confirm: HapticEvent[] = [t(0, 0.9, 0.9), t(0.075, 0.6, 0.6)];

export const select: HapticEvent[] = [t(0, 0.6, 0.7), t(0.06, 0.3, 0.4)];

export const collapse = (ms: number): HapticEvent[] => [
  {
    type: "continuous",
    time: 0,
    duration: ms / 1000,
    intensity: 0.5,
    endIntensity: 0,
    sharpness: 0.2,
  },
];

export const moodSelectPositive: HapticEvent[] = [
  t(0, 0.6, 0.8),
  t(0.07, 0.4, 0.7),
];

export const moodSelectNeutral: HapticEvent[] = [t(0, 0.5, 0.5)];

export const moodSelectNegative: HapticEvent[] = [
  {
    type: "continuous",
    time: 0,
    duration: 0.18,
    intensity: 0.45,
    endIntensity: 0.1,
    sharpness: 0.1,
  },
];

export const moodOpenPositive: HapticEvent[] = [
  t(0, 0.6, 0.85),
  t(0.09, 0.9, 0.9),
];

export const moodOpenNegative: HapticEvent[] = [
  {
    type: "continuous",
    time: 0,
    duration: 0.9,
    intensity: 0.5,
    endIntensity: 0,
    sharpness: 0.1,
  },
];
