import Button from "@/src/components/Button";
import { dialog } from "@/src/components/Dialog/DialogProvider";
import { radius } from "@/src/constants/radius";
import { spacing } from "@/src/constants/spacings";
import { fonts, fontSizes } from "@/src/constants/typography";
import { useUserSession } from "@/src/context/UserSessionContext";
import useTheme from "@/src/hooks/useTheme";
import {
    acceptDiaryInvite,
    declineDiaryInvite,
    DecryptedInvite,
    fetchPendingInvites,
} from "@/src/services/sharing";
import { useSyncStatus } from "@/src/services/syncEngine";
import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import { Image, StyleSheet, Switch, Text, TouchableOpacity, View } from "react-native";
import { haptic } from "../services/haptics";

export default function PendingInvitesBanner({ onJoined }: { onJoined: () => void }) {
    const { colors } = useTheme();
    const { session } = useUserSession();
    const isSyncing = useSyncStatus();
    const [invites, setInvites] = useState<DecryptedInvite[]>([]);
    const [sharePhotoMap, setSharePhotoMap] = useState<Record<string, boolean>>({});
    const [busyId, setBusyId] = useState<string | null>(null);

    const loadInvites = useCallback(async () => {
        if (!session?.kemKeys) return;
        const list = await fetchPendingInvites(session);
        setInvites(list);
    }, [session]);

    useEffect(() => {
        if (!isSyncing) {
            loadInvites();
        }
    }, [isSyncing, loadInvites]);

    if (invites.length === 0) return null;

    const handleJoin = async (inv: DecryptedInvite) => {
        if (!session) return;
        haptic.thud();
        const confirmed = await dialog.confirm("Join diary?", "Please only accept diary invites from people you trust. The owner of the diary can remove you whenever they wish, and the entries you added won't be deleted if they do so, but you will lose access to the diary.", {
            confirmText: "Join",
            cancelText: "Cancel",
            destructive: false,
        });
        if (confirmed) {
            setBusyId(inv.id);
        try {
            const sharePhoto = Boolean(sharePhotoMap[inv.id]);
            await acceptDiaryInvite(inv, sharePhoto, session);
            setInvites((prev) => prev.filter((i) => i.id !== inv.id));
            onJoined();
        } catch (e: any) {
            dialog.alert("Could not join diary", e.message || "Please try again.");
        } finally {
            setBusyId(null);
        }
    } else {
        // nothing :heart_eyes:
        // waitt haptics yoo
        haptic.press();
    }
    };

    const handleDecline = async (inv: DecryptedInvite) => {
        setBusyId(inv.id);
        try {
            await declineDiaryInvite(inv.id);
            setInvites((prev) => prev.filter((i) => i.id !== inv.id));
        } catch (e: any) {
            dialog.alert("Error", e.message || "Failed to decline invite.");
        } finally {
            setBusyId(null);
        }
    };

    return (
        <View style={styles.wrapper}>
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
                PENDING INVITES ({invites.length})
            </Text>
            {invites.map((inv) => {
                const sharePhoto = Boolean(sharePhotoMap[inv.id]);
                return (
                    <View
                        key={inv.id}
                        style={[
                            styles.card,
                            { backgroundColor: colors.card, borderColor: colors.border },
                        ]}
                    >
                        <View style={styles.headerRow}>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.diaryName, { color: colors.text }]}>
                                    {inv.diaryName}
                                </Text>
                                <Text style={[styles.inviterText, { color: colors.textMuted }]}>
                                    Invited by {inv.inviterName} (@{inv.inviterUsername})
                                </Text>
                            </View>
                            <TouchableOpacity
                            onPress={() =>
                                dialog.alert(
                                    inv.pinChanged
                                    ? "Warning: Key Changed!"
                                    : "Safety Number (Optional)",
                                    `${
                                     inv.pinChanged
                                     ? "This user's encryption key has changed since you last saw it!\n\n"
                                     : "Compare this number with @" + inv.inviterUsername + " to verify end-to-end encryption:\n\n"   
                                    }${inv.safetyNumber}`,
                                )
                            }
                            style={styles.safetyBadge}
                            >
                                <Ionicons
                                name={inv.pinChanged ? "warning" : "shield-checkmark-outline"}
                                size={16}
                                color={inv.pinChanged ? colors.danger : colors.accent}
                                />
                                <Text
                                style={[
                                    styles.safetyText,
                                    { color: inv.pinChanged ? colors.danger : colors.accent },
                                ]}
                                >
                                    {inv.pinChanged ? "Key Changed" : "Safety #"}
                                </Text>
                            </TouchableOpacity>
                        </View>

                        <View style={[styles.photoSwitchRow, { borderColor: colors.border }]}>
                            {session?.photoUri ? (
                                <Image source={{uri: session.photoUri}} style={styles.tinyAvatar} />
                            ) : (
                                <Ionicons name="person-circle-outline" size={22} color={colors.textMuted} />
                            )}
                            <Text style={[styles.switchLabel, {color: colors.text}]}>
                                Show my profile photo to this diary's members
                            </Text>
                            <Switch
                            value={sharePhoto}
                            onValueChange={(val) => 
                                setSharePhotoMap((prev) => ({ ...prev, [inv.id]: val }))
                            }
                            trackColor={{ false: colors.border, true: colors.accent }}
                            />
                            </View>

                            <View style={styles.actionsRow}>
                                <View style={{flex: 1}}>
                                    <Button
                                    label="Decline"
                                    variant="secondary"
                                    onPress={() => handleDecline(inv)}
                                    disabled={busyId === inv.id}
                                    />
                                    </View>
                                    <View style={{flex: 1}}>
                                        <Button
                                        label="Join"
                                        variant="primary"
                                        onPress={() => handleJoin(inv)}
                                        loading={busyId === inv.id}
                                        />
                                    </View>
                                </View>
                    </View>
                )
            })}
        </View>
    )
}

const styles = StyleSheet.create({
    wrapper: {
        marginBottom: spacing.md,
        gap: spacing.sm,
    },
    sectionTitle: {
        fontSize: fontSizes.xs,
        fontFamily: fonts.label,
        letterSpacing: 0.6,
        fontWeight: "700",
    },
    card: {
        borderWidth: 1,
        borderRadius: radius.md,
        padding: spacing.md,
        gap: spacing.sm,
    },
    headerRow: {
        flexDirection: "row",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: spacing.sm,
    },
    diaryName: {
        fontSize: fontSizes.md,
        fontFamily: fonts.heading,
        fontWeight: "700",
    },
    inviterText: {
        fontSize: fontSizes.xs,
        fontFamily: fonts.body,
        marginTop: 2,
    },
    safetyBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingVertical: 4,
        paddingHorizontal: 8,
    },
    safetyText: {
        fontSize: fontSizes.xs,
        fontFamily: fonts.label,
        fontWeight: "600",
    },
    photoSwitchRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.sm,
        paddingVertical: spacing.xs,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    tinyAvatar: {
        width: 22,
        height: 22,
        borderRadius: 11,
    },
    switchLabel: {
        flex: 1,
        fontSize: fontSizes.xs,
        fontFamily: fonts.body,
    },
    actionsRow: {
        flexDirection: "row",
        gap: spacing.sm,
    },
});