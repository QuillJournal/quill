import Button from "@/src/components/Button";
import { dialog } from "@/src/components/Dialog/DialogProvider";
import FormField from "@/src/components/FormField";
import PasswordField from "@/src/components/PasswordField";
import { spacing } from "@/src/constants/spacings";
import { fonts, fontSizes } from "@/src/constants/typography";
import useTheme from "@/src/hooks/useTheme";
import { clearDerivedKey } from "@/src/services/storage/secureKeyStore";
import {
    getAuthLinkError,
    getUserProfileRecord,
    rewrapKeysRpc,
    setRecoveryMode,
    signOut,
} from "@/src/utils/auth";
import {
    decryptKeyBundle,
    deriveAuthAndEncKeys,
    parseRecoveryKey,
    wrapKeyBundles,
    type UserSecretKeyBundle,
} from "@/src/utils/crypto";
import { validatePassword } from "@/src/utils/passwordPolicy";
import { supabase } from "@/src/utils/supabase";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";

type Phase = "checking" | "ready" | "invalid";

export default function ResetPassword() {
    const { colors } = useTheme();
    const router = useRouter();

    const [phase, setPhase] = useState<Phase>("checking");
    const [userId, setUserId] = useState("");
    const [email, setEmail] = useState("");
    const [recoveryKeyInput, setRecoveryKeyInput] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);

    const pendingBundle = useRef<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        const accept = (session: { user: { id: string; email?: string }}) => {
            if (cancelled) return;
            setUserId(session.user.id);
            setEmail(session.user.email ?? "");
            setPhase("ready");
        };
        supabase.auth.getSession().then(({ data }) => {
            if (data.session) accept(data.session);
        });
        const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session) accept(session);
        });
        const timeout = setTimeout(() => {
            if (!cancelled) setPhase((p) => (p === "checking" ? "invalid" : p));
        }, 8000);
        return () => {
            cancelled = true;
            sub.subscription.unsubscribe();
            clearTimeout(timeout);
        };
    }, []);

    async function exitRecovery() {
        await clearDerivedKey().catch(() => {});
        await signOut().catch(() => supabase.auth.signOut({ scope: "local" }));
        setRecoveryMode(false);
        router.replace("/(auth)/login");
    }

    async function handleReset() {
        if (password !== confirmPassword) {
            dialog.alert("Incorrect passwords", "The new and confirm password you've entered do not match.");
            return;
        }
        if (loading) return;
        if (!recoveryKeyInput.trim() || !password) {
            dialog.alert("Missing details", "Enter your recovery key and a new password.");
            return;
        }
        const check = validatePassword(password, [email]);
        if (!check.ok) {
            dialog.alert("Choose a stronger password", check.message);
            return;
        }

        setLoading(true);
        try {
            if (pendingBundle.current === null) {
                const recKeyBytes = parseRecoveryKey(recoveryKeyInput.trim());
                const profile = await getUserProfileRecord(userId);
                if (!profile.recovery_key_bundle) {
                    throw new Error("No recovery key is registered for this account.");
                }

                let bundle: UserSecretKeyBundle;
                try {
                    bundle = decryptKeyBundle(profile.recovery_key_bundle, recKeyBytes);
                } catch {
                    throw new Error("That recovery key doesn't match this account.");
                }

                const {authSecret, localEncKey} = await deriveAuthAndEncKeys(
                    password,
                    email,
                );
                const { encryptedKeyBundle } = wrapKeyBundles(
                    bundle,
                    localEncKey,
                    recKeyBytes,
                );

                const { error } = await supabase.auth.updateUser({ password: authSecret });
                if (error) throw error;
                pendingBundle.current = encryptedKeyBundle;
            }

            await rewrapKeysRpc({ encryptedKeyBundle: pendingBundle.current });

            await exitRecovery();
            dialog.alert("Password updated", "You can now sign in with your new password.");
        } catch (err: any) {
            const retryHint =
            pendingBundle.current !== null
              ? "\n\nYour password was changed but your keys were not re-wrapped yet. Tap again to retry; do not leave this screen."
              : "";
        dialog.alert(
            "Reset failed",
            `${err?.message || "Something went wrong."}${retryHint}`,
        );
        } finally {
            setLoading(false);
        }
    }

    if (phase !== "ready") {
        return (
            <View style={[styles.screen, styles.center, { backgroundColor: colors.background }]}>
                <Text style={[styles.title, { color: colors.text }]}>
                    {phase === "checking" ? "Verifying link..." : "Link invalid or expired"}
                </Text>
                {phase === "invalid" && (
                    <>
                    <Text style={[styles.subtitle, { color: colors.textMuted }]}>
                        {getAuthLinkError() ?? "Request a new reset email from the sign-in screen."}
                    </Text>
                    <Button label="Back to sign in" variant="primary" onPress={exitRecovery} />
                    </>
                )}
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={[styles.screen, { backgroundColor: colors.background }]}
        >
            <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            >
                <Text style={[styles.title, { color: colors.text }]}>Reset password</Text>
                <Text style={[styles.subtitle, { color: colors.textMuted }]}>
                    Your diaries are end-to-end encrypted, so the email link alone can't unlock them. Enter the recovery key you saved when you signed up. Without it, your encrypted data can't be recovered.
                </Text>

                <View style={styles.form}>
                    <FormField
                    label="RECOVERY KEY"
                    value={recoveryKeyInput}
                    onChangeText={setRecoveryKeyInput}
                    placeholder="XXXX-XXXX-XXXX-..."
                    autoCapitalize="characters"
                    />
                    <PasswordField label="NEW PASSWORD" password={password} onChangePassword={setPassword} />
                    <PasswordField label="CONFIRM PASSWORD" password={confirmPassword} onChangePassword={setConfirmPassword} />
                    <Button
                    label="Reset password"
                    variant="primary"
                    onPress={handleReset}
                    loading={loading}
                    />
                    <Button
                    label="Cancel"
                    variant="outline"
                    onPress={exitRecovery}
                    disabled={loading || pendingBundle.current !== null}
                    />
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
    },
    center: {
        justifyContent: "center",
        paddingHorizontal: spacing.lg,
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.xxl,
        paddingBottom: spacing.xl,
        justifyContent: "center",
    },
    title: {
        fontSize: fontSizes.xl,
        fontFamily: fonts.heading,
        fontWeight: "700",
        marginBottom: spacing.xs,
    },
    subtitle: {
        fontSize: fontSizes.sm,
        fontFamily: fonts.body,
        lineHeight: 20,
        marginBottom: spacing.lg,
    },
    form: {
        gap: spacing.sm,
    },
})