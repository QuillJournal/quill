import type { HapticEvent } from "@/modules/haptic-engine";
import * as engine from "@/modules/haptic-engine";
import { Platform } from "react-native";
import {
    isMoodKey,
    MOODS,
    type MoodKey,
    type MoodValence,
} from "../constants/moods";
import {
    moodOpenNegative,
    moodOpenPositive,
    moodSelectNegative,
    moodSelectNeutral,
    moodSelectPositive,
} from "./hapticPatterns";
import { isHapticsEnabled, play as playFallback } from "./haptics";

type Pattern = {
  events: HapticEvent[];
  fallback: string;
  ms: number;
};

const SELECT: Record<MoodValence, Pattern> = {
  positive: {
    events: moodSelectPositive,
    fallback: "moodSelectPositive",
    ms: 150,
  },
  neutral: {
    events: moodSelectNeutral,
    fallback: "moodSelectNeutral",
    ms: 100,
  },
  negative: {
    events: moodSelectNegative,
    fallback: "moodSelectNegative",
    ms: 200,
  },
};

const OPEN: Record<MoodValence, Pattern | null> = {
  positive: { events: moodOpenPositive, fallback: "moodOpenPositive", ms: 200 },
  neutral: null,
  negative: { events: moodOpenNegative, fallback: "moodOpenNegative", ms: 950 },
};

let cancelFallback: () => void = () => {};
let activeUntil = 0;

const run = (p: Pattern) => {
  if (!isHapticsEnabled() || Platform.OS === "web") return;
  try {
    cancel();
    activeUntil = Date.now() + p.ms;
    if (engine.isSupported()) {
      engine.play(p.events);
    } else {
      cancelFallback = playFallback(p.fallback);
    }
  } catch {
    // yo twin
    // whaddup twin
    // why "maybe in another life"? why not this one? what if you wanted this opportunity or knew this person in a past life, and you just said "in another life"? what if this is the life where you claim that opportunity and do what your heart has been telling you to do?
  }
};

const cancel = () => {
  try {
    cancelFallback();
    cancelFallback = () => {};

    if (Date.now() < activeUntil && engine.isSupported()) engine.cancel();
    activeUntil = 0;
  } catch {}
};

export const moodHaptics = {
  onSelect: (mood: MoodKey) => {
    if (!isMoodKey(mood)) return;
    run(SELECT[MOODS[mood].valence]);
  },
  onOpen: (mood: unknown) => {
    if (!isMoodKey(mood)) return;
    const pattern = OPEN[MOODS[mood].valence];
    if (pattern) run(pattern);
  },
  cancel,
};
