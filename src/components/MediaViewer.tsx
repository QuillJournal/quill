import { Image as ExpoImage } from "expo-image";
import { useVideoPlayer, VideoView } from "expo-video";
import { useEffect, useRef, useState } from "react";
import { Modal, Pressable, StyleSheet, useWindowDimensions, View } from "react-native";
import Animated, { Easing, interpolate, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { collapse, expand } from "../services/hapticPatterns";
import { playEvents as play } from "../services/haptics";
import { IconButton } from "./PressableScale";
import { getCachedThumb } from "./VideoThumb";

export interface Rect { x: number; y: number; width: number; height: number }
export interface ViewerItem {
  uri: string;
  kind: "image" | "video";
  width?: number | null;
  height?: number | null;
}

const DURATION = 280;
const FILL = StyleSheet.absoluteFill;

function VideoPane({ uri, active }: { uri: string; active: boolean }) {
  const player = useVideoPlayer(uri, (p) => { p.loop = false; });
  const poster = getCachedThumb(uri);

  useEffect(() => {
    if (active) player.play();
    else player.pause();
  }, [active, player]);

  return (
    <>
      {poster && <ExpoImage source={poster} style={FILL} contentFit="cover" />}
      <View style={[FILL, { opacity: active ? 1 : 0 }]}>
        <VideoView player={player} style={FILL} nativeControls={active} contentFit="contain" />
      </View>
    </>
  );
}

export default function MediaViewer({
  item, origin, onClose,
}: { item: ViewerItem | null; origin: Rect | null; onClose: () => void }) {
  const { width: SW, height: SH } = useWindowDimensions();
  const { top } = useSafeAreaInsets();
  const reduce = useReducedMotion();
  const duration = reduce ? 0 : DURATION;

  const progress = useSharedValue(0);
  const geo = useSharedValue({ ox: 0, oy: 0, ow: 0, oh: 0, tx: 0, ty: 0, tw: 0, th: 0 });
  const [shown, setShown] = useState<ViewerItem | null>(null);
  const [settled, setSettled] = useState(false);
  const closing = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (!item || !origin) return;
    const aspect =
      item.width && item.height ? item.width / item.height
      : item.kind === "video" ? 16 / 9
      : origin.width / origin.height;
    let tw = SW;
    let th = SW / aspect;
    if (th > SH) { th = SH; tw = SH * aspect; }

    geo.value = { ox: origin.x, oy: origin.y, ow: origin.width, oh: origin.height, tx: (SW - tw) / 2, ty: (SH - th) / 2, tw, th };
    closing.current = false;
    progress.value = 0;
    setSettled(false);
    setShown(item);

    const raf = requestAnimationFrame(() => {
      play(expand(duration));
      progress.value = withTiming(1, { duration, easing: Easing.out(Easing.cubic) });
      timer.current = setTimeout(() => setSettled(true), duration);
    });
    return () => { cancelAnimationFrame(raf); clearTimeout(timer.current); };
  }, [item, origin]);

  const requestClose = () => {
    if (closing.current) return;
    closing.current = true;
    play(collapse(duration));
    clearTimeout(timer.current);
    setSettled(false);
    progress.value = withTiming(0, { duration, easing: Easing.in(Easing.cubic) });
    timer.current = setTimeout(() => { setShown(null); onClose(); }, duration);
  };

  const boxStyle = useAnimatedStyle(() => {
    const p = progress.value;
    const g = geo.value;
    return {
      position: "absolute",
      left: interpolate(p, [0, 1], [g.ox, g.tx]),
      top: interpolate(p, [0, 1], [g.oy, g.ty]),
      width: interpolate(p, [0, 1], [g.ow, g.tw]),
      height: interpolate(p, [0, 1], [g.oh, g.th]),
      borderRadius: interpolate(p, [0, 1], [10, 0]),
      overflow: "hidden",
    };
  });
  const backdropStyle = useAnimatedStyle(() => ({ opacity: progress.value }));
  const controlsStyle = useAnimatedStyle(() => ({ opacity: interpolate(progress.value, [0.7, 1], [0, 1], "clamp") }));

  return (
    <Modal visible={!!shown} transparent animationType="none" statusBarTranslucent navigationBarTranslucent onRequestClose={requestClose}>
      <View style={FILL}>
        <Animated.View style={[FILL, { backgroundColor: "black" }, backdropStyle]} />
        {shown && (
          <Animated.View style={boxStyle}>
            {shown.kind === "image" ? (
              <Pressable style={FILL} onPress={requestClose} accessibilityRole="button" accessibilityLabel="Close image">
                <ExpoImage source={{ uri: shown.uri }} style={FILL} contentFit="cover" transition={0} />
              </Pressable>
            ) : (
              <VideoPane uri={shown.uri} active={settled} />
            )}
          </Animated.View>
        )}
        <Animated.View style={[{ position: "absolute", top: top + 8, right: 8 }, controlsStyle]} pointerEvents={settled ? "auto" : "none"}>
          <IconButton icon="close" label="Close viewer" onPress={requestClose} color="white" size={26} />
        </Animated.View>
      </View>
    </Modal>
  );
}