import * as engine from "@/modules/haptic-engine";
import { createAudioPlayer, setAudioModeAsync } from "expo-audio";
import { collapse, confirm, expand } from "./hapticPatterns";
import { haptic, isHapticsEnabled, play as playFallback } from "./haptics";

export const T = {
  slide: 160,
  flip: 280,
  hold: 60,
  grow: 340,
  settle: 80,
  reveal: 200,
  closeClick: 360,
} as const;

setAudioModeAsync({
  playsInSilentMode: false,
  interruptionMode: "mixWithOthers",
}).catch(() => {});

const players = {
  slide: createAudioPlayer(require("@/assets/sounds/slide.wav")),
  clickBack: createAudioPlayer(require("@/assets/sounds/click-back.wav")),
  thump: createAudioPlayer(require("@/assets/sounds/thump.wav")),
};

const sound = (k: keyof typeof players) => {
  try {
    players[k].seekTo(0);
    players[k].play();
  } catch {}
};

const tick = (
  events: Parameters<typeof engine.play>[0],
  fallback: () => void,
) => {
  if (!isHapticsEnabled()) return;
  return engine.isSupported() ? engine.play(events) : fallback();
};

export const fx = {
  openSlide: () => {
    sound("slide");
    tick(collapse(T.slide), haptic.soft);
  },
  land: () => {
    sound("thump");
    tick(confirm, () => playFallback("confirm"));
  },
  grow: () => tick(expand(T.grow), () => playFallback("expand")),
  shrink: () => tick(collapse(T.grow), haptic.soft),
  clickSound: () => sound("clickBack"),
  click: () => tick(confirm, () => playFallback("confirm")),
  cancel: engine.cancel,
};
