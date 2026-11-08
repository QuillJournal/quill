import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
    Pressable,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { radius } from "../constants/radius";
import { spacing } from "../constants/spacings";
import { fonts, fontSizes } from "../constants/typography";
import { useUserSession } from "../context/UserSessionContext";
import useTheme from "../hooks/useTheme";
import {
    deleteDiaryEverywhere,
    leaveDiary,
    renameDiary,
    saveDiaryRules,
    transferOwnership,
} from "../services/diaryAdmin";
import { haptic } from "../services/haptics";
import { DiaryMemberInfo, fetchDiaryMembers } from "../services/sharing";
import type { DiaryRow } from "../types/diary";
import {
    describeRules,
    MIN_BODY_CHOICES,
    parseRules,
    sameRules,
    type DiaryRules,
} from "../types/rules";
import Button from "./Button";
import { dialog } from "./Dialog/DialogProvider";
import FormField from "./FormField";
import AppModal from "./ui/AppModal";

type Props = {
    visible: boolean;
    onClose: () => void;
    diary?: DiaryRow;
    onChanged: () => void;
    onGone: () => void;
};

type ViewState =
    | { kind: "main" }
    | { kind: "pick" }
    | { kind: "confirm"; action: "transfer" | "delete"; target?: DiaryMemberInfo };

export default function DiarySettingsModal({
    visible,
    onClose,
    diary,
    onChanged,
    onGone,
}: Props) {
    const { colors } = useTheme();
    const { session } = useUserSession();
    const isOwner = !!diary && !!session && diary.ownerId === session.userId;

    const [view, setView] = useState<ViewState>({ kind: "main" });
    const [nameDraft, setNameDraft] = useState("");
    const [rulesDraft, setRulesDraft] = useState<DiaryRules>(parseRules(null));
    const [members, setMembers] = useState<DiaryMemberInfo[]>([]);
    const [confirmText, setConfirmText] = useState("");
    const [busy, setBusy] = useState<null | "name" | "rules" | "action">(null);

    useEffect(() => {
        if (!visible || !diary) return;
        setView({ kind: "main" });
        setNameDraft(diary.name);
        setRulesDraft(parseRules(diary.rules));
        setConfirmText("");
        if (diary.remoteId && session) {
            fetchDiaryMembers(diary.remoteId, diary.keyEpoch, session)
                .then(setMembers)
                .catch(() => { });
        }
    }, [visible, diary?.id]);

    if (!diary) return null;

    const savedRules = parseRules(diary.rules);
    const rulesChanged = !sameRules(savedRules, rulesDraft);
    const nameChanged =
        nameDraft.trim().length > 0 && nameDraft.trim() !== diary.name;
    const others = members.filter((m) => m.userId !== session?.userId);

    const fail = (title: string, e: unknown) =>
        dialog.alert(title, e instanceof Error ? e.message : "Please try again.");

    const handleSaveName = async () => {
        setBusy("name");
        try {
            await renameDiary(diary, nameDraft);
            haptic.success();
            onChanged();
        } catch (e) {
            fail("Couldn't rename", e);
        } finally {
            setBusy(null);
        }
    };

    const handleSaveRules = async () => {
        setBusy("rules");
        try {
            await saveDiaryRules(diary, rulesDraft);
            haptic.success();
            onChanged();
        } catch (e) {
            fail("Couldn't save rules", e);
        } finally {
            setBusy(null);
        }
    };

    const handleLeave = async () => {
        const ok = await dialog.confirm(
            "Leave this diary?",
            "It will be removed from this device. You can only rejoin if the owner invites you again.",
            { confirmText: "Leave", destructive: true },
        );
        if (!ok) return;
        setBusy("action");
        try {
            await leaveDiary(diary);
            haptic.success();
            onClose();
            onGone();
        } catch (e) {
            fail("Couldn't leave", e);
        } finally {
            setBusy(null);
        }
    };

    const handleConfirmedAction = async () => {
        if (view.kind !== "confirm") return;
        setBusy("action");
        try {
            if (view.action === "transfer" && view.target) {
                await transferOwnership(diary, view.target.userId);
                haptic.success();
                onChanged();
                onClose();
                dialog.alert(
                    "Ownership transferred",
                    `@${view.target.username} now owns this diary,`,
                );
            } else if (view.action === "delete") {
                await deleteDiaryEverywhere(diary);
                haptic.success();
                onClose();
                onGone();
            }
        } catch (e) {
            fail(view.action === "delete" ? "Couldn't delete" : "Couldn't transfer", e);
        } finally {
            setBusy(null);
        }
    };

    const setRule = <K extends keyof DiaryRules>(key: K, value: DiaryRules[K]) =>
        setRulesDraft((r) => ({ ...r, [key]: value }));
    const switchProps = (value: boolean) => ({
        value,
        trackColor: {
            false: colors.border,
            true: colors.accent,
        },
        thumbColor: value ? colors.textOnAccent : colors.surface,
        ios_backgroundColor: colors.border,
        disabled: !isOwner,
    });

    const backHeader = (title: string) => (
        <View style={styles.backHeader}>
            <TouchableOpacity
                onPress={() => setView({ kind: "main" })}
                style={[styles.backBtn, { backgroundColor: colors.card }]}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel="Back"
            >
                <Ionicons name="chevron-back" size={20} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.text }]}>{title}</Text>
        </View>
    );

    // ---------- transfer: pick a member ----------
    if (view.kind === "pick") {
        return (
            <AppModal
                isOpen={visible}
                onClose={onClose}
                header={backHeader("Transfer to…")}
            >
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ gap: spacing.sm }}
                >
                    {others.length === 0 && (
                        <Text style={{ color: colors.textMuted, fontFamily: fonts.body }}>
                            There's nobody else in this diary yet. Invite someone first.
                        </Text>
                    )}
                    {others.map((m) => (
                        <Pressable
                            key={m.userId}
                            onPress={() => {
                                setConfirmText("");
                                setView({ kind: "confirm", action: "transfer", target: m });
                            }}
                            style={[
                                styles.memberRow,
                                { backgroundColor: colors.card, borderColor: colors.border },
                            ]}
                        >
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.memberName, { color: colors.text }]}>
                                    {m.name}
                                </Text>
                                <Text style={[styles.memberHandle, { color: colors.textMuted }]}>
                                    @{m.username}
                                </Text>
                            </View>
                            <Ionicons
                                name="chevron-forward"
                                size={18}
                                color={colors.textMuted}
                            />
                        </Pressable>
                    ))}
                </ScrollView>
            </AppModal>
        );
    }

    if (view.kind === "confirm") {
        const isDelete = view.action === "delete";
        const matches = confirmText.trim() === diary.name;
        return (
            <AppModal
                isOpen={visible}
                onClose={onClose}
                header={backHeader(isDelete ? "Delete diary" : "Transfer ownership")}
            >
                <ScrollView
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ gap: spacing.md }}
                >
                    <Text style={[styles.body, { color: colors.textMuted }]}>
                        {isDelete
                            ? "This permanently deletes the diary and every entry in it for everyone. This can't be undone."
                            : `@${view.target?.username} will become the owner. You'll become a regular member and lose the ability to invite, remove people, change rules or delete the diary.`}
                    </Text>
                    <FormField
                        label={`Type "${diary.name}" to confirm`}
                        value={confirmText}
                        onChangeText={setConfirmText}
                        placeholder={diary.name}
                    />
                    <Button
                        label={isDelete ? "Delete diary forever" : "Transfer ownership"}
                        variant="danger"
                        disabled={!matches}
                        loading={busy === "action"}
                        onPress={handleConfirmedAction}
                    />
                </ScrollView>
            </AppModal>
        );
    }

    const ruleSummary = describeRules(savedRules);

    return (
        <AppModal isOpen={visible} onClose={onClose} title="Diary settings">
            <ScrollView
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ gap: spacing.md, paddingBottom: spacing.md }}
            >
                {isOwner && (
                    <View style={{ gap: spacing.sm }}>
                        <FormField
                            label="Diary name"
                            value={nameDraft}
                            onChangeText={setNameDraft}
                            autoCapitalize="sentences"
                        />
                        {nameChanged && (
                            <Button
                                label="Save name"
                                onPress={handleSaveName}
                                loading={busy === "name"}
                            />
                        )}
                    </View>
                )}

                <View style={{ gap: spacing.sm }}>
                    <Text style={[styles.sectionHeader, { color: colors.textMuted }]}>
                        DIARY RULES
                    </Text>
                    <Text style={[styles.body, { color: colors.textMuted }]}>
                        {isOwner
                            ? "Rules apply to everyone, including you, when saving an entry. All off by default."
                            : ruleSummary.length
                                ? "The owner set these rules for every entry:"
                                : "The owner hasn't set any rules."}
                    </Text>

                    {isOwner ? (
                        <View
                            style={[
                                styles.card,
                                { backgroundColor: colors.card, borderColor: colors.border },
                            ]}
                        >
                            <RuleRow
                                icon="happy-outline"
                                label="Require a mood"
                                sub="Every entry needs a mood before it can be saved"
                                {...switchProps(rulesDraft.requireMood)}
                                onValueChange={(v) => setRule("requireMood", v)}
                            />
                            <RuleRow
                                icon="text-outline"
                                label="Require a title"
                                sub="No untitled entries"
                                {...switchProps(rulesDraft.requireTitle)}
                                onValueChange={(v) => setRule("requireTitle", v)}
                            />
                            <RuleRow
                                icon="document-text-outline"
                                label="Minimum length"
                                sub="Stops one-word entries"
                                {...switchProps(rulesDraft.minBodyChars > 0)}
                                onValueChange={(v) =>
                                    setRule("minBodyChars", v ? MIN_BODY_CHOICES[1] : 0)
                                }
                            />
                            {rulesDraft.minBodyChars > 0 && (
                                <View style={styles.chipRow}>
                                    {MIN_BODY_CHOICES.map((n) => {
                                        const active = rulesDraft.minBodyChars === n;
                                        return (
                                            <Pressable
                                                key={n}
                                                onPress={() => setRule("minBodyChars", n)}
                                                style={[
                                                    styles.chip,
                                                    {
                                                        backgroundColor: active ? colors.accent : colors.surface,
                                                        borderColor: active ? colors.accent : colors.border,
                                                    },
                                                ]}
                                            >
                                                <Text
                                                    style={[
                                                        styles.chipText,
                                                        { color: active ? colors.textOnAccent : colors.text },
                                                    ]}
                                                >
                                                    {n} chars
                                                </Text>
                                            </Pressable>
                                        );
                                    })}
                                </View>
                            )}
                            <RuleRow
                                icon="image-outline"
                                label="Require a photo or video"
                                sub="At least one on every entry"
                                last
                                {...switchProps(rulesDraft.requirePhoto)}
                                onValueChange={(v) => setRule("requirePhoto", v)}
                            />
                        </View>
                    ) : (
                        ruleSummary.map((line) => (
                            <View key={line} style={styles.ruleLine}>
                                <Ionicons
                                    name="checkmark-circle-outline"
                                    size={18}
                                    color={colors.textMuted}
                                />
                                <Text style={{ color: colors.text, fontFamily: fonts.body }}>
                                    {line}
                                </Text>
                            </View>
                        ))
                    )}

                    {isOwner && rulesChanged && (
                        <Button
                            label="Save rules"
                            onPress={handleSaveRules}
                            loading={busy === "rules"}
                        />
                    )}
                </View>

                <View style={{ gap: spacing.sm }}>
                    <Text style={[styles.sectionHeader, { color: colors.textMuted }]}>
                        {isOwner ? "OWNER" : "MEMBERSHIP"}
                    </Text>
                    {isOwner ? (
                        <>
                            <Button
                                label="Transfer ownership"
                                variant="outline"
                                disabled={others.length === 0}
                                onPress={() => setView({ kind: "pick" })}
                            />
                            <Button
                                label="Delete diary"
                                variant="danger"
                                onPress={() => {
                                    haptic.warning();
                                    setConfirmText("");
                                    setView({ kind: "confirm", action: "delete" });
                                }}
                            />
                            <Text style={[styles.hint, { color: colors.textMuted }]}>
                                Owners can't leave. Transfer ownership first, or delete the
                                diary.
                            </Text>
                        </>
                    ) : (
                        <Button
                            label="Leave diary"
                            variant="danger"
                            loading={busy === "action"}
                            onPress={handleLeave}
                        />
                    )}
                </View>
            </ScrollView>
        </AppModal>
    );
}

function RuleRow({
    icon,
    label,
    sub,
    value,
    onValueChange,
    disabled,
    trackColor,
    thumbColor,
    ios_backgroundColor,
    last,
}: {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    sub: string;
    value: boolean;
    onValueChange: (v: boolean) => void;
    disabled?: boolean;
    trackColor: { false: string; true: string },
    thumbColor: string;
    ios_backgroundColor: string;
    last?: boolean;
}) {
    const { colors } = useTheme();
    return (
        <View
      style={[
        styles.ruleRow,
        !last && { borderBottomWidth: 1, borderBottomColor: colors.border },
      ]}
    >
      <Ionicons name={icon} size={20} color={colors.textMuted} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.ruleLabel, { color: colors.text }]}>{label}</Text>
        <Text style={[styles.hint, { color: colors.textMuted }]}>{sub}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={trackColor}
    //    thumbColor={thumbColor}
        ios_backgroundColor={ios_backgroundColor}
      />
    </View>
    );
}

const styles = StyleSheet.create({
    backHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: fontSizes.lg,
    fontFamily: fonts.heading,
    fontWeight: "700",
  },
  sectionHeader: {
    fontSize: 11,
    fontFamily: fonts.label,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  body: {
    fontSize: fontSizes.sm,
    fontFamily: fonts.body,
  },
  hint: {
    fontSize: 11,
    fontFamily: fonts.body,
    marginTop: 1,
  },
  card: {
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
  },
  ruleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  ruleLabel: {
    fontSize: fontSizes.sm,
    fontFamily: fonts.heading,
    fontWeight: "600",
  },
  ruleLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    paddingBottom: spacing.md,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 12,
    fontFamily: fonts.label,
    fontWeight: "600",
  },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  memberName: {
    fontSize: fontSizes.md,
    fontFamily: fonts.heading,
    fontWeight: "700",
  },
  memberHandle: {
    fontSize: fontSizes.xs,
    fontFamily: fonts.body,
    marginTop: 2,
  },
});