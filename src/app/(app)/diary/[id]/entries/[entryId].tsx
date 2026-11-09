import { dialog } from "@/src/components/Dialog/DialogProvider";
import Editor from "@/src/components/Editor";
import { isMoodKey, type MoodKey } from "@/src/constants/moods";
import { useUserSession } from "@/src/context/UserSessionContext";
import { db } from "@/src/db";
import { getAttachmentsByEntryId } from "@/src/db/attachments";
import { getDiaryById } from "@/src/db/diaries";
import { getEntryById } from "@/src/db/entries";
import { diaryMembersTable } from "@/src/db/schema";
import useTheme from "@/src/hooks/useTheme";
import {
  PendingAttachment,
  updateEntryWithMedia,
} from "@/src/services/attachments";
import { moodHaptics } from "@/src/services/moodHaptics";
import { runSync } from "@/src/services/syncEngine";
import { Attachment } from "@/src/types/attachment";
import { Entry } from "@/src/types/entry";
import { DEFAULT_RULES, parseRules, type DiaryRules } from "@/src/types/rules";
import dayjs from "dayjs";
import { eq } from "drizzle-orm";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";

type stickertype = {
    id: number,
    x: number, 
    y: number, 
    dialtion: number, 
    rotation: number, 
    index: number, 
}

export default function EntryEditScreen() {
  const { entryId } = useLocalSearchParams();
  const { colors } = useTheme();
  const { session } = useUserSession();
  const [entry, setEntry] = useState<Entry | null>();
  const [authorLabel, setAuthorLabel] = useState<string>("You");
  const [attachments, setAttachments] = useState<Attachment[]>();
  const [rules, setRules] = useState<DiaryRules>(DEFAULT_RULES);
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadEntry = async () => {
      setLoading(true);
      const loadedEntry = await getEntryById(Number(entryId));
      const loadedAttachments = await getAttachmentsByEntryId(Number(entryId));
      setEntry(loadedEntry);
      setAttachments(loadedAttachments);
      if (loadedEntry) {
        const d = await getDiaryById(loadedEntry.diaryId);
        setRules(parseRules(d?.rules));
      }

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
  const entryMood = entry?.mood;
  const initialMood = isMoodKey(entryMood) ? entryMood : null;
  const playedForRef = useRef<string | null>(null);

  useEffect(() => {
    if (loading || !entry) return;
    const id = String(entryId);
    if (playedForRef.current === id) return;

    const timer = setTimeout(() => {
      playedForRef.current = id;
      moodHaptics.onOpen(initialMood);
    }, 300);

    return () => {
      clearTimeout(timer);
      moodHaptics.cancel();
    };
  }, [loading, entry, entryId, initialMood]);
  
  const handleSave = async (
    title: string,
    entryDate: string,
    body: string,
    media: { added: PendingAttachment[]; removedIds: number[] },
    mood: MoodKey | null,
    entryTime: string,
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
        mood,
        entryTime,
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
    <SafeAreaView 
    style={{ flex: 1, backgroundColor: colors.background }}
    edges={["top", "left", "right"]}
    >
      <Editor
        initialAttachments={attachments}
        initialMood={initialMood}
        initialTitle={entry?.title}
        initialBody={entry?.body ?? undefined}
        initialDate={entry?.entryDate}
        initialTime={
          entry
            ? (entry.entryTime ?? dayjs(entry.createdAt).format("HH:mm"))
            : undefined
        }
        authorLabel={authorLabel}
        canEdit={isAuthor}
        rules={rules}
        initialReadOnly={true}
        entryId = {Number(entryId)}
        onSave={handleSave}
        onBack={() => {
          router.back();
        }}
      />
    </SafeAreaView>
  );
}
