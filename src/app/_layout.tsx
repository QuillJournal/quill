import {
  Gabarito_400Regular,
  Gabarito_500Medium,
  Gabarito_700Bold,
} from "@expo-google-fonts/gabarito";
import { Roboto_400Regular } from "@expo-google-fonts/roboto";
import type { Session } from "@supabase/supabase-js";
import "expo-blob";
import { useFonts } from "expo-font";
import { Stack, useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, useColorScheme, View } from "react-native";
import "react-native-reanimated";
import DecryptingScreen from "../components/DecryptingScreen";
import { dialog } from "../components/Dialog/DialogProvider";
import LockedDatabaseScreen from "../components/LockedDatabaseScreen";
import { DiaryTransitionProvider } from "../context/DiaryTransitionContext";
import { db, dbStatus } from "../db";
import { getResumeDiaryId } from "../db/appState";
import { getLocalProfile, saveLocalProfile } from "../db/localProfile";
import { protectLocalStorage } from "../services/localProtection";
import { finishPendingWipe } from "../services/localWipe";
import { initKeysRpc } from "../utils/auth";
import {
  bytesToHex,
  decryptKeyBundle,
  generateDualSignKeyPair,
  generateHybridKemKeyPair,
  generateRecoveryKey,
  hexToBytes,
  signPublicBundle,
  wrapKeyBundles,
  type UserSecretKeyBundle
} from "../utils/crypto";

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary
} from "expo-router";
// Prevent the splash screen from auto-hiding before asset loading is complete.
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-get-random-values";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { DialogProvider } from "../components/Dialog/DialogProvider";
import {
  UserSessionProvider,
  useSyncLifecycle,
  useUserSession,
} from "../context/UserSessionContext";
import { diariesTable } from "../db/schema";
import useTheme from "../hooks/useTheme";
import {
  clearDerivedKey,
  getStoredDerivedKey,
} from "../services/storage/secureKeyStore";
import { SupabaseStorageAdapter } from "../services/storage/SupabaseStorageAdapter";
import { getSyncRuns, useSyncProgress } from "../services/syncEngine";
import { getUserProfileRecord, subscribeToAuthState } from "../utils/auth";
import { decryptUserProfile } from "../utils/crypto";
import {
  downloadAndDecryptPhoto,
  getValidAvatarUrl,
} from "../utils/photoCrypto";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  if (dbStatus === "locked") {
    return <LockedDatabaseScreen />;
  }
  return (
    <UserSessionProvider>
      <GestureHandlerRootView>
        <AppNavigator />
      </GestureHandlerRootView>
    </UserSessionProvider>
  );
}

function AppNavigator() {
  const { colors } = useTheme();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const isDbMigrated = dbStatus === "ready";
  const [isFontsLoaded, fontLoadingError] = useFonts({
    Roboto_400Regular,
    Gabarito_400Regular,
    Gabarito_500Medium,
    Gabarito_700Bold,
  });
  const { session: userSession, setSession } = useUserSession();
  useSyncLifecycle();
  const router = useRouter();

  const [supabaseSession, setSupabaseSession] = useState<Session | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const { runs: syncRuns } = useSyncProgress();
  const [decryptBaseline, setDecryptBaseline] = useState<number | null>(null);
  const decryptGateDone = useRef(false);

  let cachedPhotoUri: string | null = null;

  useEffect(() => {
    if (fontLoadingError) {
      console.error("Fonts error:", fontLoadingError);
    }
  }, [fontLoadingError]);

  useEffect(() => {
    if (!isDbMigrated) return;
    (async () => {
      await finishPendingWipe();
      await protectLocalStorage();
    })().catch((e) => console.error("Local storage hardening failed:", e));
  }, [isDbMigrated]);

  useEffect(() => {
    const unsubscribe = subscribeToAuthState(async (newSession) => {
      setSupabaseSession(newSession);

      if (!newSession) {
        decryptGateDone.current = false;
        setDecryptBaseline(null);
        setIsAuthLoading(false);
        return;
      }

      const derivedKey = await getStoredDerivedKey();

      try {
        const cached = await getLocalProfile(newSession.user.id);
        if (cached?.name && derivedKey) {
          cachedPhotoUri = await getValidAvatarUrl(cached.photoUri);
          setSession({
            userId: newSession.user.id,
            username: "",
            email: newSession.user.email ?? "",
            name: cached.name,
            photoUri: cached.photoUri ?? null,
            localEncKey: derivedKey,
            kemKeys: null,
            signKeys: null,
          });
          setIsAuthLoading(false);
        }
      } catch (err) {
        console.warn("Failed reading cached local profile: ", err);
        await clearDerivedKey();
      }

      try {
        if (derivedKey) {
          const profileRecord = await getUserProfileRecord(newSession.user.id);
          const decryptedProfile = decryptUserProfile(
            profileRecord.encrypted_profile,
            profileRecord.profile_nonce,
            derivedKey,
          );

          let kemKeys: {
            x25519Priv: Uint8Array;
            mlkem768Priv: Uint8Array;
            publicKeyHex: string;
          } | null = null;
          let signKeys: {
            ed25519Priv: Uint8Array;
            mldsa65Priv: Uint8Array;
            publicKeyHex: string;
          } | null = null;

          if (!profileRecord.keys_initialized_at) {
            const kemPair = generateHybridKemKeyPair();
            const signPair = generateDualSignKeyPair();
            const { rawKey: recKeyBytes, formattedKey: recKeyDisplay } =
              generateRecoveryKey();

            const kemPubHex = bytesToHex(kemPair.publicKeyBytes);
            const signPubHex = bytesToHex(signPair.publicKeyBytes);
            const bundleSigHex = signPublicBundle(
              newSession.user.id,
              kemPubHex,
              signPubHex,
              signPair.ed25519Priv,
              signPair.mldsa65Priv,
            );
            const secretBundle: UserSecretKeyBundle = {
              kemX25519Priv: bytesToHex(kemPair.x25519Priv),
              kemMlkem768Priv: bytesToHex(kemPair.mlkem768Priv),
              signEd25519Priv: bytesToHex(signPair.ed25519Priv),
              signMldsa65Priv: bytesToHex(signPair.mldsa65Priv),
            };
            const wrappedBundles = wrapKeyBundles(secretBundle, derivedKey, recKeyBytes);
            await initKeysRpc({
              kemPublicKey: kemPubHex,
              signPublicKey: signPubHex,
              bundleSignature: bundleSigHex,
              encryptedKeyBundle: wrappedBundles.encryptedKeyBundle,
              recoveryKeyBundle: wrappedBundles.recoveryKeyBundle,
            });

            setTimeout(() => {
              dialog.alert(
                "Save your recovery key",
                `Please write this down and store it safely. It will NEVER be shown again and your diaries and entries will be gone if you lose it:\n\n${recKeyDisplay}`,
              );
            }, 500);

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
            if (
              !profileRecord.encrypted_key_bundle ||
              !profileRecord.kem_public_key ||
              !profileRecord.sign_public_key
            ) {
              throw new Error("Missing key bundle on initialized profile.");
            }
            const bundle = decryptKeyBundle(
              profileRecord.encrypted_key_bundle,
              derivedKey,
            );
            kemKeys = {
              x25519Priv: hexToBytes(bundle.kemX25519Priv),
              mlkem768Priv: hexToBytes(bundle.kemMlkem768Priv),
              publicKeyHex: profileRecord.kem_public_key,
            };
            signKeys = {
              ed25519Priv: hexToBytes(bundle.signEd25519Priv),
              mldsa65Priv: hexToBytes(bundle.signMldsa65Priv),
              publicKeyHex: profileRecord.sign_public_key,
            };
          }

          let decryptedPhotoUri: string | null = null;
          if (decryptedProfile.photoPath && decryptedProfile.photoNonce) {
            const storage = new SupabaseStorageAdapter("avatars");
            try {
              decryptedPhotoUri = await downloadAndDecryptPhoto(
                decryptedProfile.photoPath,
                decryptedProfile.photoNonce,
                derivedKey,
                storage,
              );
            } catch (photoErr) {
              console.warn("Avatar restore failed: ", photoErr);
              decryptedPhotoUri = cachedPhotoUri;
            }
          }
          await saveLocalProfile(
            newSession.user.id,
            decryptedProfile.name,
            decryptedPhotoUri,
            kemKeys?.publicKeyHex ?? "",
          );
          const hasLocalDiaries = 
          (await db.select({ id: diariesTable.id }).from(diariesTable).limit(1))
          .length > 0;
          if (!hasLocalDiaries && !decryptGateDone.current) {
            setDecryptBaseline((prev) => prev ?? getSyncRuns());
          }
          setSession({
            userId: newSession.user.id,
            username: profileRecord.username,
            email: newSession.user.email ?? "",
            name: decryptedProfile.name,
            photoUri: decryptedPhotoUri,
            localEncKey: derivedKey,
            kemKeys,
            signKeys,
          });
        }
      } catch (e) {
        console.error("Fast restore failed: ", e);
      } finally {
        setIsAuthLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (decryptBaseline !== null && syncRuns > decryptBaseline) {
      decryptGateDone.current = true;
      setDecryptBaseline(null);
    }
  }, [syncRuns, decryptBaseline]);

  const isSignedIn = supabaseSession !== null;
  const isNavReady = isFontsLoaded && isDbMigrated && !isAuthLoading;
  useEffect(() => {
    if (!isNavReady) return;
    if (!isSignedIn) {
      router.replace("/(auth)/login");
      return;
    }
    const resumeDiaryId = getResumeDiaryId();
    router.replace(
      resumeDiaryId === null ? "/(app)" : `/(app)/diary/${resumeDiaryId}`,
    );
  }, [isSignedIn, isNavReady]);

  useEffect(() => {
    if (isFontsLoaded && isDbMigrated) {
      SplashScreen.hideAsync();
    }
  }, [isFontsLoaded, isDbMigrated]);

  if (!isFontsLoaded || !isDbMigrated) {
    return null;
  }

  if (isAuthLoading) {
    return (
      <SafeAreaView
        style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
      >
        <ActivityIndicator size="large" color={colors.accent} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaProvider>
      <DialogProvider>
        <DiaryTransitionProvider>
          <View style={{ flex: 1 }}>
          <Stack
            screenOptions={{
              contentStyle: { backgroundColor: colors.background },
              headerShown: false,
            }}
          >
            <Stack.Screen name="(app)" />
            <Stack.Screen name="(auth)" />
          </Stack>
          {decryptBaseline !== null && userSession?.kemKeys && (
            <DecryptingScreen />
          )}
          </View>
        </DiaryTransitionProvider>
      </DialogProvider>
    </SafeAreaProvider>
  );
}
