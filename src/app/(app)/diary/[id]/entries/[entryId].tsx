import { dialog } from "@/src/components/Dialog/DialogProvider";
import Editor from "@/src/components/Editor";
import { fonts, fontSizes } from "@/src/constants/typography";
import { useUserSession } from "@/src/context/UserSessionContext";
import { db } from "@/src/db";
import { getAttachmentsByEntryId } from "@/src/db/attachments";
import { getEntryById } from "@/src/db/entries";
import { diaryMembersTable } from "@/src/db/schema";
import useTheme from "@/src/hooks/useTheme";
import {
  PendingAttachment,
  updateEntryWithMedia,
} from "@/src/services/attachments";
import { runSync } from "@/src/services/syncEngine";
import { Attachment } from "@/src/types/attachment";
import { Entry } from "@/src/types/entry";
import { Ionicons } from "@expo/vector-icons";
import { eq } from "drizzle-orm";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function EntryEditScreen() {
  const { entryId } = useLocalSearchParams();
  const { colors } = useTheme();
  const { session } = useUserSession();
  const [entry, setEntry] = useState<Entry | null>();
  const [authorLabel, setAuthorLabel] = useState<string>("You");
  const [attachments, setAttachments] = useState<Attachment[]>();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadEntry = async () => {
      setLoading(true);
      const loadedEntry = await getEntryById(Number(entryId));
      const loadedAttachments = await getAttachmentsByEntryId(Number(entryId));
      setEntry(loadedEntry);
      setAttachments(loadedAttachments);

      if (loadedEntry?.authorId) {
        if (loadedEntry.authorId === session?.userId) {
          setAuthorLabel(`${session.name || "You"} (You)`);
        } else {
          const rows = await db
            .select()
            .from(diaryMembersTable)
            .where(eq(diaryMembersTable.userId, loadedEntry.authorId));
          const m = rows[0];
          setAuthorLabel(
            m ? `${m.name || m.username} (@${m.username})` : "Shared Member",
          );
        }
      }
      setLoading(false);
    };
    loadEntry();
  }, [entryId, session?.userId]);

  const isAuthor = !!session?.userId && entry?.authorId === session.userId;
  const handleSave = async (
    title: string,
    entryDate: string,
    body: string,
    media: { added: PendingAttachment[]; removedIds: number[] },
  ) => {
    if (!isAuthor) {
      dialog.alert("Read Only", "Only the author of this entry can edit it.");
      return;
    }
    try {
      await updateEntryWithMedia(
        Number(entryId),
        title,
        entryDate,
        body,
        media,
      );
      if (session?.kemKeys && session?.signKeys) {
        runSync({
          userId: session.userId,
          kemKeys: session.kemKeys,
          signKeys: session.signKeys,
        });
      }
    } catch {
      dialog.alert(
        "Couldn't save",
        "The media couldn't be stored. Please try again.",
      );
    }
  };

  if (loading) {
    return <SafeAreaView style={{ flex: 1 }} />; // or a spinner
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 18,
        paddingVertical: 8,
        backgroundColor: colors.surface,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: colors.border,
      }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Ionicons
          name="sparkles-outline"
          size={14}
          color={isAuthor ? colors.accent : colors.secondaryAccent}
          />
          <Text
          style={{
            fontSize: fontSizes.xs,
            fontFamily: fonts.label,
            fontWeight: "700",
            color: isAuthor ? colors.accent : colors.text,
          }}
          >
            Created by {authorLabel}
          </Text>
        </View>
        {!isAuthor && (
          <Text
          style={{
            fontSize: 11,
            fontFamily: fonts.label,
            color: colors.textMuted,
          }}
          >
            Read-only
          </Text>
        )}
      </View>
      <Editor
        initialAttachments={attachments}
        initialTitle={entry?.title}
        initialBody={entry?.body ?? undefined}
        initialDate={entry?.entryDate}
        initialReadOnly={true}
        onSave={handleSave}
        onBack={() => {
          router.back();
        }}
      />
    </SafeAreaView>
  );
}
