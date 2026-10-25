import OnBoarding from "../onboarding"
import EmptyArt from "@/assets/images/empty.svg";
import { dialog } from "@/src/components/Dialog/DialogProvider";
import DiaryCard, { STACK_SIDE_PADDING } from "@/src/components/DiaryCard";
import DiaryForm from "@/src/components/DiaryForm";
import FloatingActionButton from "@/src/components/FloatingActionButton";
import GreetingHeader from "@/src/components/GreetingHeader";
import PendingInvitesBanner from "@/src/components/PendingInvitesBanner";
import SettingsModal from "@/src/components/SettingsModal";
import { spacing } from "@/src/constants/spacings";
import { fonts, fontSizes } from "@/src/constants/typography";
import { useDiaryTransition } from "@/src/context/DiaryTransitionContext";
import { useUserSession } from "@/src/context/UserSessionContext";
import { getDiaryById } from "@/src/db/diaries";
import useDiaries from "@/src/hooks/useDiaries";
import useTheme from "@/src/hooks/useTheme";
import useUserEmail from "@/src/hooks/useUserEmail";
import { fetchDiaryMembers } from "@/src/services/sharing";
import { useSyncStatus } from "@/src/services/syncEngine";
import type { DiaryFormData } from "@/src/types/diary";
import { Stack } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, View, Dimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Home() {
  const { colors } = useTheme();
  const { session } = useUserSession();
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

  const [index, setIndex] = useState(0);  
  const height2:number = Dimensions.get("window").height;

  const handleAddDiary = (data: DiaryFormData) => {
    const name = data.name.trim();
    if (!name) return;
    addDiary(name, data.color).catch((e) =>
      console.error("Failed to create diary: ", e),
    );
    setShowDiaryForm(false);
    setIndex(1)
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
              <EmptyArt width={220} height={220} />
              <Text style={styles.noDiaryText}>No Diaries Yet.</Text>
              <Text style={{ color: colors.textMuted }}>
                Join or create a new one.
              </Text>
            </View>
          }
          renderItem={({ item, index }) => (
            <DiaryCard
              diary={item}
              isFirst={index === 0}
              onPress={(origin) => {setIndex(1), open(item, origin)}}
              onDelete={handleDeleteDiary}
            />
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
        />
        <FloatingActionButton
          onPress={() => {
            setShowDiaryForm(true);
          }}
        />
        {/*CHANGE THIS */}
        {diaries.length != 0 && (
          <OnBoarding 
            position = {[0, height2-150]}
            index2 = {index}
          /> )}
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
  