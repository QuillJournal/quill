import TutorialTip from "@/src/components/TutorialTip";
import useTheme from "@/src/hooks/useTheme";
import {
    createContext,
    useCallback,
    useContext,
    useMemo,
    useRef,
    useState,
    type ReactNode,
} from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";

type Rect = { x: number; y: number; width: number; height: number };
export type TutorialSpot = {
  step: number;
  rect: Rect;
  placement: "top" | "bottom";
  onSkip: () => void;
  onNext?: () => void;
  nextLabel?: string;
};
type Entry = TutorialSpot & { id: string };
type Api = {
  show: (id: string, spot: TutorialSpot) => void;
  hide: (id: string) => void;
};

const ActiveContext = createContext<Entry | null>(null);
const ApiContext = createContext<Api | null>(null);

export function useTutorial(): Api {
  const api = useContext(ApiContext);
  if (!api) throw new Error("useTutorial must be used inside TutorialProvider");
  return api;
}

export function TutorialProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState<Entry | null>(null);
  const show = useCallback(
    (id: string, spot: TutorialSpot) => setActive({ id, ...spot }),
    [],
  );
  const hide = useCallback(
    (id: string) => setActive((cur) => (cur?.id === id ? null : cur)),
    [],
  );
  const api = useMemo(() => ({ show, hide }), [show, hide]);
  return (
    <ApiContext.Provider value={api}>
      <ActiveContext.Provider value={active}>{children}</ActiveContext.Provider>
    </ApiContext.Provider>
  );
}

export function TutorialHost() {
  const spot = useContext(ActiveContext);
  if (!spot) return null;
  return <Overlay key={`${spot.id}:${spot.step}`} spot={spot} />;
}

const PAD = 6;
const GAP = 12;
const MARGIN = 12;
const ARROW = 14;
const clamp = (v: number, lo: number, hi: number) =>
    Math.min(Math.max(v, lo), Math.max(lo, hi));

function Overlay({ spot }: { spot: Entry }) {
    const { hide } = useTutorial();
    const { colors, radius } = useTheme();
    const win = useWindowDimensions();
    const rootRef = useRef<View>(null);
    const [origin, setOrigin] = useState({ x: 0, y: 0 });
    const [size, setSize] = useState({ width: win.width, height: win.height });
    const [card, setCard] = useState({ w: 0, h: 0 });

    const hx = spot.rect.x - origin.x - PAD;
    const hy = spot.rect.y - origin.y - PAD;
    const hw = spot.rect.width + PAD * 2;
    const hh = spot.rect.height + PAD * 2;
    const cx = hx + hw / 2;
    const dim = `${colors.shadow}99`;

    const fitsAbove = hy - GAP - card.h >= MARGIN;
    const fitsBelow = hy + hh + GAP + card.h <= size.height - MARGIN;
    let top = spot.placement === "top";
    if (top && !fitsAbove && fitsBelow) top = false;
    else if (!top && !fitsBelow && fitsAbove) top = true;

    const cardX = clamp(cx - card.w / 2, MARGIN, size.width - MARGIN - card.w);
  const cardY = top ? hy - GAP - card.h : hy + hh + GAP;
  const arrowLeft = clamp(cx - cardX - ARROW / 2, 16, card.w - 16 - ARROW);
  const ring = Math.abs(hw - hh) < 6 ? Math.min(hw, hh) / 2 : radius.lg;

  const pane = (style: object) => (
    <View style={[{ position: "absolute", backgroundColor: dim }, style]} />
  );

  return (
    <View
      ref={rootRef}
      pointerEvents="box-none"
      style={[StyleSheet.absoluteFill, { zIndex: 1000, elevation: 1000 }]}
      onLayout={(e) => {
        setSize(e.nativeEvent.layout);
        rootRef.current?.measureInWindow((x, y) => setOrigin({ x, y }));
      }}
    >
      <Animated.View
        entering={FadeIn.duration(200)}
        pointerEvents="box-none"
        style={StyleSheet.absoluteFill}
      >
        {pane({ left: 0, right: 0, top: 0, height: Math.max(0, hy) })}
        {pane({ left: 0, right: 0, top: hy + hh, bottom: 0 })}
        {pane({ left: 0, top: hy, width: Math.max(0, hx), height: hh })}
        {pane({ left: hx + hw, right: 0, top: hy, height: hh })}
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            left: hx,
            top: hy,
            width: hw,
            height: hh,
            borderRadius: ring,
            borderWidth: 2,
            borderColor: colors.accent,
          }}
        />
      </Animated.View>

      <View
        onLayout={(e) =>
          setCard({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })
        }
        style={{
          position: "absolute",
          left: cardX,
          top: cardY,
          opacity: card.h ? 1 : 0,
          backgroundColor: colors.card,
          borderRadius: radius.lg,
        }}
      >
        <TutorialTip
          step={spot.step}
          onSkip={() => {
            hide(spot.id);
            spot.onSkip();
          }}
          onNext={spot.onNext}
          nextLabel={spot.nextLabel}
        />
        <View
          style={[
            {
              position: "absolute",
              left: arrowLeft,
              width: ARROW,
              height: ARROW,
              backgroundColor: colors.card,
              transform: [{ rotate: "45deg" }],
            },
            top ? { bottom: -ARROW / 2 } : { top: -ARROW / 2 },
          ]}
        />
      </View>
    </View>
  );
}