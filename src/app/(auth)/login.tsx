import Button from "@/src/components/Button";
import { dialog } from "@/src/components/Dialog/DialogProvider";
import FormField from "@/src/components/FormField";
import PasswordField from "@/src/components/PasswordField";
import { radius } from "@/src/constants/radius";
import { spacing } from "@/src/constants/spacings";
import { fonts, fontSizes } from "@/src/constants/typography";
import { useUserSession } from "@/src/context/UserSessionContext";
import useTheme from "@/src/hooks/useTheme";
import { saveDerivedKey } from "@/src/services/storage/secureKeyStore";
import { SupabaseStorageAdapter } from "@/src/services/storage/SupabaseStorageAdapter";
import {
  checkUsernameAvailable,
  getUserProfileRecord,
  initKeysRpc,
  rewrapKeysRpc,
  sendPasswordResetEmail,
  signIn,
  signUp,
} from "@/src/utils/auth";
import {
  bytesToHex,
  decryptKeyBundle,
  decryptUserProfile,
  deriveAuthAndEncKeys,
  encryptUserProfile,
  generateDualSignKeyPair,
  generateHybridKemKeyPair,
  generateRecoveryKey,
  hexToBytes,
  parseRecoveryKey,
  signPublicBundle,
  UserSecretKeyBundle,
  wrapKeyBundles
} from "@/src/utils/crypto";
import { MIN_PASSWORD_LENGTH, validatePassword } from "@/src/utils/passwordPolicy";
import { downloadAndDecryptPhoto } from "@/src/utils/photoCrypto";
import { supabase } from "@/src/utils/supabase";
import * as Clipboard from 'expo-clipboard';
import { useRef, useState } from "react";
import {
  Animated,
  KeyboardAvoidingView,
  LayoutAnimation,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  View
} from "react-native";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function Auth() {
  const { colors } = useTheme();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [recoveryKeyInput, setRecoveryKeyInput] = useState("");
  const [isRecovering, setIsRecovering] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const { setSession } = useUserSession();

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const forgotAnim = useRef(new Animated.Value(isSignUp ? 0 : 1)).current;

  async function handleAuth() {
    if (!email.trim() || !password.trim()) {
      dialog.alert("Missing details", "Please fill in both email and password.");
      return;
    }

    if (isSignUp && !name.trim()) {
      dialog.alert("Missing details", "Please enter your name.");
      return;
    }

    setLoading(true);

    try {
      const cleanEmail = email.trim().toLowerCase();
      if (isSignUp) {
        const check = validatePassword(password, [cleanEmail, username, name]);
        if (!check.ok) {
          dialog.alert("Choose a stronger password", check.message);
          return;
        }
      }
      const { authSecret, localEncKey } = await deriveAuthAndEncKeys(password, cleanEmail);

      if (isSignUp) {
        const cleanUsername = username.trim().toLowerCase();
        if (!/^[a-z0-9_]{3,20}$/.test(cleanUsername)) {
          dialog.alert("Invalid Username", "Username must be 3-20 lowercase alphanumeric characters or underscores.");
          return;
        }

        const available = await checkUsernameAvailable(cleanUsername);
        if (!available) {
          dialog.alert("Unavailable", "That username is already taken. Please choose another.");
          return;
        }

        await saveDerivedKey(localEncKey);
        const encProfile = encryptUserProfile(
          { name: name.trim(), photoPath: null, photoNonce: null },
          localEncKey
        );

        const { session } = await signUp(cleanEmail, authSecret, {
          username: cleanUsername,
          encryptedProfile: encProfile.encryptedProfileHex,
          profileNonce: encProfile.profileNonceHex,
        });

        if (!session) {
          dialog.alert("Check your inbox", "We sent a verification link to your email.");
        }
      } else {
        const authData = await signIn(cleanEmail, authSecret);
        const user = authData?.user;
        if (!user) throw new Error("Could not retreive user session.");

        await saveDerivedKey(localEncKey);
        const profile = await getUserProfileRecord(user.id);
        const decryptedProfile = decryptUserProfile(
          profile.encrypted_profile,
          profile.profile_nonce,
          localEncKey,
        );

        let kemKeys: { x25519Priv: Uint8Array; mlkem768Priv: Uint8Array; publicKeyHex: string };
        let signKeys: { ed25519Priv: Uint8Array; mldsa65Priv: Uint8Array; publicKeyHex: string };

        if (!profile.keys_initialized_at) {
          const kemPair = generateHybridKemKeyPair();
          const signPair = generateDualSignKeyPair();
          const { rawKey: recKeyBytes, formattedKey: recKeyDisplay } = generateRecoveryKey();

          const kemPubHex = bytesToHex(kemPair.publicKeyBytes);
          const signPubHex = bytesToHex(signPair.publicKeyBytes);

          const bundleSigHex = signPublicBundle(
            user.id,
            kemPubHex,
            signPubHex,
            signPair.ed25519Priv,
            signPair.mldsa65Priv
          );

          const secretBundle: UserSecretKeyBundle = {
            kemX25519Priv: bytesToHex(kemPair.x25519Priv),
            kemMlkem768Priv: bytesToHex(kemPair.mlkem768Priv),
            signEd25519Priv: bytesToHex(signPair.ed25519Priv),
            signMldsa65Priv: bytesToHex(signPair.mldsa65Priv),
          };

          const { encryptedKeyBundle, recoveryKeyBundle } = wrapKeyBundles(
            secretBundle,
            localEncKey,
            recKeyBytes,
          );

          await initKeysRpc({
            kemPublicKey: kemPubHex,
            signPublicKey: signPubHex,
            bundleSignature: bundleSigHex,
            encryptedKeyBundle,
            recoveryKeyBundle,
          });

          dialog.alert(
            "Save your recovery key.",
            `Please, write this down and store it safely. It will NEVER be shown again:\n\n${recKeyDisplay}`,
            [
              {
                text: 'Copy to clipboard',
                style: 'default',
                onPress: async () => {
                Clipboard.setStringAsync(`${recKeyDisplay}`);
                }
              },
              {
                text: 'Close',
                style: 'cancel'
              }
            ]
          );

          kemKeys = {
            x25519Priv: kemPair.x25519Priv,
            mlkem768Priv: kemPair.mlkem768Priv,
            publicKeyHex: kemPubHex,
          };
          signKeys = {
            ed25519Priv: signPair.ed25519Priv,
            mldsa65Priv: signPair.mldsa65Priv,
            publicKeyHex: signPubHex,
          };
        } else {
          if (!profile.encrypted_key_bundle || !profile.kem_public_key || !profile.sign_public_key) {
            throw new Error("Corrupted cryptographics profile bundle.");
          }

          const bundle = decryptKeyBundle(profile.encrypted_key_bundle, localEncKey);
          kemKeys = {
            x25519Priv: hexToBytes(bundle.kemX25519Priv),
            mlkem768Priv: hexToBytes(bundle.kemMlkem768Priv),
            publicKeyHex: profile.kem_public_key,
          };
          signKeys = {
            ed25519Priv: hexToBytes(bundle.signEd25519Priv),
            mldsa65Priv: hexToBytes(bundle.signMldsa65Priv),
            publicKeyHex: profile.sign_public_key,
          };
        }

        let decryptedPhotoUri: string | null = null;
        if (decryptedProfile.photoPath && decryptedProfile.photoNonce) {
          try {
            decryptedPhotoUri = await downloadAndDecryptPhoto(
              decryptedProfile.photoPath,
              decryptedProfile.photoNonce,
              localEncKey,
              new SupabaseStorageAdapter("avatars")
            );
          } catch (e) {
            console.warn("Avatar decryption failed: ", e);
          }
        }

        setSession({
          userId: user.id,
          username: profile.username,
          email: user.email ?? cleanEmail,
          name: decryptedProfile.name,
          photoUri: decryptedPhotoUri,
          localEncKey,
          kemKeys,
          signKeys,
        });
      }
    } catch (err: any) {
      console.error("Auth Error:", err);
      dialog.alert(
        isSignUp ? "Sign Up Error" : "Login Error",
        err?.message || "Something went wrong.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword() {
    if (!email.trim()) {
      dialog.alert(
        "Enter your email",
        "Please enter your email address in the field above first, then tap Forgot Password.",
      );
      return;
    }

    setLoading(true);
    try {
      await sendPasswordResetEmail(email.trim());
      dialog.alert(
        "Check your inbox",
        "We've sent a password reset link to your email.",
      );
    } catch (err: any) {
      dialog.alert("Reset Error", err.message || "Failed to send reset email.");
    } finally {
      setLoading(false);
    }
  }
  async function handleCompleteRecovery() {
    if (!email.trim() || !password.trim() || !recoveryKeyInput.trim()) {
      dialog.alert("Missing details", "Please enter your email, new password, and recovery key.");
      return;
    }
    setLoading(true);
    try {
      const cleanEmail = email.trim().toLowerCase();
      const recKeyBytes = parseRecoveryKey(recoveryKeyInput.trim());

      const { authSecret: newAuthSecret, localEncKey: newLocalEncKey} =
      await deriveAuthAndEncKeys(password, cleanEmail);

      const profileRecord = await getUserProfileRecord(await supabase.auth.getUser() ? (await supabase.auth.getUser()).data.user!.id : "");
      if (!profileRecord.recovery_key_bundle) {
        throw new Error("No recovery bundle registered for this account.");
      }

      const keyBundle = decryptKeyBundle(profileRecord.recovery_key_bundle, recKeyBytes);

      const { encryptedKeyBundle: newEncKeyBundleHex } = wrapKeyBundles(
        keyBundle,
        newLocalEncKey,
        recKeyBytes,
      );

      const { error: authErr } = await supabase.auth.updateUser({ password: newAuthSecret });
      if (authErr) throw authErr;

      await rewrapKeysRpc({ encryptedKeyBundle: newEncKeyBundleHex });
      await saveDerivedKey(newLocalEncKey);

      dialog.alert("Success", "Password updated successfully! You can now sign in :)");
      setIsRecovering(false);
    } catch (err: any) {
      dialog.alert("Recovery Failed", err.message || "Failed to recover account.");
    } finally {
      setLoading(false);
    }
  }

  const toggleAuthMode = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      const nextIsSignUp = !isSignUp;
      setIsSignUp(nextIsSignUp);

      Animated.timing(forgotAnim, {
        toValue: nextIsSignUp ? 0 : 1,
        duration: 200,
        useNativeDriver: false,
      }).start();

      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    });
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={[styles.screen, { backgroundColor: colors.background }]}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View
          style={[
            styles.headerBlock,
            {
              opacity: fadeAnim,
              transform: [
                {
                  translateY: fadeAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [8, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <Text style={[styles.title, { color: colors.text }]}>
            {isSignUp ? "Create an account" : "Welcome back"}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            {isSignUp
              ? "Start recording your thoughts and daily moments."
              : "We're glad to have you back!"}
          </Text>
        </Animated.View>

        <View style={styles.form}>
          {isSignUp && (
            <>
            <FormField
              label="NAME"
              value={name}
              onChangeText={setName}
              placeholder="Your display name"
            />
            <FormField
            label="USERNAME"
            value={username}
            onChangeText={(t) => setUsername(t.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
            placeholder="lowercase letters, numbers, _"
            />
            </>
          )}

          <FormField
            label="EMAIL"
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            keyboardType="email-address"
          />
          <PasswordField password={password} onChangePassword={setPassword} />
          {isSignUp && (
            <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs }}>
              At least {MIN_PASSWORD_LENGTH} characters; a few random words make a great password.
              It also protects your encrypted diaries, so keep your recovery key safe.
            </Text>
          )}

          {!isSignUp && (
            <Animated.View
              style={[
                styles.forgotContainer,
                {
                  opacity: forgotAnim,
                  maxHeight: forgotAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 36],
                  }),
                  transform: [
                    {
                      translateY: forgotAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [-6, 0],
                      }),
                    },
                  ],
                },
              ]}
              pointerEvents={isSignUp ? "none" : "auto"}
            >
              <TouchableOpacity
                style={styles.forgotBtn}
                onPress={handleForgotPassword}
                disabled={loading}
              >
                <Text style={[styles.forgotText, { color: colors.accent }]}>
                  Forgot password?
                </Text>
              </TouchableOpacity>
            </Animated.View>
          )}

          <Button
            label={isSignUp ? "Sign Up" : "Sign In"}
            variant="primary"
            onPress={handleAuth}
            loading={loading}
          />

          <View style={styles.switchRow}>
            <Text style={[styles.switchText, { color: colors.textMuted }]}>
              {isSignUp
                ? "Already have an account?"
                : "Don't have an account yet?"}
            </Text>
            <TouchableOpacity onPress={toggleAuthMode}>
              <Text style={[styles.switchLink, { color: colors.accent }]}>
                {isSignUp ? " Sign In" : " Sign Up"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xl,
    justifyContent: "center",
  },
  headerBlock: {
    marginBottom: spacing.xl,
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
  },
  form: {
    gap: spacing.sm,
  },
  inputLabel: {
    fontSize: fontSizes.xs,
    fontFamily: fonts.label,
    letterSpacing: 0.5,
    marginTop: spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: fontSizes.md,
    fontFamily: fonts.body,
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: spacing.lg,
  },
  switchText: {
    fontSize: fontSizes.sm,
    fontFamily: fonts.body,
  },
  switchLink: {
    fontSize: fontSizes.sm,
    fontFamily: fonts.label,
    fontWeight: "700",
  },
  forgotContainer: {
    overflow: "hidden",
    alignSelf: "flex-end",
  },
  forgotBtn: {
    paddingVertical: spacing.xs,
  },
  forgotText: {
    fontSize: fontSizes.xs,
    fontFamily: fonts.label,
    fontWeight: "600",
  },
});
