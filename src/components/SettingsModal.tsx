import { dialog } from "@/src/components/Dialog/DialogProvider";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import {
  ActivityIndicator,
  Image,
  LayoutAnimation,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { useUserSession } from "../context/UserSessionContext";
import { saveLocalProfile } from "../db/localProfile";
import useTheme from "../hooks/useTheme";
import { haptic } from "../services/haptics";
import { wipeLocalData } from "../services/localWipe";
import {
  clearDerivedKey,
  getStoredDerivedKey,
} from "../services/storage/secureKeyStore";
import { SupabaseStorageAdapter } from "../services/storage/SupabaseStorageAdapter";
import {
  deleteAccount,
  getUserProfileRecord,
  rewrapKeysRpc,
  signOut,
  updateUserEncryptedProfile,
} from "../utils/auth";
import {
  decryptKeyBundle,
  deriveAuthAndEncKeys, encryptUserProfile, formatRecoveryKey,
  generateRecoveryKey,
  hexToBytes,
  wrapKeyBundles,
  type UserSecretKeyBundle
} from "../utils/crypto";
import {
  encryptAndUploadPhoto,
  persistLocalAvatar,
} from "../utils/photoCrypto";
import Button from "./Button";
import PasswordField from "./PasswordField";
import AppModal from "./ui/AppModal";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail?: string;
  onLogoutSuccess?: () => void;
}

export default function SettingsModal({
  isOpen,
  onClose,
  userEmail,
  onLogoutSuccess,
}: SettingsModalProps) {
  const { colors } = useTheme();
  const { session, setSession, clearSession } = useUserSession();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [isPhotoExpanded, setIsPhotoExpanded] = useState(false);
  const [isPickingOrUploading, setIsPickingOrUploading] = useState(false);
  const [isRecoveryExpanded, setIsRecoveryExpanded] = useState(false);
  const [recoveryPassword, setRecoveryPassword] = useState("");
  const [isRecoveryBusy, setIsRecoveryBusy] = useState(false);

  const togglePhotoExpanded = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsPhotoExpanded((prev) => !prev);
  };

  const toggleRecoveryExpanded = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsRecoveryExpanded((prev) => !prev);
    setRecoveryPassword("");
  }

  const unlockKeyBundle = async (): Promise<{
    bundle: UserSecretKeyBundle;
    localEncKey: Uint8Array;
  }> => {
    if (!session) throw new Error("You are not signed in.");
    const { localEncKey } = await deriveAuthAndEncKeys(
      recoveryPassword,
      session.email || userEmail || "",
    );
    const profile = await getUserProfileRecord(session.userId);
    if (!profile.encrypted_key_bundle) {
      throw new Error("No encryption keys were found for this account.");
    }
    try {
      return {
        bundle: decryptKeyBundle(profile.encrypted_key_bundle, localEncKey),
        localEncKey,
      };
    } catch {
      throw new Error("Incorrect password.");
    }
  };

  const showRecoveryCode = (formattedKey: string, title: string) => {
    dialog.alert(
      title,
      "Write this down and keep it somewhere safe and offline. Anyone who has it can unlock your account's encryption keys.",
      [{ text: "Done" }],
      { code: formattedKey },
    );
  };

  const generateAndStoreNewRecoveryKey = async (
    bundle: UserSecretKeyBundle,
    localEncKey: Uint8Array,
  ) => {
    const { rawKey, formattedKey } = generateRecoveryKey();
    const { encryptedKeyBundle, recoveryKeyBundle } = wrapKeyBundles(
      bundle,
      localEncKey,
      rawKey,
    );
    await rewrapKeysRpc({ encryptedKeyBundle, recoveryKeyBundle });
    showRecoveryCode(formattedKey, "Your new recovery key");
  };
  
  const handleShowRecoveryKey = async () => {
    if (!recoveryPassword) return;
    setIsRecoveryBusy(true);
    try {
      const { bundle, localEncKey } = await unlockKeyBundle();
      setRecoveryPassword("");

      if (bundle.recoveryKey) {
        showRecoveryCode(
          formatRecoveryKey(hexToBytes(bundle.recoveryKey)),
          "Your recovery key",
        );
        return;
      }

      dialog.alert(
        "Recovery key can't be shown",
        "Your current recovery key was created before viewing was supported, so it can't be displayed. You can generate a new one; your old key will stop working.",
        [
          {text: "Cancel", style: "cancel"},
          {
            text: "Generate new key",
            onPress: () => {
              generateAndStoreNewRecoveryKey(bundle, localEncKey).catch(
                (err: any) =>
                  dialog.alert("Couldn't generate key", err?.message || "Please try again."),
              );
            },
          },
        ],
      );
    } catch (err: any) {
      haptic.error();
      dialog.alert("Couldn't show recovery key", err?.message || "Please try again.");
    } finally {
      setIsRecoveryBusy(false);
    }
  };

  const handleGenerateRecoveryKey = async () => {
    if (!recoveryPassword) return;
    setIsRecoveryBusy(true);
    try {
      const { bundle, localEncKey } = await unlockKeyBundle();
      setRecoveryPassword("");
      dialog.alert(
        "Generate a new recovery key?",
        "Your current recovery key will stop working. Make sure you write the new one down.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Generate",
            style: "destructive",
            onPress: () => {
              generateAndStoreNewRecoveryKey(bundle, localEncKey).catch(
                (err: any) =>
                  dialog.alert("Couldn't generate key", err?.message || "Please try again."),
              );
            },
          },
        ],
      );
    } catch (err: any) {
      haptic.error();
      dialog.alert("Couldn't generate key", err?.message || "Please try again.");
    } finally {
      setIsRecoveryBusy(false);
    }
  };

  const handleDeleteAccount = () => {
    haptic.warning();
    dialog.alert(
      "Delete Account",
      "This action is permanent. All data stored or associated with your account will be permanently deleted.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          style: "destructive",
          onPress: async () => {
            setIsDeletingAccount(true);
            try {
              await deleteAccount();

              await clearDerivedKey();
              clearSession();

              await wipeLocalData().catch((e) =>
              console.error("Local wipe incomplete, will retry on next launch: ", e),
            );

              await signOut().catch(() => {});

              onClose();
              if (onLogoutSuccess) onLogoutSuccess();
            } catch (err: any) {
              dialog.alert(
                "Deletion Failed",
                err.message || "Could not delete account. Please try again.",
              );
            } finally {
              setIsDeletingAccount(false);
            }
          },
        },
      ],
    );
  };

  const handleChangePhoto = async () => {
    if (!session) return;

    setIsPickingOrUploading(true);

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled || !result.assets[0]?.uri) {
        return;
      }
      const newLocalUri = result.assets[0].uri;

      const derivedKey = await getStoredDerivedKey();
      if (!derivedKey) {
        throw new Error("Encryption key not found. Please login again.");
      }

      const storage = new SupabaseStorageAdapter("avatars");
      const photoFolderId = session.userId;
      const uploadResult = await encryptAndUploadPhoto(
        newLocalUri,
        photoFolderId,
        derivedKey,
        storage,
      );

      const encProfile = encryptUserProfile(
        {
          name: session.name,
          photoPath: uploadResult.storagePath,
          photoNonce: uploadResult.photoNonceHex,
        },
        derivedKey,
      );

      await updateUserEncryptedProfile(
        session.userId,
        encProfile.encryptedProfileHex,
        encProfile.profileNonceHex,
      );
      const persistedUri = await persistLocalAvatar(
        newLocalUri,
        uploadResult.photoNonceHex,
      );
      saveLocalProfile(
        session.userId,
        session.name,
        persistedUri,
        session.kemKeys?.publicKeyHex ?? '',
      );

      setSession({
        ...session,
        photoUri: persistedUri,
      });

      haptic.success();
      dialog.alert("Success", "Profile photo updated successfully!");
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setIsPhotoExpanded(false);
    } catch (err: any) {
      haptic.error();
      dialog.alert(
        "Upload Failed",
        err.message || "Could not update profile photo.",
      );
    } finally {
      setIsPickingOrUploading(false);
    }
  };

  const handleLogout = () => {
    haptic.thud();
    dialog.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          setIsLoggingOut(true);
          try {
            await clearDerivedKey();
            await signOut();
            clearSession(); 
            await wipeLocalData().catch((e) => 
            console.error("Local wipe incomplete, will retry on next launch:", e),
          );
            onClose();
            if (onLogoutSuccess) onLogoutSuccess();
          } catch (err: any) {
            dialog.alert(
              "Error signing out",
              err.message || "Please try again later.",
            );
          } finally {
            setIsLoggingOut(false);
          }
        },
      },
    ]);
  };

  return (
    <AppModal isOpen={isOpen} title="Settings" onClose={onClose}>
      {/* User Profile Card */}
      <View>
        <View
          style={[
            styles.section,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          {!session ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color={colors.accent} />
              <Text style={[styles.loadingText, { color: colors.textMuted }]}>
                Loading Profile...
              </Text>
            </View>
          ) : (
            <View>
              <View style={styles.profileRow}>
                {/* Tapping the thumbnail toggles the smooth accordion animation */}
                <TouchableOpacity
                  onPress={togglePhotoExpanded}
                  activeOpacity={0.8}
                >
                  {session.photoUri ? (
                    <Image
                      source={{ uri: session.photoUri }}
                      style={styles.avatarImage}
                    />
                  ) : (
                    <View
                      style={[
                        styles.avatarFallback,
                        { backgroundColor: colors.cardPressed },
                      ]}
                    >
                      <Ionicons
                        name="person"
                        size={24}
                        color={colors.textMuted}
                      />
                    </View>
                  )}
                </TouchableOpacity>

                <View style={styles.profileDetails}>
                  <Text
                    style={[styles.nameText, { color: colors.text }]}
                    numberOfLines={1}
                  >
                    {session.name || "Anonymous Journaler"}
                  </Text>
                  <View style={styles.emailContainer}>
                    <Ionicons
                      name="mail-outline"
                      size={14}
                      color={colors.textMuted}
                    />
                    <Text
                      style={[styles.emailText, { color: colors.textMuted }]}
                      numberOfLines={1}
                    >
                      {session.email || userEmail || "No active session"}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Smoothly expanded view */}
              {isPhotoExpanded && (
                <View style={styles.expandedSection}>
                  <View
                    style={[
                      styles.expandedImageWrapper,
                      { borderColor: colors.border },
                    ]}
                  >
                    {session.photoUri ? (
                      <Image
                        source={{ uri: session.photoUri }}
                        style={styles.expandedImage}
                      />
                    ) : (
                      <View
                        style={[
                          styles.expandedFallback,
                          { backgroundColor: colors.cardPressed },
                        ]}
                      >
                        <Ionicons
                          name="person"
                          size={64}
                          color={colors.textMuted}
                        />
                      </View>
                    )}

                    {isPickingOrUploading && (
                      <View style={styles.uploadingOverlay}>
                        <ActivityIndicator size="large" color="#FFFFFF" />
                        <Text style={styles.uploadingText}>Processing...</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.buttonWrapper}>
                    <Button
                      label="Change Photo"
                      onPress={handleChangePhoto}
                      loading={isPickingOrUploading}
                      variant="primary"
                      size="sm"
                    />
                  </View>
                </View>
              )}
            </View>
          )}
        </View>
        {session && (
          <View
          style={[
            styles.section,
            styles.recoveryCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
          >
            <TouchableOpacity
            style={styles.recoveryHeader}
            onPress={toggleRecoveryExpanded}
            activeOpacity={0.8}
            >
              <Ionicons name="key-outline" size={20} color={colors.text} />
              <Text style={[styles.recoveryTitle, { color: colors.text }]}>Recovery key</Text>
              <Ionicons
              name={isRecoveryExpanded ? "chevron-up" : "chevron-down"}
              size={18}
              color={colors.textMuted}
              />
            </TouchableOpacity>

            {isRecoveryExpanded && (
              <View style={styles.recoveryBody}>
                <Text style={[styles.recoveryHint, {color: colors.textMuted}]}>
                  Enter your password to view your recovery key or generate a new one.
                </Text>
                <PasswordField
                password={recoveryPassword}
                onChangePassword={setRecoveryPassword}
                />
                <Button
                label="Show recovery key"
                onPress={handleShowRecoveryKey}
                loading={isRecoveryBusy}
                disabled={!recoveryPassword}
                variant="primary"
                size="sm"
                />
                <Button
                label="Generate new key"
                onPress={handleGenerateRecoveryKey}
                loading={isRecoveryBusy}
                disabled={!recoveryPassword}
                variant="secondary"
                size="sm"
                />
                </View>
            )}
            </View>
        )}

        {/* Sign Out Button */}
        <TouchableOpacity
          style={[styles.logoutButton, { backgroundColor: colors.danger }]}
          onPress={handleLogout}
          disabled={isLoggingOut || isDeletingAccount}
          activeOpacity={0.8}
        >
          {isLoggingOut ? (
            <ActivityIndicator size="small" color={colors.textOnAccent} />
          ) : (
            <>
              <Ionicons
                name="log-out-outline"
                size={20}
                color={colors.textOnAccent}
              />
              <Text style={[styles.logoutText, { color: colors.textOnAccent }]}>
                Sign Out
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* Delete Account Button */}
        <TouchableOpacity
          style={[styles.deleteButton, { borderColor: colors.danger }]}
          onPress={handleDeleteAccount}
          disabled={isLoggingOut || isDeletingAccount}
          activeOpacity={0.7}
        >
          {isDeletingAccount ? (
            <ActivityIndicator size="small" color={colors.danger} />
          ) : (
            <>
              <Ionicons name="trash-outline" size={18} color={colors.danger} />
              <Text style={[styles.deleteText, { color: colors.danger }]}>
                Delete Account
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 24,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    minHeight: 76,
    justifyContent: "center",
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 8,
  },
  loadingText: {
    fontSize: 14,
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarFallback: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  profileDetails: {
    flex: 1,
    justifyContent: "center",
  },
  nameText: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 2,
  },
  emailContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  emailText: {
    fontSize: 14,
    fontWeight: "500",
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 14,
    borderRadius: 12,
    height: 48,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: "600",
  },
  expandedSection: {
    alignItems: "center",
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(128, 128, 128, 0.2)",
  },
  expandedImageWrapper: {
    width: 140,
    height: 140,
    borderRadius: 70,
    overflow: "hidden",
    borderWidth: 2,
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
  },
  expandedImage: {
    width: "100%",
    height: "100%",
  },
  expandedFallback: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  uploadingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  uploadingText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
  buttonWrapper: {
    marginTop: 14,
    width: 160, // Gives our custom Button a neat, centered pill width
    alignSelf: "center",
  },
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 14,
    borderRadius: 12,
    height: 48,
    borderWidth: 1,
    marginTop: 12,
  },
  deleteText: {
    fontSize: 15,
    fontWeight: "600",
  },
    recoveryCard: {
    marginBottom: 12,
    justifyContent: "flex-start",
    minHeight: 0,
  },
  recoveryHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  recoveryTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
  },
  recoveryBody: {
    marginTop: 14,
    gap: 12,
  },
  recoveryHint: {
    fontSize: 13,
    lineHeight: 18,
  },
});
