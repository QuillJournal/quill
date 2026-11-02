import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "@/src/utils/supabase";

export type OnboardingStep = 0 | 1 | 2 | 3;

export interface OnboardingProgress {
  step: OnboardingStep;
  diaryId: number | null;
}

const progressKey = (userId: string) => `@quill/onboarding/${userId}`;

const isOnboardingStep = (value: unknown): value is OnboardingStep =>
  value === 0 || value === 1 || value === 2 || value === 3;

export async function getOnboardingProgress(
  userId: string,
): Promise<OnboardingProgress> {
  const stored = await AsyncStorage.getItem(progressKey(userId));
  if (!stored) return { step: 0, diaryId: null };

  const parsed: unknown = JSON.parse(stored);
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !("step" in parsed) ||
    !isOnboardingStep(parsed.step) ||
    !("diaryId" in parsed) ||
    (parsed.diaryId !== null &&
      (typeof parsed.diaryId !== "number" || !Number.isInteger(parsed.diaryId)))
  ) {
    throw new Error("Stored onboarding progress is invalid.");
  }

  return { step: parsed.step, diaryId: parsed.diaryId };
}

export async function saveOnboardingProgress(
  userId: string,
  progress: OnboardingProgress,
): Promise<void> {
  await AsyncStorage.setItem(progressKey(userId), JSON.stringify(progress));
}

export async function completeOnboarding(userId: string): Promise<void> {
  const { error } = await supabase
    .from("profiles")
    .update({ onboarding: true })
    .eq("id", userId);
  if (error) {
    throw new Error(`Could not complete onboarding: ${error.message}`);
  }

  try {
    await AsyncStorage.removeItem(progressKey(userId));
  } catch (error) {
    console.error("Could not clear saved onboarding progress:", error);
  }
}
