import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { Modal, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useUserSession } from "../context/UserSessionContext";
import useTheme from "../hooks/useTheme";
import {
    MAX_PIN_ATTEMPTS,
    resetAppLock,
    unlockWithBiometrics,
    unlockWithPin,
    useAppLock,
    useBiometricInfo,
} from "../services/appLock";
import { haptic } from "../services/haptics";
import { wipeLocalData } from "../services/localWipe";
import { clearDerivedKey } from "../services/storage/secureKeyStore";
import { signOut } from "../utils/auth";
import Button from "./Button";
import PinPad from "./PinPad";

export default function AppLockScreen() {
    const { colors } = useTheme();
    const { locked } = useAppLock();
    return (
        <>
        {locked && (
            <View
            style={[StyleSheet.absoluteFill, { backgroundColor: colors.background }]}
            />
        )}
        <Modal
        visible={locked}
        animationType="fade"
        statusBarTranslucent
        navigationBarTranslucent
        onRequestClose={() => {}}
        >
            <LockContent />
        </Modal>
            </>
    );
}

function LockContent() {
    const { colors, fonts, fontSizes, spacing } = useTheme();
    const insets = useSafeAreaInsets();
    const { clearSession } = useUserSession();
    const { config, attempts } = useAppLock();
    const bio = useBiometricInfo();

    const [pin, setPin] = useState("");
    const [busy, setBusy] = useState(false);
    const [wrong, setWrong] = useState(false);
    const [now, setNow] = useState(() => Date.now());
    const [confirmSignOut, setConfirmSignOut] = useState(false);
    const [signingOut, setSigningOut] = useState(false);

    const hasPin = config.pinHash !== null;
    const remaining = Math.max(0, Math.ceil((attempts.lockedUntil - now) / 1000));
    const coolingDown = remaining > 0;
    const attemptsLeft = MAX_PIN_ATTEMPTS - attempts.failed;

    const promptBiometric = () => {
        if (config.biometrics) unlockWithBiometrics().catch(() => {});
    };

    useEffect(() => {
        const t = setTimeout(promptBiometric, 350);
        return () => clearTimeout(t);
    }, []);

    useEffect(() => {
        if (attempts.lockedUntil <= Date.now()) return;
        setNow(Date.now());
        const id = setInterval(() => {
            const t = Date.now();
            setNow(t);
            if (t >= attempts.lockedUntil) clearInterval(id);
        }, 500);
        return () => clearInterval(id);
    }, [attempts.lockedUntil]);

    const forceSignOut = async () => {
        if (signingOut) return;
        setSigningOut(true);
        await clearDerivedKey().catch(() => {});
        clearSession();
        await signOut().catch(() => {});
        resetAppLock();
        await wipeLocalData().catch((e) =>
        console.error("Local wipe incomplete, will retry on next launch: ", e),
    );
    };

    // last wrong attempt. kill da app :fire: :hot_face:
    useEffect(() => {
        if (attempts.failed >= MAX_PIN_ATTEMPTS) forceSignOut();
    }, [attempts.failed]);

    useEffect(() => {
        if (!hasPin || pin.length !== config.pinLength || busy || coolingDown) return;
        (async () => {
            setBusy(true);
            const res = await unlockWithPin(pin);
            setBusy(false);
            if (res === "ok") return;
            haptic.error();
            setPin("");
            setWrong(true);
        })();
    }, [pin]);

    const message = coolingDown
    ? `Too many attempts. Try again in ${remaining}s.`
    : attempts.failed > 0
      ? `Wrong PIN. ${attemptsLeft} attempt${attemptsLeft === 1 ? "" : "s"} left before you're signed out.`
      : hasPin
        ? "Enter your PIN"
        : `Use ${bio.label} to continue`;
    const messageIsError = coolingDown || attempts.failed > 0;

    return (
        <View
        style={[
            styles.root,
            {
                backgroundColor: colors.background,
                paddingTop: insets.top + spacing.xl,
                paddingBottom: insets.bottom + spacing.lg,
                paddingHorizontal: spacing.lg,
            },
        ]}
        >
            <View style={[styles.header, { gap: spacing.sm }]}>
                <Ionicons name="lock-closed" size={36} color={colors.accent} />
                <Text
                style={{
                    color: colors.text,
                    fontFamily: fonts.heading,
                    fontSize: fontSizes.xl,
                }}
                >
                    Quill is locked
                </Text>
                <Text
                style={{
                    color: messageIsError ? colors.danger : colors.textMuted,
                    fontFamily: fonts.body,
                    fontSize: fontSizes.md,
                    textAlign: "center",
                }}
                >
                    {message}
                </Text>
            </View>

            {hasPin ? (
                <PinPad
                length={config.pinLength}
                value={pin}
                onChange={(v) => {
                    setWrong(false);
                    setPin(v);
                }}
                disabled={busy || coolingDown || signingOut}
                hasError={wrong}
                extraKeyIcon={
                    config.biometrics && bio.available
                     ? bio.label.startsWith("Face")
                       ? "scan-outline"
                       : "finger-print"
                    : undefined
                }
                onExtraKeyPress={promptBiometric}
                />
            ) : (
                <View style={styles.fullWidth}>
                    <Button label={`Unlock with ${bio.label}`} onPress={promptBiometric} />
                    </View>
            )}

            <View style={[styles.fullWidth, { gap: spacing.sm }]}>
                {confirmSignOut && (
                    <Text
                    style={{
                        color: colors.textMuted,
                        fontFamily: fonts.body,
                        fontSize: fontSizes.sm,
                        textAlign: "center",
                    }}
                    >
                        Signing out removes Quill's local data from this device. You'll need your password to sign back in.
                    </Text>
                )}
                <Button 
                size="sm"
                variant={confirmSignOut ? "danger" : "outline"}
                label={
                    confirmSignOut
                    ? "Tap again to sign out"
                    : hasPin
                      ? "Forgot PIN? Sign out"
                      : "Sign out"
                }
                loading={signingOut}
                onPress={() => (confirmSignOut ? forceSignOut() : setConfirmSignOut(true))}
                />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
        alignItems: "center",
        justifyContent: "space-between"
    },
    header: {
        alignItems: "center",
    },
    fullWidth: {
        width: "100%",
    },
})