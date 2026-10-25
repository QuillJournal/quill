import { dialog } from "@/src/components/Dialog/DialogProvider";
import Editor from "@/src/components/Editor";
import type { MoodKey } from "@/src/constants/moods";
import { useUserSession } from "@/src/context/UserSessionContext";
import {
  createEntryWithMedia,
  PendingAttachment,
} from "@/src/services/attachments";
import { toDateKey } from "@/src/utils/dates";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

export default function NewEntryScreen() {
  const { id, date } = useLocalSearchParams();
  const diaryId = Number(id);
  const rawDate = Array.isArray(date) ? date[0] : date;
  const entryDate = rawDate ?? toDateKey(new Date());
  const router = useRouter();
  const { session } = useUserSession();

  const handleSave = async (
    title: string,
    entryDate: string,
    body: string,
    media: { added: PendingAttachment[]; removedIds: number[] },
    mood: MoodKey | null,
  ) => {
    try {
      if (!session?.userId) {
        throw new Error(
          "Authentication required. Please sign in to save your entry.",
        );
      }
      await createEntryWithMedia(
        diaryId,
        session.userId,
        title,
        entryDate,
        body,
        media.added,
        mood,
      );
    } catch (e) {
      console.error("Save failed:", e);
      dialog.alert(
        "Couldn't save",
        e instanceof Error ? e.message : "Please try again.",
      );
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <Editor
        initialDate={entryDate}
        initialReadOnly={false}
        onSave={handleSave}
        onBack={() => {
          router.back();
        }}
      />
    </SafeAreaView>
  );
}
