import { useTutorial } from "@/src/context/TutorialContext";
import {
    useCallback,
    useEffect,
    useId,
    useRef,
    type ReactElement,
} from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";

type Props = {
    step: number;
    visible: boolean;
    onSkip: () => void;
    onNext?: () => void;
    nextLabel?: string;
    placement?: "top" | "bottom";
    parentWrappedStyle?: StyleProp<ViewStyle>;
    children: ReactElement;
};

export default function TutorialTooltip({
    step,
    visible,
    onSkip,
    onNext,
    nextLabel,
    placement = "bottom",
    parentWrappedStyle,
    children,
}: Props) {
    const ref = useRef<View>(null);
    const { show, hide } = useTutorial();
    const id = useId();
    const live = useRef(false);
    const skipRef = useRef(onSkip);
    skipRef.current = onSkip;
    const nextRef = useRef(onNext);
    nextRef.current = onNext;
    const hasNext = !!onNext;
    const measure = useCallback(() => {
        ref.current?.measureInWindow((x, y, width, height) => {
            if (!live.current || !width || !height) return;
            show(id, {
                step,
                rect: { x, y, width, height },
                placement,
                onSkip: () => {
                    live.current = false;
                    skipRef.current();
                },
                onNext: hasNext ? () => nextRef.current?.() : undefined,
                nextLabel,
            });
        });
    }, [id, show, step, placement, hasNext, nextLabel]);

    useEffect(() => {
        if (!visible) return;
        live.current = true;
        measure();
        const timers = [350, 900].map((ms) => setTimeout(measure, ms));
        return () => {
            live.current = false;
            timers.forEach(clearTimeout);
            hide(id);
        };
    }, [visible, measure, hide, id]);

    return (
        <View
        ref={ref}
        collapsable={false}
        onLayout={visible ? measure : undefined}
        style={parentWrappedStyle}
        >
            {children}
        </View>
    )
}