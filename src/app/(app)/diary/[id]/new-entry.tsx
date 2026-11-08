import { dialog } from "@/src/components/Dialog/DialogProvider";
import Editor from "@/src/components/Editor";
import type { MoodKey } from "@/src/constants/moods";
import { useUserSession } from "@/src/context/UserSessionContext";
import { getDiaryById } from "@/src/db/diaries";
import {
  createEntryWithMedia,
  PendingAttachment,
} from "@/src/services/attachments";
import {
  completeOnboarding,
  getOnboardingProgress
} from "@/src/services/onboarding";
import { DEFAULT_RULES, parseRules, type DiaryRules } from "@/src/types/rules";
import { toDateKey } from "@/src/utils/dates";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";

export default function NewEntryScreen() {
  const { id, date } = useLocalSearchParams();
  const diaryId = Number(id);
  const rawDate = Array.isArray(date) ? date[0] : date;
  const entryDate = rawDate ?? toDateKey(new Date());
  const router = useRouter();
  const { session } = useUserSession();
  const [rules, setRules] = useState<DiaryRules>(DEFAULT_RULES);

  useEffect(() => {
    getDiaryById(diaryId).then((d) => setRules(parseRules(d?.rules)));
  }, [diaryId]);

  const handleSave = async (
    title: string,
    entryDate: string,
    body: string,
    media: { added: PendingAttachment[]; removedIds: number[] },
    mood: MoodKey | null,
    entryTime: string,
  ) => {
    const userId = session?.userId;
    try {
      if (!userId) {
        throw new Error(
          "Authentication required. Please sign in to save your entry.",
        );
      }
      await createEntryWithMedia(
        diaryId,
        userId,
        title,
        entryDate,
        body,
        media.added,
        mood,
        entryTime,
      );
    } catch (e) {
      console.error("Save failed:", e);
      dialog.alert(
        "Couldn't save",
        e instanceof Error ? e.message : "Please try again.",
      );
      return;
    }

    try {
      const progress = await getOnboardingProgress(userId);
      if (progress.step === 2 && progress.diaryId === diaryId) {
        await completeOnboarding(userId);
      }
    } catch (error) {
      console.error("Entry saved, but onboarding progress could not advance:", error);
      dialog.alert(
        "Entry saved",
        "Your entry was saved, but onboarding progress could not be updated.",
      );
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }} edges={["top", "left", "right"]}>
      <Editor
        initialDate={entryDate}
        initialReadOnly={false}
        rules={rules}
        onSave={handleSave}
        onBack={() => {
          router.back();
        }}
      />
    </SafeAreaView>
  );
}
