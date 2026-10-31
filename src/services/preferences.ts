import * as ScreenCapture from "expo-screen-capture";
import * as SecureStore from "expo-secure-store";
import { useSyncExternalStore } from "react";
import { Appearance, Platform } from "react-native";
import { setHapticsEnabled } from "./haptics";

export type ThemePreference = "light" | "dark" | "system";
type Prefs = {
  haptics: boolean;
  theme: ThemePreference;
  privacyScreen: boolean;
};

const KEY = "quill.prefs";
const DEFAULTS: Prefs = {
  haptics: true,
  theme: "system",
  privacyScreen: false,
};

function load(): Prefs {
  try {
    const raw = SecureStore.getItem(KEY);
    if (!raw) return DEFAULTS;
    const p = JSON.parse(raw);
    return {
      haptics: typeof p.haptics === "boolean" ? p.haptics : DEFAULTS.haptics,
      theme:
        p.theme === "light" || p.theme === "dark" || p.theme === "system"
          ? p.theme
          : DEFAULTS.theme,
      privacyScreen:
        typeof p.privacyScreen === "boolean"
          ? p.privacyScreen
          : DEFAULTS.privacyScreen,
    };
  } catch {
    return DEFAULTS;
  }
}

const PRIVACY_KEY = "quill.privacy";
let privacyApplied = false;

const applyPrivacy = (on: boolean) => {
  if (on === privacyApplied) return;
  privacyApplied = on;
  if (on) {
    ScreenCapture.preventScreenCaptureAsync(PRIVACY_KEY).catch(() => {});

    if (Platform.OS === "ios")
      ScreenCapture.enableAppSwitcherProtectionAsync(1).catch(() => {});
  } else {
    ScreenCapture.allowScreenCaptureAsync(PRIVACY_KEY).catch(() => {});
    if (Platform.OS === "ios")
      ScreenCapture.disableAppSwitcherProtectionAsync().catch(() => {});
  }
};

const apply = (p: Prefs) => {
  applyPrivacy(p.privacyScreen);
  setHapticsEnabled(p.haptics);
  Appearance.setColorScheme(p.theme === "system" ? "unspecified" : p.theme);
};

let prefs = load();
apply(prefs);

const listeners = new Set<() => void>();
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function setPreference<K extends keyof Prefs>(key: K, value: Prefs[K]) {
  prefs = { ...prefs, [key]: value };
  apply(prefs);
  try {
    SecureStore.setItem(KEY, JSON.stringify(prefs));
  } catch {}
  listeners.forEach((l) => l());
}

export const usePreferences = () =>
  useSyncExternalStore(subscribe, () => prefs);
