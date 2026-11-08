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
import dayjs from "dayjs";
import { useEffect, useRef, useState } from "react";
import {
  ImageBackground,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming
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
import { playEvents as play } from "../services/haptics";
import type { Attachment } from "../types/attachment";
import { checkRules, DEFAULT_RULES, type DiaryRules } from "../types/rules";
import { fromDateKey, toDateKey } from "../utils/dates";
import AttachMenu from "./AttachMenu";
import AudioRow from "./AudioRow";
import Button from "./Button";
import { dialog } from "./Dialog/DialogProvider";
import MediaThumb from "./MediaThumb";
import MediaViewer, { Rect, ViewerItem } from "./MediaViewer";
import MojiFace from "./MojiFace";
import MoodPicker from "./MoodPicker";
import PressableScale, { IconButton } from "./PressableScale";
import TimeWheel from "./TimeWheel";
import VoiceRecorder from "./VoiceRecorder";
import AppModal from "./ui/AppModal";

interface EditorProps {
  initialTitle?: string;
  initialBody?: string;
  initialDate?: string;
  initialReadOnly?: boolean;
  initialAttachments?: Attachment[];
  initialMood?: MoodKey | null;
  initialTime?: string;
  authorLabel?: string;
  canEdit?: boolean;
  rules?: DiaryRules,
  onSave: (
    title: string,
    entryDate: string,
    body: string,
    media: { added: PendingAttachment[]; removedIds: number[] },
    mood: MoodKey | null,
    entryTime: string,
  ) => void;
  onBack?: () => void;
}

const TOOLBAR_H = 50;

export default function Editor({
  initialTitle,
  initialBody,
  initialDate,
  initialReadOnly,
  initialAttachments,
  initialMood,
  initialTime,
  authorLabel,
  canEdit = true,
  rules = DEFAULT_RULES,
  onSave,
  onBack,
}: EditorProps) {
  const [background, setBackground] = useState();
  const saveScale = useSharedValue(1);
  const saveStyle = useAnimatedStyle(() => ({
    transform: [{ scale: saveScale.value }],
  }));
  const { colors, isDark } = useTheme();
  const styles = getStyles(colors);
  const { top } = useSafeAreaInsets();

  const [isReadOnly, setIsReadOnly] = useState(initialReadOnly ?? false);
  const [title, setTitle] = useState(initialTitle ?? "");
  const [titleFocused, setTitleFocused] = useState(false);
  const [entryDate, setEntryDate] = useState(
    initialDate ?? toDateKey(new Date()),
  );
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [entryTime, setEntryTime] = useState(
    initialTime ?? dayjs().format("HH:mm"),
  );
  const [showTimePicker, setShowTimePicker] = useState(false);
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

  const [kbVisible, setKbVisible] = useState(() => Keyboard.isVisible());
  const [kbHeight, setKbHeight] = useState(0);

  useEffect(() => {
    const ios = Platform.OS === "ios";
    const show = Keyboard.addListener(
      ios ? "keyboardWillShow" : "keyboardDidShow",
      (e) => {
        setKbVisible(true);
        setKbHeight(e.endCoordinates.height);
      },
    );
    const hide = Keyboard.addListener(
      ios ? "keyboardWillHide" : "keyboardDidHide",
      () => {
        setKbVisible(false);
        setKbHeight(0);
      },
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const scrollRef = useRef<ScrollView>(null);
  const scrollY = useRef(0);
  const viewportH = useRef(0);
  const contentH = useRef(0);

  const handleContentSizeChange = (_w: number, h: number) => {
    const prev = contentH.current;
    contentH.current = h;
    if (isReadOnly || !kbVisible || h <= prev || prev === 0) return;
    const wasNearBottom = prev - (scrollY.current + viewportH.current) < 80;
    if (wasNearBottom) {
      scrollRef.current?.scrollToEnd({ animated: false });
    }
  };

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

  const openDatePicker = () => {
    if (isReadOnly) return;
    Keyboard.dismiss();
    editor.blur();
    setShowDatePicker(true);
  }

  const openTimePicker = () => {
    if (isReadOnly) return;
    Keyboard.dismiss();
    editor.blur();
    setShowTimePicker(true);
  }

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
    html, body {
      overflow: hidden;
    }
    body, .ProseMirror {
      font-family: 'Gabarito', sans-serif !important;
    }
    .ProseMirror { min-height: 240px; outline: none; }
    body {
      background-color: ${colors.backgroundopacity};
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
    dynamicHeight: true,
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
  const displayTime = dayjs(`2000-01-01T${entryTime}`).format("h:mm A");

  const handleSave = async () => {
    const bodyText = (await editor.getText()).trim();
    if (!title.trim() && !bodyText && thumbs.length === 0) {
      dialog.alert(
        "Nothing to save",
        "Add a title, some text or a attachment before saving."
      );
      return;
    }
    const violation = checkRules(rules, {
      mood,
      title,
      bodyText,
      photoCount: visual.length,
    });
    if (violation) {
      dialog.alert(
        "Diary rule",
        violation.message,
        violation.field === "mood"
        ? [
          { text: "Cancel", style: "cancel" },
          { text: "Pick a mood", onPress: openMoodPicker },
        ]
        : [{ text: "OK" }],
      );
      return;
    }
    saveScale.value = withSequence(
      withTiming(0.92, { duration: 60 }),
      withSpring(1, { damping: 4, stiffness: 300 }),
    );
    play(celebrate);
    const contentHtml = await editor.getHTML();
    setIsReadOnly(true);
    handedOffRef.current = true;
    onSave(title, entryDate, contentHtml, { added, removedIds }, mood, entryTime);
  };

  const handleStartEditing = () => {
    setIsReadOnly(false);
    play(celebrate);
  };

  return (
    <ImageBackground source={background} style={{ flex: 1 }} resizeMode="cover">
      <SafeAreaView style={styles.container} edges={isReadOnly ? ["bottom", "left", "right"] : ["left", "right"]}>
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
            <Animated.View style={[saveStyle, !canEdit && { display: "none" }]}>
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

        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: 24 + (kbVisible ? kbHeight + TOOLBAR_H : 0) },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={16}
          onScroll={(e) => {
            scrollY.current = e.nativeEvent.contentOffset.y;
          }}
          onLayout={(e) => {
            viewportH.current = e.nativeEvent.layout.height;
          }}
          onContentSizeChange={handleContentSizeChange}
        >
          <TextInput
            accessibilityLabel="Entry title"
            style={styles.titleInput}
            placeholder="Add title"
            placeholderTextColor={colors.textMuted}
            value={title}
            onChangeText={setTitle}
            onFocus={() => setTitleFocused(true)}
            onBlur={() => setTitleFocused(false)}
            editable={!isReadOnly}
            returnKeyType="next"
            onSubmitEditing={() => editor.focus()}
          />

          <View style={styles.metaRow}>
            <PressableScale
              disabled={isReadOnly}
              onPress={openDatePicker}
              accessibilityRole="button"
              accessibilityLabel={`Date: ${displayDate}`}
              style={styles.chip}
            >
              <Ionicons name="calendar-outline" size={16} color={colors.accent} />
              <Text style={styles.chipText}>{displayDate}</Text>
            </PressableScale>
            <PressableScale
              disabled={isReadOnly}
              onPress={openTimePicker}
              accessibilityRole="button"
              accessibilityLabel={`Time: ${displayTime}`}
              style={styles.chip}
            >
              <Ionicons name="time-outline" size={16} color={colors.accent} />
              <Text style={styles.chipText}>{displayTime}</Text>
            </PressableScale>
            {(mood || !isReadOnly) && (
              <PressableScale
                disabled={isReadOnly}
                onPress={openMoodPicker}
                accessibilityRole="button"
                accessibilityLabel={
                  mood ? `Mood: ${MOODS[mood].label}. Change mood` : "Add mood"
                }
                style={styles.chip}
              >
                {mood ? (
                  <>
                    <MojiFace
                      mood={mood}
                      size={20}
                      animated
                      intro
                      introDelay={isReadOnly ? 300 : 0}
                    /* onBgChange = {(newMood:MoodKey) => {
                     switch(newMood){
                       case "angry":
                         setBackground(require("@/assets/images/mood-backgrounds/angry.jpg"))
                         break;
                       case "anxious":
                         setBackground(require("@/assets/images/mood-backgrounds/anxious.jpg"))
                         break;
                       case "awesome":
                         setBackground(require("@/assets/images/mood-backgrounds/awesome.jpg"))
                         break;
                       case "calm":
                         setBackground(require("@/assets/images/mood-backgrounds/calm.jpg"))
                         break;
                       case "happy":
                         setBackground(require("@/assets/images/mood-backgrounds/happy.jpg"))
                         break;
                       case "meh":
                         setBackground(require("@/assets/images/mood-backgrounds/meh.jpg"))
                         break;
                       case "sad":
                         setBackground(require("@/assets/images/mood-backgrounds/sad.jpg"))
                         break;
                       default:
                         break; 
                     }
                   }}*/
                    />
                    <Text style={styles.chipText}>{MOODS[mood].label}</Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="happy-outline" size={16} color={colors.accent} />
                    <Text style={styles.chipText}>Mood</Text>
                  </>
                )}
              </PressableScale>
            )}
          </View>
          {isReadOnly && authorLabel ? (
            <Text style={styles.authorText}>By {authorLabel}</Text>
          ) : null}

          {visual.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.mediaStrip}
              contentContainerStyle={styles.mediaStripContent}
            >
              {visual.map((t) => (
                <View style={{ width: 84, height: 84 }} key={t.key}>
                  <MediaThumb
                    uri={t.uri}
                    kind={t.kind as "image" | "video"}
                    label={t.kind === "image" ? "Photo" : "Video"}
                    hidden={viewing?.key === t.key}
                    borderRadius={10}
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
                </View>
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

          <View style={styles.divider} />
          <RichText
            editor={editor}
            style={styles.editor}
            scrollEnabled={false}
            bounces={false}
            overScrollMode="never"
          />
        </ScrollView>
        {!isReadOnly && (
          <KeyboardAvoidingView
            behavior="padding"
            style={styles.keyboardToolbarContainer}
            keyboardVerticalOffset={top}
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
          title="Entry date"
          isOpen={showDatePicker}
          onClose={() => setShowDatePicker(false)}
        >
          <View style={{ alignItems: "center" }}>
            <DatePicker
              itemTextStyle={{ color: colors.text }}
              date={entryDate}
              onDateChanged={({ date }: { date: string }) => setEntryDate(date)}
            />
          </View>
          <Button
            label="Done"
            onPress={() => setShowDatePicker(false)}
            style={{ marginTop: 16 }}
          />
        </AppModal>
        <AppModal
          title="Entry time"
          isOpen={showTimePicker}
          onClose={() => setShowTimePicker(false)}
        >
          <View style={{ alignItems: "center" }}>
            <TimeWheel value={entryTime} onChange={setEntryTime} />
          </View>
          <Button
            label="Done"
            onPress={() => setShowTimePicker(false)}
            style={{ marginTop: 16 }}
          />
        </AppModal>
      </SafeAreaView>
    </ImageBackground>
  );
}

const getStyles = (colors: ReturnType<typeof useTheme>["colors"]) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.backgroundopacity,
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
      backgroundColor: colors.backgroundopacity,
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
    titleInput: {
      fontFamily: fonts.heading,
      fontSize: 28,
      fontWeight: "700",
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 12,
      color: colors.text,
    },
    keyboardToolbarContainer: {
      position: "absolute",
      width: "100%",
      bottom: 0,
      borderTopColor: colors.border,
      backgroundColor: colors.backgroundopacity,
    },
    toolbarContainer: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
      backgroundColor: colors.backgroundopacity,
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
    scroll: {
      flex: 1,
      backgroundColor: colors.backgroundopacity,
    },
    scrollContent: {
      paddingBottom: 24,
    },
    metaRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "center",
      gap: 8,
      paddingHorizontal: 20,
      paddingBottom: 12,
    },
    chip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 999,
      backgroundColor: colors.surfaceHigh,
    },
    chipText: {
      fontFamily: fonts.label,
      fontSize: 13,
      color: colors.text,
    },
    authorText: {
      fontFamily: fonts.body,
      fontSize: 12,
      color: colors.textMuted,
      paddingHorizontal: 20,
      paddingBottom: 12,
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.border,
      marginHorizontal: 20,
      marginBottom: 8,
    },
    editor: {
      minHeight: 240,
      marginHorizontal: 20,
      backgroundColor: colors.backgroundopacity,
    },
  });