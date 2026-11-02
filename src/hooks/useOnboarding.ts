import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { useUserSession } from "@/src/context/UserSessionContext";
import {
  completeOnboarding,
  getOnboardingProgress,
  saveOnboardingProgress,
  type OnboardingProgress,
} from "@/src/services/onboarding";
import { supabase } from "@/src/utils/supabase";

export default function useOnboarding() {
  const { session } = useUserSession();
  const userId = session?.userId;
  const [isFirstTime, setIsFirstTime] = useState(false);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState<OnboardingProgress>({
    step: 0,
    diaryId: null,
  });

  useFocusEffect(
    useCallback(() => {
      let active = true;

      const load = async () => {
        if (!userId) {
          setIsFirstTime(false);
          setLoading(false);
          return;
        }

        setLoading(true);
        try {
          const { data, error } = await supabase
            .from("profiles")
            .select("onboarding")
            .eq("id", userId)
            .maybeSingle();
          if (error) throw new Error(`Could not read onboarding status: ${error.message}`);
          if (!data) throw new Error("No profile exists for onboarding status.");

          const nextProgress = await getOnboardingProgress(userId);
          if (!active) return;
          setProgress(nextProgress);
          setIsFirstTime(data.onboarding === false);
        } catch (error) {
          console.error("Failed to load onboarding progress:", error);
          if (active) setIsFirstTime(false);
        } finally {
          if (active) setLoading(false);
        }
      };

      void load();
      return () => {
        active = false;
      };
    }, [userId]),
  );

  const setStep = useCallback(
    async (step: OnboardingProgress["step"], diaryId = progress.diaryId) => {
      if (!userId) return;
      const next = { step, diaryId };
      await saveOnboardingProgress(userId, next);
      setProgress(next);
    },
    [progress.diaryId, userId],
  );

  const finish = useCallback(async () => {
    if (!userId) return;
    await completeOnboarding(userId);
    setIsFirstTime(false);
    setProgress({ step: 0, diaryId: null });
  }, [userId]);

  return { isFirstTime, loading, progress, setStep, finish };
}
