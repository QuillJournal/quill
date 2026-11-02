import { Session, User } from "@supabase/supabase-js";
import * as Linking from "expo-linking";
import { useSyncExternalStore } from "react";
import { supabase } from "./supabase";

export const redirectAuthUrl = Linking.createURL("login-callback");

export async function signIn(
  email: string,
  password: string,
): Promise<Session | null> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data.session;
}

export interface SignUpMetadata {
  username: string;
  encryptedProfile: string;
  profileNonce: string;
}

export async function checkUsernameAvailable(
  username: string,
): Promise<boolean> {
  const { data, error } = await supabase.rpc("username_available", {
    p_username: username.toLowerCase().trim(),
  });
  if (error) throw error;
  return Boolean(data);
}

export async function signUp(
  email: string,
  authSecret: string,
  metadata: SignUpMetadata,
): Promise<{ session: Session | null; user: User | null }> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password: authSecret,
    options: {
      data: {
        username: metadata.username.toLowerCase().trim(),
        encryptedProfile: metadata.encryptedProfile,
        profileNonce: metadata.profileNonce,
      },
      emailRedirectTo: redirectAuthUrl,
    },
  });
  if (error) throw error;
  return { session: data.session, user: data.user };
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

let recoveryMode = false;
const recoveryListeners = new Set<() => void>();

export function setRecoveryMode(value: boolean) {
  if (recoveryMode === value) return;
  recoveryMode = value;
  recoveryListeners.forEach((listener) => listener());
}

export function isRecoveryMode(): boolean {
  return recoveryMode;
}

export function useRecoveryMode(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      recoveryListeners.add(onChange);
      return () => {
        recoveryListeners.delete(onChange);
      };
    },
    () => recoveryMode,
  );
}

function getUrlParams(url: string): Record<string, string> {
  const params: Record<string, string> = {};
  const [beforeHash, hash = ""] = url.split("#");
  const query = beforeHash.split("?")[1] ?? "";
  new URLSearchParams(`${query}&${hash}`).forEach((value, key) => {
    params[key] = value;
  });
  return params;
}

let authLinkError: string | null = null;

export function getAuthLinkError(): string | null {
  return authLinkError;
}

function getUrlPath(url: string): string {
  const withoutScheme = url.replace(/^[a-z][a-z0-9+.-]*:\/\//i, "");
  const [path] = withoutScheme.split(/[?#]/);
  return path.replace(/^\/+|\/+$/g, "");
}

export async function handleAuthUrl(url: string) {
  const path = getUrlPath(url);
  const params = getUrlParams(url);
  const isRecovery =
    path.endsWith("reset-password") || params.type === "recovery";
  const isCallback = path.endsWith("login-callback");
  if (!isRecovery && !isCallback) return;

  if (isRecovery) setRecoveryMode(true);
  authLinkError = params.error_description ?? null;

  console.log("[auth-link]", {
    path,
    isRecovery,
    hasTokens: Boolean(params.access_token && params.refresh_token),
    errorCode: params.error_code ?? null,
  });

  if (!params.access_token || !params.refresh_token) return;

  const { error } = await supabase.auth.setSession({
    access_token: params.access_token,
    refresh_token: params.refresh_token,
  });
  if (error) {
    authLinkError = error.message;
    console.warn("Auth link session failed: ", error.message);
  }
}

export function subscribeToAuthState(
  onSessionChange: (session: Session | null) => void,
) {
  supabase.auth.getSession().then(({ data: { session } }) => {
    onSessionChange(session);
  });
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, session) => {
    onSessionChange(session);
  });
  const linkingSub = Linking.addEventListener("url", (event) => {
    handleAuthUrl(event.url);
  });
  Linking.getInitialURL().then((url) => {
    if (url) handleAuthUrl(url);
  });
  return () => {
    subscription.unsubscribe();
    linkingSub.remove();
  };
}
export async function sendPasswordResetEmail(email: string): Promise<void> {
  const resetUrl = Linking.createURL("reset-password");

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: resetUrl,
  });

  if (error) throw error;
}

export interface UserProfileRecord {
  id: string;
  username: string;
  encrypted_profile: string;
  profile_nonce: string;
  kem_public_key: string | null;
  sign_public_key: string | null;
  bundle_signature: string | null;
  encrypted_key_bundle: string | null;
  recovery_key_bundle: string | null;
  keys_initialized_at: string | null;
}
export async function getUserProfileRecord(
  userId: string,
): Promise<UserProfileRecord> {
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, username, encrypted_profile, profile_nonce, kem_public_key, sign_public_key, bundle_signature, encrypted_key_bundle, recovery_key_bundle, keys_initialized_at",
    )
    .eq("id", userId)
    .single();

  if (error || !data) {
    throw error || new Error("Profile not found in the database.");
  }

  return data as UserProfileRecord;
}

export async function initKeysRpc(params: {
  kemPublicKey: string;
  signPublicKey: string;
  bundleSignature: string;
  encryptedKeyBundle: string;
  recoveryKeyBundle: string;
}): Promise<void> {
  const { error } = await supabase.rpc("init_keys", {
    p_kem_public_key: params.kemPublicKey,
    p_sign_public_key: params.signPublicKey,
    p_bundle_signature: params.bundleSignature,
    p_encrypted_key_bundle: params.encryptedKeyBundle,
    p_recovery_key_bundle: params.recoveryKeyBundle,
  });
  if (error) throw error;
}

export async function rewrapKeysRpc(params: {
  encryptedKeyBundle: string;
  recoveryKeyBundle?: string | null;
}): Promise<void> {
  const { error } = await supabase.rpc("rewrap_keys", {
    p_encrypted_key_bundle: params.encryptedKeyBundle,
    p_recovery_key_bundle: params.recoveryKeyBundle ?? null,
  });
  if (error) throw error;
}

export async function updateUserEncryptedProfile(
  userId: string,
  encryptedProfile: string,
  profileNonce: string,
): Promise<void> {
  const { error } = await supabase
    .from("profiles")
    .update({
      encrypted_profile: encryptedProfile,
      profile_nonce: profileNonce,
    })
    .eq("id", userId);

  if (error) {
    throw error;
  }
}
export async function deleteAccount(): Promise<void> {
  const { error } = await supabase.functions.invoke("delete-account", {
    method: "POST",
  });
  if (error) {
    const body = await (error as any).context?.json?.().catch(() => null);
    throw new Error(body ? JSON.stringify(body) : error.message);
  }
}
