import { play } from "@/modules/haptic-engine";
import {
  CoreBridge,
  darkEditorTheme,
  RichText,
  TenTapStartKit,
  Toolbar,
  useEditorBridge,
} from "@10play/tentap-editor";
import { Ionicons } from "@expo/vector-icons";
import { DatePicker } from "@quidone/react-native-wheel-picker";
import { useEffect, useRef, useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { GabaritoFont } from "../constants/Gabarito";
import { MOODS, type MoodKey } from "../constants/moods";
import { fonts } from "../constants/typography";
import useTheme from "../hooks/useTheme";
import {
  discardPending,
  PendingAttachment,
  pickAudio,
  pickMedia,
  resolveAttachmentUri,
} from "../services/attachments";
import { celebrate } from "../services/hapticPatterns";
import type { Attachment } from "../types/attachment";
import { fromDateKey, toDateKey } from "../utils/dates";
import AttachMenu from "./AttachMenu";
import AudioRow from "./AudioRow";
import Button from "./Button";
import MediaThumb from "./MediaThumb";
import MediaViewer, { Rect, ViewerItem } from "./MediaViewer";
import MojiFace from "./MojiFace";
import MoodPicker from "./MoodPicker";
import PressableScale, { IconButton } from "./PressableScale";
import VoiceRecorder from "./VoiceRecorder";
import AppModal from "./ui/AppModal";

interface EditorProps {
  initialTitle?: string;
  initialBody?: string;
  initialDate?: string;
  initialReadOnly?: boolean;
  initialAttachments?: Attachment[];
  initialMood?: MoodKey | null;
  onSave: (
    title: string,
    entryDate: string,
    body: string,
    media: { added: PendingAttachment[]; removedIds: number[] },
    mood: MoodKey | null,
  ) => void;
  onBack?: () => void;
}

export default function Editor({
  initialTitle,
  initialBody,
  initialDate,
  initialReadOnly,
  initialAttachments,
  initialMood,
  onSave,
  onBack,
}: EditorProps) {
  const saveScale = useSharedValue(1);
  const saveStyle = useAnimatedStyle(() => ({
    transform: [{ scale: saveScale.value }],
  }));
  const { colors, isDark } = useTheme();
  const styles = getStyles(colors);
  const { top } = useSafeAreaInsets();
  const keyboardVerticalOffset = top;

  const [isReadOnly, setIsReadOnly] = useState(initialReadOnly ?? false);
  const [title, setTitle] = useState(initialTitle ?? "");
  const [entryDate, setEntryDate] = useState(
    initialDate ?? toDateKey(new Date()),
  );
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [viewing, setViewing] = useState<{
    key: string;
    item: ViewerItem;
    origin: Rect;
  } | null>(null);
  const [recorderOpen, setRecorderOpen] = useState(false);
  const [existing, setExisting] = useState<Attachment[]>(
    initialAttachments ?? [],
  );
  const [added, setAdded] = useState<PendingAttachment[]>([]);
  const [removedIds, setRemovedIds] = useState<number[]>([]);
  const [mood, setMood] = useState<MoodKey | null>(initialMood ?? null);
  const [showMoodPicker, setShowMoodPicker] = useState(false);

  const addedRef = useRef(added);
  addedRef.current = added;
  const handedOffRef = useRef(false);
  useEffect(
    () => () => {
      if (!handedOffRef.current) void discardPending(addedRef.current);
    },
    [],
  );

  const handleAddAudio = async () => {
    const picked = await pickAudio();
    if (picked.length) setAdded((prev) => [...prev, ...picked]);
  };

  const openRecorder = () => {
    Keyboard.dismiss();
    editor.blur();
    setRecorderOpen(true);
  };

  const handleRecorded = (rec: PendingAttachment) => {
    setAdded((prev) => [...prev, rec]);
    setRecorderOpen(false);
  };

  const handleAddMedia = async () => {
    const picked = await pickMedia();
    if (picked.length) setAdded((prev) => [...prev, ...picked]);
  };

  const handleDatePress = () => {
    if (!isReadOnly) setShowDatePicker(true);
  };

  const openMoodPicker = () => {
    if (isReadOnly) return;
    Keyboard.dismiss();
    editor.blur();
    setShowMoodPicker(true);
  };

  const thumbs = [
    ...existing.map((a) => ({
      key: `e${a.id}`,
      uri: resolveAttachmentUri(a.relPath),
      kind: a.kind,
      name: a.name ?? "Audio",
      width: a.width,
      height: a.height,
      durationMs: a.durationMs,
      remove: () => {
        setExisting((p) => p.filter((x) => x.id !== a.id));
        setRemovedIds((p) => [...p, a.id]);
      },
    })),
    ...added.map((a) => ({
      key: `n${a.uri}`,
      uri: a.uri,
      kind: a.kind,
      name: a.name ?? "Audio",
      width: a.width,
      height: a.height,
      durationMs: a.durationMs,
      remove: () => {
        void discardPending([a]);
        setAdded((p) => p.filter((x) => x.uri !== a.uri));
      },
    })),
  ];

  const visual = thumbs.filter((t) => t.kind !== "audio");
  const audio = thumbs.filter((t) => t.kind === "audio");

  const dynamicEditorCss = `
    ${GabaritoFont}
    body, .ProseMirror {
      font-family: 'Gabarito', sans-serif !important;
    }
    body {
      background-color: ${colors.background};
      color: ${colors.text};
      padding: 0px;
      margin: 0px;
      font-family: 'Gabarito', sans-serif;
    }
      .ProseMirror p.is-editor-empty:first-child::before,
  .ProseMirror p.is-empty::before,
  .ProseMirror .is-empty::before {
    color: ${colors.textMuted} !important;
    opacity: 1;
  }
  `;

  const editor = useEditorBridge({
    autofocus: !initialReadOnly,
    avoidIosKeyboard: false,
    initialContent: initialBody ?? "<p></p>",
    editable: !isReadOnly,
    bridgeExtensions: [
      ...TenTapStartKit,
      CoreBridge.configureCSS(dynamicEditorCss),
    ],
    theme: isDark ? darkEditorTheme : undefined,
  });
  const displayDate = fromDateKey(entryDate).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const handleSave = async () => {
    saveScale.value = withSequence(
      withTiming(0.92, { duration: 60 }),
      withSpring(1, { damping: 4, stiffness: 300 }),
    );
    play(celebrate);
    const contentHtml = await editor.getHTML();
    setIsReadOnly(true);
    handedOffRef.current = true;
    onSave(title, entryDate, contentHtml, { added, removedIds }, mood);
  };

  const handleStartEditing = () => {
    setIsReadOnly(false);
    play(celebrate);
  };

  return (
    <SafeAreaView style={styles.container} edges={["bottom", "left", "right"]}>
      <View style={styles.topBar}>
        <View style={styles.leftHeaderGroup}>
          <IconButton
            icon="arrow-back"
            label="Go back"
            onPress={() => onBack?.()}
            color={colors.text}
          />
          <Text
            accessibilityRole="header"
            style={styles.newJournalText}
            numberOfLines={1}
          >
            {initialTitle
              ? isReadOnly
                ? "Journal Entry"
                : "Edit Journal"
              : "New Journal"}
          </Text>
        </View>
        {isReadOnly ? (
          <Animated.View style={saveStyle}>
            <Button
              label="Edit"
              onPress={handleStartEditing}
              size="sm"
              style={{ width: 72 }}
            />
          </Animated.View>
        ) : (
          <>
            <AttachMenu
              actions={[
                {
                  key: "media",
                  icon: "images-outline",
                  label: "Photo or video",
                  onPress: handleAddMedia,
                },
                {
                  key: "audio",
                  icon: "musical-note-outline",
                  label: "Audio file",
                  onPress: handleAddAudio,
                },
                {
                  key: "voice",
                  icon: "mic-outline",
                  label: "Record voice note",
                  onPress: openRecorder,
                },
              ]}
            />
            <Animated.View style={saveStyle}>
              <Button
                label="Save"
                onPress={handleSave}
                size="sm"
                style={{ width: 72 }}
              />
            </Animated.View>
          </>
        )}
      </View>

      <View style={styles.bodyContainer}>
        <TextInput
          accessibilityLabel="Entry title"
          style={styles.titleInput}
          placeholder="Add Title..."
          placeholderTextColor={colors.textMuted}
          value={title}
          onChangeText={setTitle}
          editable={!isReadOnly}
        />

                <View style={styles.metaRow}>
          <Pressable onLongPress={handleDatePress}>
            <Text style={styles.dateSubtitle}>{displayDate}</Text>
          </Pressable>
          {(mood || !isReadOnly) && (
            <PressableScale
              disabled={isReadOnly}
              onPress={openMoodPicker}
              accessibilityRole="button"
              accessibilityLabel={
                mood ? `Mood: ${MOODS[mood].label}. Change mood` : "Add mood"
              }
              style={styles.moodChip}
            >
              {mood ? (
                <>
                  <MojiFace mood={mood} size={22} />
                  <Text style={styles.moodChipText}>{MOODS[mood].label}</Text>
                </>
              ) : (
                <>
                  <Ionicons name="happy-outline" size={18} color={colors.textMuted} />
                  <Text style={styles.moodChipText}>Mood</Text>
                </>
              )}
            </PressableScale>
          )}
        </View>
        {visual.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.mediaStrip}
            contentContainerStyle={styles.mediaStripContent}
          >
            {visual.map((t) => (
              <MediaThumb
                key={t.key}
                uri={t.uri}
                kind={t.kind as "image" | "video"}
                label={t.kind === "image" ? "Photo" : "Video"}
                hidden={viewing?.key === t.key}
                onOpen={(origin) =>
                  setViewing({
                    key: t.key,
                    origin,
                    item: {
                      uri: t.uri,
                      kind: t.kind as "image" | "video",
                      width: t.width,
                      height: t.height,
                    },
                  })
                }
                onRemove={isReadOnly ? undefined : t.remove}
              />
            ))}
          </ScrollView>
        )}
        {audio.map((t) => (
          <AudioRow
            key={t.key}
            uri={t.uri}
            name={t.name}
            durationMs={t.durationMs}
            onRemove={isReadOnly ? undefined : t.remove}
          />
        ))}
        <RichText editor={editor} style={styles.editor} />
      </View>
      {!isReadOnly && (
        <KeyboardAvoidingView
          behavior={"padding"}
          style={styles.keyboardToolbarContainer}
          keyboardVerticalOffset={keyboardVerticalOffset}
        >
          <Toolbar editor={editor} />
        </KeyboardAvoidingView>
      )}
      <MediaViewer
        item={viewing?.item ?? null}
        origin={viewing?.origin ?? null}
        onClose={() => setViewing(null)}
      />
      {recorderOpen && (
        <VoiceRecorder
          onDone={handleRecorded}
          onCancel={() => setRecorderOpen(false)}
        />
      )}
            <MoodPicker
        isOpen={showMoodPicker}
        value={mood}
        onSelect={setMood}
        onClose={() => setShowMoodPicker(false)}
      />
      <AppModal
        title="Jump To"
        isOpen={showDatePicker}
        onClose={() => setShowDatePicker(false)}
      >
        <View style={{ alignItems: "center" }}>
          <DatePicker
            date={entryDate}
            onDateChanged={({ date }: { date: string }) => setEntryDate(date)}
          />
        </View>
      </AppModal>
    </SafeAreaView>
  );
}

const getStyles = (colors: ReturnType<typeof useTheme>["colors"]) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    topBar: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 6,
      paddingHorizontal: 8,
      gap: 4,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.background,
    },
    backBtn: {
      paddingVertical: 4,
      paddingHorizontal: 6,
    },
    newJournalText: {
      fontFamily: fonts.heading,
      fontSize: 18,
      fontWeight: "700",
      color: colors.text,
    },
    bodyContainer: {
      flex: 1,
      backgroundColor: colors.background,
    },
    titleInput: {
      fontFamily: fonts.heading,
      fontSize: 26,
      fontWeight: "700",
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 4,
      color: colors.text,
      marginVertical: 0,
    },
    dateSubtitle: {
      fontFamily: fonts.label,
      fontSize: 13,
      fontWeight: "600",
      color: colors.textMuted,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      paddingHorizontal: 20,
      paddingBottom: 14,
      marginVertical: 0,
    },
    editor: {
      flex: 1,
      backgroundColor: colors.background,
      marginHorizontal: 20,
      marginVertical: 0,
    },
    keyboardToolbarContainer: {
      position: "absolute",
      width: "100%",
      bottom: 0,
      borderTopColor: colors.border,
      backgroundColor: colors.surface,
    },
    leftHeaderGroup: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      flex: 1,
      marginRight: 12,
    },
    mediaStrip: {
      flexGrow: 0,
      marginBottom: 12,
    },
    mediaStripContent: {
      paddingHorizontal: 20,
      gap: 10,
    },
    thumb: {
      width: 84,
      height: 84,
    },
    thumbImg: {
      width: 84,
      height: 84,
      borderRadius: 10,
    },
    videoPlaceholder: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
    },
    thumbRemove: {
      position: "absolute",
      top: 4,
      right: 4,
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: colors.surface,
      alignItems: "center",
      justifyContent: "center",
    },
        metaRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingRight: 20,
      paddingBottom: 14,
    },
    moodChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    moodChipText: {
      fontFamily: fonts.label,
      fontSize: 12,
      fontWeight: "600",
      color: colors.textMuted,
    },
  });
