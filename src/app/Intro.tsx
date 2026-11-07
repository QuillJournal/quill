import BestMoments from "@/assets/images/bestmoments.svg";
import MoodSvg from "@/assets/images/mood.svg";
import OSS from "@/assets/images/oss.svg";
import PrivateSvg from "@/assets/images/private.svg";
import { spacing } from "@/src/constants/spacings";
import { fonts, fontSizes } from "@/src/constants/typography";
import useTheme from "@/src/hooks/useTheme";
import { useRouter } from "expo-router";
import LottieView from "lottie-react-native";
import type { FC } from "react";
import { useEffect, useRef, useState } from "react";
import {
    Animated,
    Dimensions,
    Easing,
    FlatList,
    NativeScrollEvent,
    NativeSyntheticEvent,
    Pressable,
    StyleSheet,
    Text,
    View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { SvgProps } from "react-native-svg";
import Button from "../components/Button";
import { trampoline, trampolineBeats } from "../services/hapticPatterns";
import { playTimeline } from "../services/haptics";
const width:number = Dimensions.get("window").width;

type Page = { photo?: FC<SvgProps>; lottie?: boolean; text: string; subtext: string };

const LOTTIE_FILE = require("@/assets/images/orgasm.lottie");
const LOTTIE_FPS = 30;
const LOTTIE_FRAMES = 165;
const LOOP_MS = (LOTTIE_FRAMES / LOTTIE_FPS) * 1000;

const AnimatedLottieView = Animated.createAnimatedComponent(LottieView);

function OrgasmLottie({ active, size }: { active: boolean; size: number }) {
    const progress = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (!active) {
            progress.setValue(0);
            return;
        }

        let stopped = false;
        let anim: Animated.CompositeAnimation | null = null;
        let stopHaptics = () => {};

        const runLoop = () => {
            if (stopped) return;
            progress.setValue(0);
            stopHaptics();
            stopHaptics = playTimeline(trampoline, trampolineBeats);
            anim = Animated.timing(progress, {
                toValue: 1,
                duration: LOOP_MS,
                easing: Easing.linear,
                useNativeDriver: false,
            });
            anim.start(({ finished }) => {
                if (finished) runLoop();
            });
        };
        runLoop();

        return () => {
            stopped = true;
            anim?.stop();
            stopHaptics();
            progress.setValue(0);
        };
    }, [active, progress]);

    return (
        <AnimatedLottieView
        source={LOTTIE_FILE}
        progress={progress}
        style={{ width: size, height: size }}
        />
    );
}

export default function Intro(){
    const activeRef = useRef<FlatList>(null)
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const colors = useTheme();
    const pages: Page[] = [
        {photo: BestMoments, text: "Life's best moments with friends.", subtext: "Welcome to one of the most private journaling apps you'll find in the entire world!"},
        {photo: PrivateSvg, text: "Private by design.", subtext: "Quill was built with privacy and security in mind from the ground up. Quill is engineered to use the latest cryptographic techniques to ensure zero-knowledge end to end encryption for your data. This means that no one except you and the people you choose can see your data - not even us."},
        {photo: OSS, text: "Open Source.", subtext: "The app is open source on GitHub - so you can audit the code yourself, or create your own build for complete privacy and even setup a local home server to access it without internet anytime."},
        {photo: MoodSvg, text: "Add moods and share diaries.", subtext: "Create a shared diary with your friends - and write your life's moments in it. Add your mood to the entry to let your friends know how you're feeling and reflect on your feelings!"},
        {lottie: true, text: "Pleasing experience.", subtext: "We've engineered and designed the app's lovely art, animations, tactile haptics, and interface to make every click & tap feel alive."},
    ]
    const loopedPages = [...pages, pages[0]];
    const [page, setPage] = useState(0);
    const isLast = page === pages.length - 1;
    const [ctaReady, setCtaReady] = useState(false);

    useEffect(() => {
        if (!isLast) {
            setCtaReady(false);
            return;
        }
        const id = setTimeout(() => setCtaReady(true), 2000);
        return () => clearTimeout(id);
    }, [isLast]);
    const scrollX = useRef(new Animated.Value(0)).current;

    const animate = ({item}:{item: Page}) => {
        return(
            <View style = {styles.card}> 
            <View style={styles.artWrap}>
                    {item.lottie
                    ? <OrgasmLottie active={page === pages.length - 1} size={width * 0.5} />
                    : item.photo && <item.photo width={width * 0.5} height={width * 0.5} />}
                    </View>
                    <Text style={styles.text}>{item.text}</Text>
                    <Text style={styles.subtext}>{item.subtext}</Text>
            </View>
        );
    }
    const styles = StyleSheet.create({
        page: {
            flex: 1,
            backgroundColor: colors.colors.background,
            gap: spacing.lg,
        },
        container: {
            flex: 1,
            width: width,
        },
        card: {
            width: width,
            paddingHorizontal: spacing.xl,
            alignItems: "center",
            justifyContent: "center",
            gap: spacing.md,
        },
        artWrap: {
            width: width * 0.65,
            height: width * 0.65,
            borderRadius: width * 0.325,
           // backgroundColor: colors.colors.accentContainer,
            alignItems: "center",
            justifyContent: "center",
            marginBottom: spacing.md,
        },
        art: {
            width: width * 0.5,
            height: width * 0.5,
        },
        text: {
            color: colors.colors.text,
            fontFamily: fonts.heading,
            fontSize: fontSizes.xxl,
            textAlign: "center",
        },
        subtext: {
            color: colors.colors.textMuted,
            fontFamily: fonts.body,
            fontSize: fontSizes.md,
            lineHeight: fontSizes.md * 1.5,
            textAlign: "center",
        },
        scrollers: {
            flexDirection: "row",
            gap: spacing.sm,
            alignItems: "center",
            justifyContent: "center",
        },
        dot: {
            height: 8,
            borderRadius: 4,
            backgroundColor: colors.colors.accent,
        },
        button: {
            width: width - spacing.lg * 2,
            alignSelf: "center",
        },
    });
    const goTo = (index: number, animated: boolean) => {
        activeRef.current?.scrollToIndex({ index, animated });
        if (!animated) setPage(index);
    };
    const onMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
        const index = Math.round(e.nativeEvent.contentOffset.x / width);
        if (index === pages.length) goTo(0, false);
        else setPage(index);
    };
    return(
        <View style={[styles.page, { paddingTop: insets.top, paddingBottom: insets.bottom + spacing.lg }]}>
            <View style = {styles.container}>
                <Animated.FlatList
                ref={activeRef}
                data={loopedPages}
                extraData={page}
                renderItem={animate}
                keyExtractor={(_, index) => index.toString()}
                pagingEnabled
                horizontal
                showsHorizontalScrollIndicator={false}
                decelerationRate="fast"
                directionalLockEnabled
                disableIntervalMomentum
                scrollEventThrottle={16}
                onScroll = {Animated.event(
                    [{ nativeEvent: { contentOffset: {x: scrollX}}}],
                    { useNativeDriver: false }
                )}
                onMomentumScrollEnd={onMomentumEnd}
                getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
                />
            </View>
            {/* scrollers/ page dots */}
            <View style = {styles.scrollers}> 
                {pages.map((_, i) => {
                    const n = pages.length;
                    const inputRange = i === 0
                    ? [-width, 0, width, (n - 1) * width, n * width]
                    : [(i - 1) * width, i * width, (i + 1) * width];
                    const dotWidth = scrollX.interpolate({
                        inputRange,
                        outputRange: i === 0 ? [8, 28, 8, 8, 28] : [8, 28, 8],
                        extrapolate: "clamp",
                    });
                    const dotOpacity = scrollX.interpolate({
                        inputRange,
                        outputRange: i === 0 ? [0.3, 1, 0.3, 0.3, 1] : [0.3, 1, 0.3],
                        extrapolate: "clamp",
                    });
                    return (
                        <Pressable key={i} hitSlop={12} onPress={() => goTo(i, true)}>
                            <Animated.View style={[styles.dot, { width: dotWidth, opacity: dotOpacity }]} />
                        </Pressable>
                    )
                })} 
            </View> 
        <Button
        label={isLast ? "Get Started" : "Next"}
        disabled={isLast && !ctaReady}
        onPress={() => {
            if (isLast) router.replace("/(auth)/login");
            else goTo(page + 1, true);
        }}
        style={styles.button}
        />
        </View>
    );

}
