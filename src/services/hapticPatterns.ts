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

const FPS = 30;
const fr = (frame: number) => frame / FPS;

const c = (
  time: number,
  duration: number,
  intensity: number,
  endIntensity: number,
  sharpness: number,
): HapticEvent => ({
  type: "continuous",
  time,
  duration,
  intensity,
  endIntensity,
  sharpness,
});

const TRAMP_CYCLE = 55;
const TRAMP_JUMPS = [
  { touchdown: 10, bottom: 12, release: 15, apex: 27, launch: false },
  { touchdown: 37, bottom: 39, release: 42, apex: 54, launch: true },
];
const TRAMP_GAIN = [0.55, 0.8, 0.65, 0.9, 0.75, 1];

export const trampoline: HapticEvent[] = [0, 1, 2].flatMap((cycle) =>
  TRAMP_JUMPS.flatMap((j, k) => {
    const g = TRAMP_GAIN[cycle * 2 + k];
    const o = cycle * TRAMP_CYCLE;
    const td = fr(o + j.touchdown);
    const bt = fr(o + j.bottom);
    const rl = fr(o + j.release);
    const air = fr(j.apex - j.release);
    return [
      t(td, 0.45 * g, 0.35),
      c(td, bt - td, 0.25 * g, 0.7 * g, 0.1),
      t(bt, 0.8 * g, 0.15),
      c(bt, rl - bt, 0.7 * g, 0.9 * g, 0.1),
      t(rl, g, 1),
      c(rl, air, (j.launch ? 0.5 : 0.3) * g, 0, 0.45),
    ];
  }),
);

export const trampolineBeats: [
  ms: number,
  style: "light" | "medium" | "rigid",
][] = [0, 1, 2].flatMap((cycle) =>
  TRAMP_JUMPS.flatMap((j): [number, "light" | "medium" | "rigid"][] => {
    const o = cycle * TRAMP_CYCLE;
    return [
      [(fr(o + j.touchdown) * 1000) | 0, "light"],
      [(fr(o + j.bottom) * 1000) | 0, "medium"],
      [(fr(o + j.release) * 1000) | 0, "rigid"],
    ];
  }),
);
