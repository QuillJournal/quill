import * as SecureStore from "expo-secure-store";
import { useSyncExternalStore } from "react";
import { Appearance } from "react-native";
import { setHapticsEnabled } from "./haptics";

export type ThemePreference = "light" | "dark" | "system";
type Prefs = { haptics: boolean; theme: ThemePreference };

const KEY = "quill.prefs";
const DEFAULTS: Prefs = { haptics: true, theme: "system" };

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
    };
  } catch {
    return DEFAULTS;
  }
}

const apply = (p: Prefs) => {
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
