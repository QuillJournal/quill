import { Ionicons } from "@expo/vector-icons";
import Slider from "@react-native-community/slider";
import {
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
} from "expo-audio";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  FadeInDown,
  FadeOut,
  LinearTransition,
} from "react-native-reanimated";
import useTheme from "../hooks/useTheme";
import { formatDuration } from "../utils/formatDuration";
import PressableScale, { IconButton } from "./PressableScale";

const RATES = [1, 1.5, 2, 0.75];

interface Props {
  uri: string;
  name: string;
  durationMs?: number | null;
  onRemove?: () => void;
}

export default function AudioRow({ uri, name, durationMs, onRemove }: Props) {
  const { colors } = useTheme();
  const player = useAudioPlayer(uri, { updateInterval: 100 });
  const status = useAudioPlayerStatus(player);
  const [scrub, setScrub] = useState<number | null>(null);
  const [rateIdx, setRateIdx] = useState(0);

  useEffect(() => {
    setAudioModeAsync({
      playsInSilentMode: true,
      allowsRecording: false,
    }).catch(() => {});
  }, []);

  const duration =
    status.duration > 0 ? status.duration : (durationMs ?? 0) / 1000;
  const position = Math.min(scrub ?? status.currentTime, duration || 0);

  const toggle = async () => {
    if (status.playing) return player.pause();
    if (duration > 0 && status.currentTime >= duration - 0.15)
      await player.seekTo(0);
    player.play();
  };
  const skip = (d: number) =>
    player.seekTo(
      Math.min(
        Math.max(status.currentTime + d, 0),
        duration || status.currentTime,
      ),
    );
  const cycleRate = () => {
    const next = (rateIdx + 1) % RATES.length;
    setRateIdx(next);
    player.setPlaybackRate(RATES[next]);
  };

  return (
    <Animated.View
      entering={FadeInDown.duration(220)}
      exiting={FadeOut.duration(150)}
      layout={LinearTransition}
      style={[
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <View style={styles.head}>
        <Ionicons name="musical-notes" size={16} color={colors.accent} />
        <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
          {name}
        </Text>
        {onRemove && (
          <IconButton
            icon="close"
            label={`Remove ${name}`}
            onPress={onRemove}
            color={colors.textMuted}
            size={18}
            style={styles.small}
          />
        )}
      </View>

      <Slider
        style={styles.slider}
        minimumValue={0}
        maximumValue={Math.max(duration, 0.01)}
        value={position}
        disabled={duration <= 0}
        minimumTrackTintColor={colors.accent}
        maximumTrackTintColor={colors.border}
        thumbTintColor={colors.accent}
        onSlidingStart={() => setScrub(status.currentTime)}
        onValueChange={(v) => scrub !== null && setScrub(v)}
        onSlidingComplete={async (v) => {
          await player.seekTo(v);
          setScrub(null);
        }}
        accessibilityLabel={`Seek ${name}`}
        accessibilityValue={{
          text: `${formatDuration(position)} of ${formatDuration(duration)}`,
        }}
      />

      <View style={styles.foot}>
        <Text style={[styles.time, { color: colors.textMuted }]}>
          {formatDuration(position)} / {formatDuration(duration)}
        </Text>
        <View style={styles.transport}>
          <IconButton
            icon="play-back"
            label="Back 10 seconds"
            onPress={() => skip(-10)}
            color={colors.text}
            size={20}
          />
          <IconButton
            icon={status.playing ? "pause-circle" : "play-circle"}
            label={status.playing ? "Pause" : "Play"}
            onPress={toggle}
            color={colors.accent}
            size={40}
          />
          <IconButton
            icon="play-forward"
            label="Forward 10 seconds"
            onPress={() => skip(10)}
            color={colors.text}
            size={20}
          />
        </View>
        <PressableScale
          onPress={cycleRate}
          borderless={false}
          accessibilityRole="button"
          accessibilityLabel={`Playback speed ${RATES[rateIdx]}x. Double tap to change`}
          style={[styles.rate, { borderColor: colors.border }]}
        >
          <Text style={[styles.rateText, { color: colors.text }]}>
            {RATES[rateIdx]}x
          </Text>
        </PressableScale>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 20,
    marginBottom: 10,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 6,
    borderRadius: 14,
    borderWidth: 1,
  },
  head: { flexDirection: "row", alignItems: "center", gap: 8 },
  name: { flex: 1, fontSize: 14, fontWeight: "600" },
  small: { minWidth: 32, minHeight: 32 },
  slider: { width: "100%", height: 36, marginTop: 2 },
  foot: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  time: { fontSize: 12, fontVariant: ["tabular-nums"], minWidth: 78 },
  transport: { flexDirection: "row", alignItems: "center" },
  rate: {
    minWidth: 48,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  rateText: { fontSize: 12, fontWeight: "700" },
});
