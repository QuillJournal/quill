import { Ionicons } from "@expo/vector-icons";
import { Image as ExpoImage } from "expo-image";
import { useRef } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
    FadeIn,
    FadeOut,
    LinearTransition,
} from "react-native-reanimated";
import useTheme from "../hooks/useTheme";
import type { Rect } from "./MediaViewer";
import PressableScale from "./PressableScale";
import VideoThumb from "./VideoThumb";

interface Props {
  uri: string;
  kind: "image" | "video";
  label: string;
  hidden: boolean;
  borderRadius: number;
  onOpen: (origin: Rect) => void;
  onRemove?: () => void;
}
const blurhash = "L6PZfSi_00os00j[fQfQ00fQfQfQ";

export default function MediaThumb({
  uri,
  kind,
  label,
  hidden,
  borderRadius,
  onOpen,
  onRemove,
}: Props) {
  const { colors } = useTheme();
  const ref = useRef<View>(null);

  const open = () =>
    ref.current?.measureInWindow((x, y, width, height) =>
      onOpen({ x, y, width, height }),
    );

  return (
    <Animated.View
      entering={FadeIn.duration(180)}
      exiting={FadeOut.duration(150)}
      layout={LinearTransition}
      style={styles.wrap}
    >
      <View
        ref={ref}
        collapsable={false}
        style={[styles.media, { opacity: hidden ? 0 : 1, borderRadius }]}
      >
        <PressableScale
          borderless={false}
          scaleTo={0.96}
          onPress={open}
          accessibilityRole="imagebutton"
          accessibilityLabel={`${label}. Double tap to view full screen.`}
          style={StyleSheet.absoluteFill}
        >
          {kind === "image" ? (
            <ExpoImage
              source={{ uri }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              placeholder={{ blurhash }}
              transition={1000}
            />
          ) : (
            <VideoThumb uri={uri} style={StyleSheet.absoluteFill} />
          )}
        </PressableScale>
      </View>
      {onRemove && !hidden && (
        <PressableScale
          onPress={onRemove}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={`Remove ${label}`}
          style={[styles.remove, { backgroundColor: colors.surface }]}
        >
          <Ionicons name="close" size={14} color={colors.text} />
        </PressableScale>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  media: { flex: 1, overflow: "hidden" },
  remove: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
});
