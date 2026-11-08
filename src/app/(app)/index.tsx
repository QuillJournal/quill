import EmptyArt from "@/assets/images/empty.png";
import { dialog } from "@/src/components/Dialog/DialogProvider";
import DiaryCard, { STACK_SIDE_PADDING } from "@/src/components/DiaryCard";
import DiaryForm from "@/src/components/DiaryForm";
import FloatingActionButton from "@/src/components/FloatingActionButton";
import GreetingHeader from "@/src/components/GreetingHeader";
import PendingInvitesBanner from "@/src/components/PendingInvitesBanner";
import SettingsModal from "@/src/components/SettingsModal";
import TutorialTooltip from "@/src/components/TutorialTooltip";
import { spacing } from "@/src/constants/spacings";
import { fonts, fontSizes } from "@/src/constants/typography";
import { useDiaryTransition } from "@/src/context/DiaryTransitionContext";
import { useUserSession } from "@/src/context/UserSessionContext";
import { getDiaryById } from "@/src/db/diaries";
import useDiaries from "@/src/hooks/useDiaries";
import useOnboarding from "@/src/hooks/useOnboarding";
import useTheme from "@/src/hooks/useTheme";
import useUserEmail from "@/src/hooks/useUserEmail";
import { fetchDiaryMembers } from "@/src/services/sharing";
import { useSyncStatus } from "@/src/services/syncEngine";
import type { DiaryFormData } from "@/src/types/diary";
import { Stack } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, FlatList, Image, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import Stickers from "../../components/DecryptingScreen"

export default function Home() {
  const { colors } = useTheme();
  const { session } = useUserSession();
  const onboarding = useOnboarding();
  const styles = getStyles(colors);

  const firstName = session?.name
    ? session.name.trim().split(" ")[0]
    : "Friend";

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showDiaryForm, setShowDiaryForm] = useState(false);

  const email = useUserEmail();
  const { diaries, refresh, deleteDiary, addDiary } = useDiaries();
  const isSyncing = useSyncStatus();
  const { open } = useDiaryTransition();

  const skipOnboarding = () => {
    onboarding.finish().catch((error) => {
      console.error("Failed to complete onboarding:", error);
      dialog.alert("Couldn't save progress", "Please try again.");
    });
  };

  const restartTutorial = async () => {
    setIsSettingsOpen(false);
    await new Promise((resolve) => setTimeout(resolve, 450));
    try {
      await onboarding.restart();
    } catch (error) {
      console.error("Failed to restart onboarding: ", error);
      dialog.alert("Couldn't restart tutorial", "Please try again.")
    }
  }

  const handleAddDiary = async (data: DiaryFormData) => {
    const name = data.name.trim();
    if (!name) return;
    setShowDiaryForm(false);
    let diaryId: number;
    try {
      diaryId = await addDiary(name, data.color);
    } catch (error) {
      console.error("Failed to create diary:", error);
      dialog.alert("Couldn't create diary", "Please try again.");
      return;
    }

    const targetDiaryExists = diaries.some(
      (diary) => diary.id === onboarding.progress.diaryId,
    );
    if (
      onboarding.isFirstTime &&
      (onboarding.progress.step === 0 ||
        (onboarding.progress.step === 1 && !targetDiaryExists))
    ) {
      try {
        await onboarding.setStep(1, diaryId);
      } catch (error) {
        console.error("Diary created, but onboarding progress could not advance:", error);
        dialog.alert(
          "Diary created",
          "The diary was created, but onboarding progress could not be updated.",
        );
      }
    }
  };
  const handleDeleteDiary = async (id: number) => {
    const row = await getDiaryById(id);
    if (!row) return;

    if (row.ownerId && session?.userId && row.ownerId !== session.userId) {
      dialog.alert(
        "Cannot Delete Diary",
        "Only the owner of a shared diary can delete it.",
      );
      return;
    }

    if (row.remoteId && session) {
      const members = await fetchDiaryMembers(row.remoteId, row.keyEpoch, session);
      if (members.length > 1) {
        dialog.alert(
          "Delete Shared Diary?",
          `This diary is shared with ${members.length - 1} other ${members.length - 1 === 1 ? "member" : "members"
          }. Deleting it will permanently remote if for everyone.`,
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Delete for Everyone",
              style: "destructive",
              onPress: () =>
                deleteDiary(id).catch((e) =>
                  console.error("Failed to delete diary: ", e),
                ),
            },
          ],
        );
        return;
      }
    }

    deleteDiary(id).catch((e) => console.error("Failed to delete diary: ", e));
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <Stack.Screen options={{ animation: "none" }} />
      <View style={styles.screen}>
        <Stickers/>
        {isSyncing && (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              paddingVertical: 6,
              backgroundColor: colors.card,
              borderBottomWidth: StyleSheet.hairlineWidth,
              borderBottomColor: colors.border,
            }}
          >
            <ActivityIndicator size='small' color={colors.accent} />
            <Text style={{ fontSize: fontSizes.xs, fontFamily: fonts.label, color: colors.textMuted }}>
              Syncing...
            </Text>
          </View>
        )}
        <FlatList
          data={diaries}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <>
          <GreetingHeader name={firstName} photoUri={session?.photoUri} onAvatarPress={() => setIsSettingsOpen(true)} />
            <PendingInvitesBanner onJoined={refresh} />
            </>
        }
          ListEmptyComponent={
            <View style={styles.emptyList}>
              <Image source = {EmptyArt} style = {{width:220, height:220}}/>
              <Text style={styles.noDiaryText}>No Diaries Yet.</Text>
              <Text style={{ color: colors.textMuted }}>
                Join or create a new one.
              </Text>
            </View>
          }
          renderItem={({ item, index: cardIndex }) => (
            <TutorialTooltip
              visible={
                !onboarding.loading &&
                onboarding.isFirstTime &&
                onboarding.progress.step === 1 &&
                onboarding.progress.diaryId === item.id
              }
              step={1}
              placement = "bottom"
              onSkip={skipOnboarding}
            >
              <DiaryCard
                diary={item}
                isFirst={cardIndex === 0}
                onPress={async (origin) => {
                  if (
                    onboarding.isFirstTime &&
                    onboarding.progress.step === 1 &&
                    onboarding.progress.diaryId === item.id
                  ) {
                    try {
                      await onboarding.setStep(2, item.id);
                    } catch (error) {
                      console.error("Failed to advance onboarding:", error);
                      dialog.alert(
                        "Couldn't save progress",
                        "Please try opening the diary again.",
                      );
                      return;
                    }
                  }
                  open(item, origin);
                }}
                onDelete={handleDeleteDiary}
              />
            </TutorialTooltip>
          )}
        />
        <DiaryForm
          isOpen={showDiaryForm}
          onClose={() => setShowDiaryForm(false)}
          onSubmit={handleAddDiary}
        />
        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          userEmail={email}
          onRestartTutorial={restartTutorial}
        />
        <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
          <TutorialTooltip
          step={0}
          visible={
            !onboarding.loading &&
            onboarding.isFirstTime &&
            onboarding.progress.step === 0
          }
          placement="top"
          parentWrappedStyle={{
            position: "absolute",
            right: 24,
            bottom: 30,
            width: 54,
            height: 54,
          }}
          onSkip={skipOnboarding}
          >
            <FloatingActionButton
            onPress={() => setShowDiaryForm(true)}
            positioned={false}
            />
          </TutorialTooltip>
        </View>
      </View>
    </SafeAreaView>
  );
}

const getStyles = (colors: ReturnType<typeof useTheme>["colors"]) =>
  StyleSheet.create({
    screen: { flex: 1 },
    listContent: {
      paddingHorizontal: STACK_SIDE_PADDING,
      paddingBottom: 96,
    },
    emptyList: {
      alignItems: "center",
      paddingHorizontal: 24,
      paddingVertical: spacing.xl,
    },
    noDiaryText: {
      fontSize: fontSizes.xl,
      fontWeight: "600",
      fontFamily: fonts.label,
      color: colors.text,
    },
  });
  