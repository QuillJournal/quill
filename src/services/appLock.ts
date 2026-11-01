import { argon2id } from "@noble/hashes/argon2.js";
import * as Crypto from "expo-crypto";
import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";
import { useEffect, useState, useSyncExternalStore } from "react";
import { AppState, Platform } from "react-native";
import sodium from "react-native-libsodium";
import { bytesToHex, hexToBytes } from "../utils/crypto";

export type LockDelay = 0 | 15 | 30 | 60 | 300;
export type PinLength = 4 | 5 | 6;
export type PinResult = "ok" | "wrong" | "locked" | "exhausted";

type Config = {
  pinHash: string | null;
  pinSalt: string | null;
  pinLength: PinLength;
  biometrics: boolean;
  delay: LockDelay;
};
type Attempts = { failed: number; lockedUntil: number };
type Snapshot = { config: Config; attempts: Attempts; locked: boolean };

export const MAX_PIN_ATTEMPTS = 12;
const CONFIG_KEY = "quill.applock";
const ATTEMPTS_KEY = "quill.applock.attempts";
const STORE_OPTS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};
const DELAYS: readonly number[] = [0, 15, 30, 60, 300];
const EMPTY_CONFIG: Config = {
  pinHash: null,
  pinSalt: null,
  pinLength: 4,
  biometrics: false,
  delay: 0,
};
const EMPTY_ATTEMPTS: Attempts = { failed: 0, lockedUntil: 0 };

function readJson(key: string): any {
  try {
    const raw = SecureStore.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown) {
  try {
    SecureStore.setItem(key, JSON.stringify(value), STORE_OPTS);
  } catch (e) {
    console.warn("App lock persist failed:", e);
  }
}

function loadConfig(): Config {
  const p = readJson(CONFIG_KEY);
  if (!p) return EMPTY_CONFIG;
  const hasPin = typeof p.pinHash === "string" && typeof p.pinSalt === "string";
  return {
    pinHash: hasPin ? p.pinHash : null,
    pinSalt: hasPin ? p.pinSalt : null,
    pinLength: p.pinLength === 5 || p.pinLength === 6 ? p.pinLength : 4,
    biometrics: p.biometrics === true,
    delay: DELAYS.includes(p.delay) ? p.delay : 0,
  };
}

function loadAttempts(): Attempts {
  const p = readJson(ATTEMPTS_KEY);
  if (!p || typeof p.failed !== "number" || typeof p.lockedUntil !== "number")
    return EMPTY_ATTEMPTS;
  return { failed: p.failed, lockedUntil: p.lockedUntil };
}

const isEnabled = (c: Config) => c.pinHash !== null || c.biometrics;

let snap: Snapshot = (() => {
  const config = loadConfig();
  return { config, attempts: loadAttempts(), locked: isEnabled(config) };
})();

const listeners = new Set<() => void>();
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};

function commit(next: Partial<Snapshot>) {
  snap = { ...snap, ...next };
  listeners.forEach((l) => l());
}
function commitConfig(config: Config) {
  writeJson(CONFIG_KEY, config);
  commit({ config });
}
function commitAttempts(attempts: Attempts) {
  writeJson(ATTEMPTS_KEY, attempts);
  commit({ attempts });
}
function clearAttempts() {
  if (snap.attempts.failed > 0 || snap.attempts.lockedUntil > 0)
    commitAttempts(EMPTY_ATTEMPTS);
}
function unlocked() {
  clearAttempts();
  commit({ locked: false });
}

export const useAppLock = () => useSyncExternalStore(subscribe, () => snap);

async function hashPin(pin: string, saltHex: string): Promise<string> {
  const salt = hexToBytes(saltHex);
  let out: Uint8Array;
  try {
    await sodium.ready;
    out = sodium.crypto_pwhash(
      32,
      pin,
      salt,
      3,
      32 * 1024 * 1024,
      sodium.crypto_pwhash_ALG_ARGON2ID13 ?? 2,
    );
  } catch {
    out = argon2id(new TextEncoder().encode(pin), salt, {
      t: 3,
      m: 32768,
      p: 1,
      dkLen: 32,
    });
  }
  return bytesToHex(out);
}

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function checkPin(pin: string): Promise<boolean> {
  const { pinHash, pinSalt } = snap.config;
  if (!pinHash || !pinSalt) return false;
  return safeEqual(await hashPin(pin, pinSalt), pinHash);
}

let verifying = false;

export async function unlockWithPin(pin: string): Promise<PinResult> {
  if (verifying) return "wrong";
  if (snap.attempts.failed >= MAX_PIN_ATTEMPTS) return "exhausted";
  if (snap.attempts.lockedUntil > Date.now()) return "locked";
  verifying = true;
  try {
    const failed = snap.attempts.failed + 1;
    commitAttempts({ failed, lockedUntil: 0 });
    if (await checkPin(pin)) {
      unlocked();
      return "ok";
    }
    if (failed >= MAX_PIN_ATTEMPTS) return "exhausted";
    const wait = failed % 3 === 0 ? 30 * 2 ** (failed / 3 - 1) : 0;
    if (wait > 0) {
      commitAttempts({ failed, lockedUntil: Date.now() + wait * 1000 });
      return "locked";
    }
    return "wrong";
  } finally {
    verifying = false;
  }
}

export async function setPin(pin: string, length: PinLength): Promise<void> {
  const pinSalt = bytesToHex(Crypto.getRandomBytes(16));
  const pinHash = await hashPin(pin, pinSalt);
  commitConfig({ ...snap.config, pinHash, pinSalt, pinLength: length });
  clearAttempts();
}

export function removePin() {
  commitConfig({ ...snap.config, pinHash: null, pinSalt: null });
  clearAttempts();
}

export const setBiometrics = (on: boolean) =>
  commitConfig({ ...snap.config, biometrics: on });

export const setLockDelay = (delay: LockDelay) =>
  commitConfig({ ...snap.config, delay });

export function resetAppLock() {
  SecureStore.deleteItemAsync(CONFIG_KEY).catch(() => {});
  SecureStore.deleteItemAsync(ATTEMPTS_KEY).catch(() => {});
  commit({ config: EMPTY_CONFIG, attempts: EMPTY_ATTEMPTS, locked: false });
}

let suspendDepth = 0;
let backgroundedAt: number | null = null;

export async function runWithoutLocking<T>(fn: () => Promise<T>): Promise<T> {
  suspendDepth++;
  try {
    return await fn();
  } finally {
    setTimeout(() => {
      suspendDepth--;
    }, 500);
  }
}

AppState.addEventListener("change", (state) => {
  if (state === "background") {
    backgroundedAt = suspendDepth === 0 ? Date.now() : null;
    return;
  }
  if (state === "active") {
    const since = backgroundedAt;
    backgroundedAt = null;
    if (since === null || snap.locked || !isEnabled(snap.config)) return;
    if (Date.now() - since >= snap.config.delay * 1000)
      commit({ locked: true });
  }
});

export async function getBiometricInfo(): Promise<{
  available: boolean;
  label: string;
}> {
  try {
    const [hardware, enrolled, types] = await Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync(),
      LocalAuthentication.supportedAuthenticationTypesAsync(),
    ]);
    const face = types.includes(
      LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION,
    );
    const finger = types.includes(
      LocalAuthentication.AuthenticationType.FINGERPRINT,
    );
    const ios = Platform.OS === "ios";
    const label =
      face && finger
        ? "Biometrics"
        : face
          ? ios
            ? "Face ID"
            : "Face unlock"
          : finger
            ? ios
              ? "Touch ID"
              : "Fingerprint"
            : "Biometrics";
    return { available: hardware && enrolled, label };
  } catch {
    return { available: false, label: "Biometrics" };
  }
}

export function useBiometricInfo() {
  const [info, setInfo] = useState({ available: false, label: "Biometrics" });
  useEffect(() => {
    let cancelled = false;
    getBiometricInfo().then((i) => {
      if (!cancelled) setInfo(i);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return info;
}

export async function confirmBiometric(
  promptMessage: string,
): Promise<boolean> {
  const hasPin = snap.config.pinHash !== null;
  const res = await runWithoutLocking(() =>
    LocalAuthentication.authenticateAsync({
      promptMessage,
      cancelLabel: "Cancel",
      disableDeviceFallback: hasPin,
      fallbackLabel: hasPin ? "" : undefined,
    }),
  );
  return res.success;
}

export async function unlockWithBiometrics(): Promise<boolean> {
  if (!snap.config.biometrics) return false;
  const ok = await confirmBiometric("Unlock Quill");
  if (ok) unlocked();
  return ok;
}
