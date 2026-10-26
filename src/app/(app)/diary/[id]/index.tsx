import useDiaries from "@/src/hooks/useDiaries";
import DiaryMembersModal from "@/src/components/DiaryMembersModal";
import EntriesList from "@/src/components/EntriesList";
import FloatingActionButton from "@/src/components/FloatingActionButton";
import { resolveDiaryColor } from "@/src/constants/colors";
import { fonts, fontSizes } from "@/src/constants/typography";
import { useDiaryTransition } from "@/src/context/DiaryTransitionContext";
import { setResumeDiaryId } from "@/src/db/appState";
import { getDiaryById, openDiary } from "@/src/db/diaries";
import useDiaryMembers from "@/src/hooks/useDiaryMembers";
import useEntries from "@/src/hooks/useEntries";
import useTheme from "@/src/hooks/useTheme";
import { deleteEntryWithMedia } from "@/src/services/attachments";
import { useSyncStatus } from "@/src/services/syncEngine";
import type { DiaryRow } from "@/src/types/diary";
import { toDateKey } from "@/src/utils/dates";
import { Ionicons } from "@expo/vector-icons";
import { useUserSession } from "@/src/context/UserSessionContext";
import {
  Stack,
  useFocusEffect,
  useLocalSearchParams,
  useRouter,
} from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "@/src/utils/supabase";
import { FA5Style } from "@expo/vector-icons/build/FontAwesome5";
import { useBridgeState } from "@10play/tentap-editor";

export default function DiaryScreen() {
  const { diaries } = useDiaries();
  const { id } = useLocalSearchParams<{ id: string }>();
  const diaryId = Number(id);
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { entries, refresh } = useEntries(diaryId);
  const diaryMembers = useDiaryMembers(diaryId);
  const [diaryRow, setDiaryRow] = useState<DiaryRow>();
  const [showMembers, setShowMembers] = useState(false);
  const { close, closing, reportReady } = useDiaryTransition();
  const isSyncing = useSyncStatus();
  const { session } = useUserSession();
  const [first, setFirst] = useState(false);
  //set first value
  useEffect(() => {
    const checkfirst = async() => {
        if(!session?.userId){
          setFirst(false)
          return;
        }
      const {data, error} = await supabase.from("profiles").select("onboarding").eq("id", session.userId).maybeSingle();
      if(error){
        console.error("Profile Onboarding Error"+ error.message)
        return;
      }
      if(!data){
        console.error("Error. There is no data for the onboarding table.")
        setFirst(false)
        return;
      }
      setFirst(data.onboarding !== true)
    }
    checkfirst()
  }, [session?.userId])


  const closeDiary = useCallback(() => {
    setResumeDiaryId(null);
    router.replace("/(app)");
  }, [router]);

  const handleClose = useCallback(async () => {
    //if the user closes the tab it kicks them out of onboarding
    if(session?.userId && first){
      const {error} = await supabase.from("profiles").update({onboarding: true}).eq("id", session.userId)
      setFirst(false)
      if(error){
        console.error("Onboarding Status Change Error"+ error.message)
        return;
      }
    }
    if (!diaryRow) return closeDiary();
    setResumeDiaryId(null);
    close({
      ...diaryRow,
      entryCount: entries.length,
      memberCount: diaryMembers.size,
    });
  }, [diaryRow, entries.length, close, closeDiary, session?.userId]);

  const scheme = useColorScheme() === "dark" ? "dark" : "light";
  const diaryAccent = resolveDiaryColor(diaryRow?.color ?? "white", scheme);
  const styles = getStyles(colors, diaryAccent, insets.top);

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
              <Ionicons name="lock-closed-outline" size={16} />
            )}
          </View>
          <View style={styles.subtitleRow}>
            <Text style={styles.entryCountSubtitle}>
              {entries.length} {entries.length === 1 ? "entry" : "entries"}
            </Text>
            {isSyncing && (
              <View style={styles.syncInline}>
                <ActivityIndicator size="small" color={diaryAccent} />
                <Text style={styles.syncInlineText}>Syncing</Text>
              </View>
            )}
          </View>
        </View>
        <TouchableOpacity
          style={[styles.iconButton, styles.membersButton]}
          onPress={() => setShowMembers(true)}
          accessibilityRole="button"
          accessibilityLabel="Diary members"
          hitSlop={12}
        >
          <Ionicons name="people" size={18} color={"blue"} />
        </TouchableOpacity>
      </View>
      <EntriesList
        entries={entries}
        closing={closing}
        onClose={handleClose}
        diaryName={diaryRow?.name}
        diaryColor={diaryRow?.color}
        onOpenMembers={() => setShowMembers(true)}
        onNewEntry={handleAddEntry}
        onSelectEntry={(entry) => {
          if(entries.length == 1 && first){
            //created a new entry instead of following the path 
            const checkfirst = async() => {
              if(!session?.userId){
                setFirst(false)
                return;
              }
            const { error} = await supabase.from("profiles").update({onboarding: true}).eq("id", session.userId)
              if(error){
                console.error("Onboarding Status Change Error"+ error.message)
                return;
              }
            }
            checkfirst(); 
            setFirst(false);
          }
          router.push(`/(app)/diary/${diaryId}/entries/${entry.id}`);
        }}
        onDeleteEntry={(entryId) => handleDeleteEntry(entryId)}
        first = {first?? false}
      />
      <View
        pointerEvents="box-none"
        style={[StyleSheet.absoluteFill, { bottom: insets.bottom }]}
      >
        <FloatingActionButton onPress={() => handleAddEntry()} />
      </View>
      <DiaryMembersModal
        visible={showMembers}
        onClose={() => setShowMembers(false)}
        diary={diaryRow}
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
      borderColor: diaryAccent,
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
