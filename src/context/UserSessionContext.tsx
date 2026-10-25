import React, { createContext, useContext, useEffect, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { runSync } from '../services/syncEngine';
import { supabase } from '../utils/supabase';

export interface UserSessionData {
    userId: string;
    username: string;
    email: string;
    name: string;
    photoUri: string | null;
    localEncKey: Uint8Array;
    kemKeys: {
        x25519Priv: Uint8Array;
        mlkem768Priv: Uint8Array;
        publicKeyHex: string;
    } | null;
    signKeys: {
        ed25519Priv: Uint8Array;
        mldsa65Priv: Uint8Array;
        publicKeyHex: string;
    } | null;
}

interface UserSessionContextType {
    session: UserSessionData | null;
    setSession: (sessions: UserSessionData | null) => void;
    clearSession: () => void;
}

const UserSessionContext = createContext<UserSessionContextType | undefined>(undefined);

export function UserSessionProvider({ children }: {children: React.ReactNode }) {
    const [session, setSession] = useState<UserSessionData | null>(null);

    const clearSession = () => setSession(null);

    return (
        <UserSessionContext.Provider value={{session, setSession, clearSession}}>
            {children}
        </UserSessionContext.Provider>
    );
}

export function useUserSession() {
    const context = useContext(UserSessionContext);
    if (!context) {
        throw new Error('useUserSession must be used within a UserSessionProvider');
    }
    return context;
}

export function useSyncLifecycle() {
    const {session} = useUserSession();

    useEffect(() => {
        if (!session || !session.kemKeys) return;

        const trigger = () => {
            runSync({
                userId: session.userId,
                kemKeys: session.kemKeys!,
                signKeys: session.signKeys!,
            });
        };
        trigger();
        const appStateSub = AppState.addEventListener("change", (status: AppStateStatus) => {
            if (status === "active") {
                trigger();
            }
        });
        
        const channel = supabase
        .channel("quill-sync-realtime")
        .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "entries" },
            () => trigger()
        )
        .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "diary_invites"},
            () => trigger()
        )
        .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "diary_members"},
            () => trigger()
        )
        .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "diary_members" },
            () => trigger()
        )
        .subscribe();

        return () => {
            appStateSub.remove();
            supabase.removeChannel(channel);
        };
    }, [session?.userId, !!session?.kemKeys]);
}