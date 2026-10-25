import Button from "@/src/components/Button";
import { dialog } from "@/src/components/Dialog/DialogProvider";
import FormField from "@/src/components/FormField";
import { resolveDiaryColor } from "@/src/constants/colors";
import { radius } from "@/src/constants/radius";
import { spacing } from "@/src/constants/spacings";
import { fonts, fontSizes } from "@/src/constants/typography";
import { useUserSession } from "@/src/context/UserSessionContext";
import useTheme from "@/src/hooks/useTheme";
import {
  DiaryMemberInfo,
  fetchDiaryMembers,
  getSharePhotoPreference,
  lookupUserForInvite,
  sendDiaryInvite,
  updateMyMemberBlob,
} from "@/src/services/sharing";
import type { DiaryRow } from "@/src/types/diary";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";

interface DiaryMembersModalProps {
  visible: boolean;
  onClose: () => void;
  diary?: DiaryRow;
}

export default function DiaryMembersModal({
  visible,
  onClose,
  diary,
}: DiaryMembersModalProps) {
  const { colors } = useTheme();
  const scheme = useColorScheme() === "dark" ? "dark" : "light";
  const diaryAccent = resolveDiaryColor(diary?.color ?? "cobalt", scheme);
  const { session } = useUserSession();

  const [members, setMembers] = useState<DiaryMemberInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [inviteUsername, setInviteUsername] = useState("");
  const [inviting, setInviting] = useState(false);
  const [sharePhoto, setSharePhoto] = useState(false);

  const isOwner =
    !diary?.ownerId || (session?.userId && diary.ownerId === session.userId);

  const loadMembers = async () => {
    if (!diary?.remoteId || !session) return;
    setLoading(true);
    try {
      const [list, pref] = await Promise.all([
        fetchDiaryMembers(diary.remoteId, diary.keyEpoch, session),
        getSharePhotoPreference(diary.remoteId),
      ]);
      setMembers(list);
      setSharePhoto(pref);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible) {
      loadMembers();
    }
  }, [visible, diary?.remoteId]);

  const handleToggleSharePhoto = async (nextVal: boolean) => {
    if (!diary?.remoteId || !session) return;
    setSharePhoto(nextVal);
    try {
      await updateMyMemberBlob(diary.remoteId, diary.keyEpoch, nextVal, session);
      await loadMembers();
    } catch (e: any) {
      setSharePhoto(!nextVal);
      dialog.alert("Update failed", e.message || "Could not update photo preference.");
    }
  };

  const handleInvite = async () => {
    Keyboard.dismiss();
    const clean = inviteUsername.trim().toLowerCase();
    if (!clean || !diary || !session) return;

    setInviting(true);
    try {
      const target = await lookupUserForInvite(clean, session);

      const confirmTitle = target.pinChanged
        ? `Warning: @${target.username}'s Key Changed!`
        : `Invite @${target.username}?`;

      const confirmMsg = target.pinChanged
        ? `Security Alert: @${target.username}'s public encryption key has changed since you last saw it.\n\nSafety Number:\n${target.safetyNumber}`
        : `Safety Number (optional verification):\n${target.safetyNumber}\n\nSend encrypted diary invite to @${target.username}?`;

      dialog.alert(confirmTitle, confirmMsg, [
        { text: "Cancel", style: "cancel" },
        {
          text: "Send Invite",
          style: "default",
          onPress: async () => {
            try {
              setInviting(true);
              await sendDiaryInvite(diary.id, target, session);
              setInviteUsername("");
              dialog.alert("Invite Sent", `@${target.username} has been invited.`);
            } catch (err: any) {
              dialog.alert("Invite Error", err.message || "Could not send invite.");
            } finally {
              setInviting(false);
            }
          },
        },
      ]);
    } catch (e: any) {
      dialog.alert("Cannot Invite", e.message || "Lookup failed.");
    } finally {
      setInviting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.backdrop}
      >
        {/* Tap outside anywhere on the dim backdrop to close */}
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={[styles.handleBar, { backgroundColor: colors.border }]} />

          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <View style={styles.titleRow}>
                <View style={[styles.diaryDot, { backgroundColor: diaryAccent }]} />
                <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
                  {diary?.name || "Shared Diary"}
                </Text>
              </View>
              <Text style={[styles.subtitle, { color: colors.textMuted }]}>
                End-to-end encrypted • {members.length || 1}{" "}
                {(members.length || 1) === 1 ? "member" : "members"}
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={[styles.closeBtn, { backgroundColor: colors.card }]}
              hitSlop={12}
            >
              <Ionicons name="close" size={20} color={colors.text} />
            </TouchableOpacity>
          </View>

          {isOwner && (
            <View
              style={[
                styles.inviteCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <FormField
                label="INVITE COLLABORATOR"
                value={inviteUsername}
                onChangeText={(t) =>
                  setInviteUsername(t.toLowerCase().replace(/[^a-z0-9_]/g, ""))
                }
                placeholder="Enter @username..."
              />
              <Button
                label="Send Encrypted Invite"
                variant="primary"
                onPress={handleInvite}
                loading={inviting}
              />
            </View>
          )}

          <View
            style={[
              styles.photoPrefCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Ionicons name="image-outline" size={20} color={diaryAccent} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.photoPrefTitle, { color: colors.text }]}>
                Share My Profile Photo
              </Text>
              <Text style={[styles.photoPrefSub, { color: colors.textMuted }]}>
                Decryptable only by members of this diary
              </Text>
            </View>
            <Switch
              value={sharePhoto}
              onValueChange={handleToggleSharePhoto}
              trackColor={{ false: colors.border, true: diaryAccent }}
              thumbColor={sharePhoto ? colors.background || '#FFFFFF' : '#F4F3F4'}
              ios_backgroundColor={colors.border}
            />
          </View>

          <Text style={[styles.sectionHeader, { color: colors.textMuted }]}>
            MEMBERS
          </Text>

          {loading ? (
            <ActivityIndicator
              size="small"
              color={diaryAccent}
              style={{ marginVertical: 28 }}
            />
          ) : (
            <FlatList
              data={members}
              keyExtractor={(m) => m.userId}
              contentContainerStyle={{ gap: spacing.sm, paddingBottom: spacing.md }}
              renderItem={({ item }) => {
                const isMe = item.userId === session?.userId;
                const initials = (item.name || item.username || "?")
                  .slice(0, 2)
                  .toUpperCase();

                return (
                  <View
                    style={[
                      styles.memberRow,
                      {
                        backgroundColor: colors.card,
                        borderColor: isMe ? diaryAccent : colors.border,
                        borderWidth: isMe ? 1.5 : 1,
                      },
                    ]}
                  >
                    {item.photoDataUri ? (
                      <Image source={{ uri: item.photoDataUri }} style={styles.avatar} />
                    ) : (
                      <View
                        style={[
                          styles.avatarFallback,
                          {
                            backgroundColor: isMe ? diaryAccent : colors.surface,
                            borderColor: colors.border,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.avatarInitials,
                            { color: isMe ? colors.textOnAccent : colors.text },
                          ]}
                        >
                          {initials}
                        </Text>
                      </View>
                    )}

                    <View style={{ flex: 1 }}>
                      <View style={styles.nameRow}>
                        <Text
                          style={[styles.memberName, { color: colors.text }]}
                          numberOfLines={1}
                        >
                          {item.name}
                        </Text>
                        {isMe && (
                          <View
                            style={[
                              styles.badge,
                              { backgroundColor: diaryAccent },
                            ]}
                          >
                            <Text
                              style={[
                                styles.badgeText,
                                { color: colors.textOnAccent },
                              ]}
                            >
                              YOU
                            </Text>
                          </View>
                        )}
                        {item.role === "owner" && (
                          <View
                            style={[
                              styles.badgeOutline,
                              { borderColor: diaryAccent },
                            ]}
                          >
                            <Text
                              style={[styles.badgeOutlineText, { color: diaryAccent }]}
                            >
                              OWNER
                            </Text>
                          </View>
                        )}
                      </View>
                      <Text style={[styles.memberHandle, { color: colors.textMuted }]}>
                        @{item.username}
                      </Text>
                    </View>

                    {!isMe && (
                      <TouchableOpacity
                        style={[
                          styles.safetyPill,
                          {
                            backgroundColor: colors.surface,
                            borderColor: item.pinChanged
                              ? colors.danger
                              : colors.border,
                          },
                        ]}
                        onPress={() =>
                          dialog.alert(
                            item.pinChanged
                              ? "Key Changed Warning"
                              : `Safety Number (@${item.username})`,
                            `Verify this code with @${item.username} to confirm E2EE authenticity:\n\n${item.safetyNumber}`,
                          )
                        }
                      >
                        <Ionicons
                          name={
                            item.pinChanged
                              ? "warning"
                              : "shield-checkmark-outline"
                          }
                          size={15}
                          color={item.pinChanged ? colors.danger : diaryAccent}
                        />
                        <Text
                          style={[
                            styles.safetyPillText,
                            {
                              color: item.pinChanged
                                ? colors.danger
                                : colors.textMuted,
                            },
                          ]}
                        >
                          Verify
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              }}
            />
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.68)",
  },
  sheet: {
    maxHeight: "86%",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
  },
  handleBar: {
    width: 42,
    height: 5,
    borderRadius: 999,
    alignSelf: "center",
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  diaryDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  title: {
    fontSize: fontSizes.lg,
    fontFamily: fonts.heading,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: fontSizes.xs,
    fontFamily: fonts.body,
    marginTop: 2,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  inviteCard: {
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  photoPrefCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  photoPrefTitle: {
    fontSize: fontSizes.sm,
    fontFamily: fonts.heading,
    fontWeight: "600",
  },
  photoPrefSub: {
    fontSize: 11,
    fontFamily: fonts.body,
    marginTop: 1,
  },
  sectionHeader: {
    fontSize: 11,
    fontFamily: fonts.label,
    fontWeight: "700",
    letterSpacing: 0.8,
    marginBottom: spacing.xs,
  },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
  },
  avatarFallback: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitials: {
    fontSize: fontSizes.sm,
    fontFamily: fonts.heading,
    fontWeight: "700",
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  memberName: {
    fontSize: fontSizes.md,
    fontFamily: fonts.heading,
    fontWeight: "700",
  },
  badge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
  },
  badgeText: {
    fontSize: 10,
    fontFamily: fonts.label,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  badgeOutline: {
    paddingHorizontal: 7,
    paddingVertical: 1.5,
    borderRadius: 999,
    borderWidth: 1,
  },
  badgeOutlineText: {
    fontSize: 10,
    fontFamily: fonts.label,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  memberHandle: {
    fontSize: fontSizes.xs,
    fontFamily: fonts.body,
    marginTop: 2,
  },
  safetyPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  safetyPillText: {
    fontSize: 11,
    fontFamily: fonts.label,
    fontWeight: "600",
  },
});