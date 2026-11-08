import { dialog } from "@/src/components/Dialog/DialogProvider";
import DiaryMembersModal from "@/src/components/DiaryMembersModal";
import DiarySettingsModal from "@/src/components/DiarySettingsModal";
import EntriesList from "@/src/components/EntriesList";
import FloatingActionButton from "@/src/components/FloatingActionButton";
import TutorialTooltip from "@/src/components/TutorialTooltip";
import { resolveDiaryColor } from "@/src/constants/colors";
import { fonts, fontSizes } from "@/src/constants/typography";
import { useDiaryTransition } from "@/src/context/DiaryTransitionContext";
import { setResumeDiaryId } from "@/src/db/appState";
import { getPreviewAttachments } from "@/src/db/attachments";
import { getDiaryById, openDiary } from "@/src/db/diaries";
import useDiaryMembers from "@/src/hooks/useDiaryMembers";
import useEntries from "@/src/hooks/useEntries";
import useOnboarding from "@/src/hooks/useOnboarding";
import useTheme from "@/src/hooks/useTheme";
import { deleteEntryWithMedia } from "@/src/services/attachments";
import { haptic } from "@/src/services/haptics";
import { useSyncStatus } from "@/src/services/syncEngine";
import type { Attachment } from "@/src/types/attachment";
import type { DiaryRow } from "@/src/types/diary";
import { ViewType } from "@/src/types/diary";
import { toDateKey } from "@/src/utils/dates";
import { pluralize } from "@/src/utils/pluralize";
import { Ionicons } from "@expo/vector-icons";
import {
  Stack,
  useFocusEffect,
  useLocalSearchParams,
  useRouter,
} from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function DiaryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const diaryId = Number(id);
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { entries, refresh } = useEntries(diaryId);
  const [media, setMedia] = useState<Map<number, Attachment[]>>(new Map());
  const ids = useMemo(() => entries.map((e) => e.id), [entries]);
  useEffect(() => {
    getPreviewAttachments(ids).then((map) => setMedia(map));
  }, [ids]);
  const diaryMembers = useDiaryMembers(diaryId);
  const onboarding = useOnboarding();
  const [diaryRow, setDiaryRow] = useState<DiaryRow>();
  const [showMembers, setShowMembers] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const warnedPrivate = useRef(false);
  const { close, closing, reportReady } = useDiaryTransition();
  const isSyncing = useSyncStatus();
  const [focused, setFocused] = useState(true);
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, []),
  );
  const isOnBoardingDiary =
    focused &&
    !showMembers &&
    onboarding.isFirstTime &&
    onboarding.progress.diaryId === diaryId;
  const nextOnboarding = () => {
    onboarding.setStep(3).catch((error) => {
      console.error("Failed to advance onboarding: ", error);
      dialog.alert("Couldn't save progress", "Please try again.");
    });
  };

  const isOnboardingDiary =
    onboarding.isFirstTime && onboarding.progress.diaryId === diaryId;
  const skipOnboarding = () => {
    onboarding.finish().catch((error) => {
      console.error("Failed to complete onboarding:", error);
      dialog.alert("Couldn't save progress", "Please try again.");
    });
  };

  const closeDiary = useCallback(() => {
    setResumeDiaryId(null);
    router.replace("/(app)");
  }, [router]);

  const handleClose = useCallback(async () => {
    if (!diaryRow) return closeDiary();
    setResumeDiaryId(null);
    close({
      ...diaryRow,
      entryCount: entries.length,
      memberCount: diaryMembers.size,
    });
  }, [diaryRow, entries.length, close, closeDiary, diaryMembers.size]);

  const scheme = useColorScheme() === "dark" ? "dark" : "light";
  const diaryAccent = resolveDiaryColor(diaryRow?.color ?? "white", scheme);
  const styles = getStyles(colors, diaryAccent, insets.top);

  const [selectedView, setSelectedView] = useState<ViewType>("list");
  const [showSwitcher, setShowSwitcher] = useState(false);

  const handleSelectView = (view: ViewType) => {
    setSelectedView(view);
  };

  useEffect(() => {
    if (!Number.isInteger(diaryId) || !openDiary(diaryId)) closeDiary();
  }, [diaryId, closeDiary]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      getDiaryById(diaryId).then((diary) => {
        if (active && diary) setDiaryRow(diary);
      });
      return () => {
        active = false;
      };
    }, [diaryId]),
  );

  const reloadDiary = useCallback(async () => {
    const diary = await getDiaryById(diaryId);
    if (diary) setDiaryRow(diary);
  }, [diaryId]);

  useEffect(() => {
    if (!isSyncing) reloadDiary();
  }, [isSyncing, reloadDiary]);

  const handleAddEntry = (date?: Date) => {
    router.push({
      pathname: `/(app)/diary/[id]/new-entry`,
      params: date ? { id: diaryId, date: toDateKey(date) } : { id: diaryId },
    });
  };

  const handleDeleteEntry = async (entryId: number) => {
    await deleteEntryWithMedia(entryId);
    refresh();
  };

  // No SafeAreaView here: EntriesList handles the top inset itself and the
  // list scrolls to the bottom edge. Wrapping both caused doubled insets.
  return (
    <View
      style={styles.screen}
      onLayout={() =>
        requestAnimationFrame(() => requestAnimationFrame(reportReady))
      }
    >
      <Stack.Screen options={{ animation: "none" }} />
      <View style={styles.topBar}>
        {handleClose && (
          <TouchableOpacity
            style={[styles.iconButton, closing && styles.hidden]}
            onPress={handleClose}
            accessibilityRole="button"
            accessibilityLabel="Close diary"
            hitSlop={12}
          >
            <Ionicons name="close" size={20} color={colors.text} />
          </TouchableOpacity>
        )}
        <View style={styles.titleContainer}>
          <View style={[styles.titleRow, closing && styles.hidden]}>
            <View style={styles.diaryDot} />
            <Text style={styles.diaryHeading} numberOfLines={1}>
              {diaryRow?.name}
            </Text>
            {diaryMembers.size == 1 && (
              <Ionicons
              name="lock-closed-outline"
              size={16}
              color={colors.textMuted}
              />
            )}
          </View>
          <View style={styles.subtitleRow}>
            <Text style={styles.entryCountSubtitle}>
              {entries.length} {pluralize(entries.length, "entry", "entries")}
            </Text>
            {isSyncing && (
              <View style={styles.syncInline}>
                <ActivityIndicator size="small" color={diaryAccent} />
                <Text style={styles.syncInlineText}>Syncing</Text>
              </View>
            )}
          </View>
        </View>
            <ViewMenuButton
              diaryAccent={diaryAccent}
              showSwitcher={showSwitcher}
              onPillPress={() => setShowSwitcher((prev) => !prev)}
              selectedView={selectedView}
              onSelectView={handleSelectView}
              />
        <TutorialTooltip
          step={2}
          visible={
            !onboarding.loading &&
            isOnboardingDiary &&
            onboarding.progress.step === 2
          }
          placement="top"
          onSkip={skipOnboarding}
          onNext={nextOnboarding}
          nextLabel="Next"
        >
          <TouchableOpacity
            style={styles.membersButton}
            onPress={() => {
              if (isOnBoardingDiary && onboarding.progress.step === 2) {
                nextOnboarding();
                return;
              }
              if (
                diaryMembers.size === 1 &&
                entries.length > 0 &&
                !warnedPrivate.current
              ) {
                haptic.press();
                dialog.alert(
                  "Private diary",
                  "Just a friendly reminder: This is a private diary. Adding someone to it will allow them to view all past entries.",
                  [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Continue",
                      onPress: () => {
                        warnedPrivate.current = true;
                        setShowMembers(true);
                      },
                    },
                  ],
                );
                return;
              }
              setShowMembers(true);
            }}
            accessibilityRole="button"
            accessibilityLabel="Diary members"
            hitSlop={12}
          >
            <Ionicons
              name="people-outline"
              size={20}
              color={colors.textMuted}
            />
            <Text style={styles.membersCount}>
              {Math.max(diaryMembers.size, 1)}
            </Text>
          </TouchableOpacity>
        </TutorialTooltip>
        <TouchableOpacity
        style={styles.iconButton}
        onPress={() => setShowSettings(true)}
        accessibilityRole="button"
        accessibilityLabel="Diary settings"
        hitSlop={12}
        >
          <Ionicons name="settings-outline" size={20} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      <EntriesList
        entries={entries}
        media={media}
        closing={closing}
        onClose={handleClose}
        diaryName={diaryRow?.name}
        diaryColor={diaryRow?.color}
        onOpenMembers={() => setShowMembers(true)}
        onNewEntry={handleAddEntry}
        onSelectEntry={(entry) => {
          router.push(`/(app)/diary/${diaryId}/entries/${entry.id}`);
        }}
        onDeleteEntry={(entryId) => handleDeleteEntry(entryId)}
        selectedView={selectedView}
      />
      <View
        pointerEvents="box-none"
        style={[StyleSheet.absoluteFill, { bottom: insets.bottom }]}
      >
        <TutorialTooltip
          visible={
            !onboarding.loading &&
            isOnboardingDiary &&
            onboarding.progress.step === 3
          }
          step={3}
          onNext={skipOnboarding}
          nextLabel="Finish"
          parentWrappedStyle={{
            position: "absolute",
            right: 24,
            bottom: 30,
            width: 54,
            height: 54,
          }}
          placement="top"
          onSkip={skipOnboarding}
        >
          <FloatingActionButton
            onPress={() => {
              if (isOnboardingDiary && onboarding.progress.step === 3) {
                skipOnboarding();
              }
              handleAddEntry();
            }}
            positioned={false}
          />
        </TutorialTooltip>
      </View>
      <DiaryMembersModal
        visible={showMembers}
        onClose={() => setShowMembers(false)}
        diary={diaryRow}
        onDiaryChanged={reloadDiary}
        onInviteSent={() => {
          if (onboarding.isFirstTime && onboarding.progress.step === 2)
            nextOnboarding();
        }}
      />
      <DiarySettingsModal
      visible={showSettings}
      onClose={() => setShowSettings(false)}
      diary={diaryRow}
      onChanged={reloadDiary}
      onGone={closeDiary}
      />
    </View>
  );
}

const getStyles = (
  colors: ReturnType<typeof useTheme>["colors"],
  diaryAccent: string,
  topInset: number,
) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    topBar: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 20,
      paddingTop: topInset + 10,
      paddingBottom: 12,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      gap: 12,
      marginBottom: 10,
    },
    iconButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
    },
    membersButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingHorizontal: 6,
      height: 36,
    },
    membersCount: {
      fontSize: fontSizes.sm,
      fontFamily: fonts.label,
      fontWeight: "600",
      color: colors.textMuted,
    },
    titleContainer: {
      flex: 1,
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
      backgroundColor: diaryAccent,
    },
    diaryHeading: {
      fontFamily: fonts.heading,
      fontSize: fontSizes.lg,
      fontWeight: "700",
      color: colors.text,
      flexShrink: 1,
    },
    subtitleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginTop: 2,
    },
    entryCountSubtitle: {
      fontSize: fontSizes.xs,
      fontFamily: fonts.body,
      color: colors.textMuted,
    },
    syncInline: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    syncInlineText: {
      fontSize: 11,
      fontFamily: fonts.label,
      fontWeight: "700",
      color: diaryAccent,
    },
    calendarWrap: {
      marginVertical: 10,
    },
    hidden: {
      opacity: 0,
    },
  });
