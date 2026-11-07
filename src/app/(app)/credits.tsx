import HapticLottie from "@/src/components/HapticLottie";
import { useUserSession } from "@/src/context/UserSessionContext";
import useTheme from "@/src/hooks/useTheme";
import { haptic } from "@/src/services/haptics";
import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { useRouter } from "expo-router";
import { ReactNode, useState } from "react";
import {
    Image,
    ImageSourcePropType,
    Pressable,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import Animated, {
    FadeInDown,
    FadeOut,
    useAnimatedStyle,
    useSharedValue,
    withSequence,
    withSpring,
    withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const JYOSHITA_ART: ImageSourcePropType[] = [require("@/assets/images/empty.png"), require("@/assets/images/logo.png")];

const version = Constants.nativeAppVersion ?? Constants.expoConfig?.version ?? "dev";
const build = Constants.nativeBuildVersion;

type PersonCardProps = {
    index: number;
    name: string;
    role: string;
    blurb: string;
    tags: string[];
    hint?: string;
    onPress?: () => void;
    children?: ReactNode;
};

function PersonCard({
    index,
    name,
    role,
    blurb,
    tags,
    hint,
    onPress,
    children,
}: PersonCardProps) {
    const { colors, fonts, fontSizes, spacing, radius } = useTheme();
    const scale = useSharedValue(1);
    const anim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

    const handlePress = () => {
        scale.value = withSequence(
            withTiming(0.96, { duration: 80 }),
            withSpring(1, { damping: 4, stiffness: 240 }),
        );
        onPress?.();
    };

    return (
        <Animated.View entering={FadeInDown.delay(150 + index * 140).springify()}>
            <Animated.View style={anim}>
                <Pressable
                    disabled={!onPress}
                    onPress={handlePress}
                    accessibilityRole={onPress ? "button" : undefined}
                    style={{
                        backgroundColor: colors.card,
                        borderColor: colors.border,
                        borderWidth: 1,
                        borderRadius: radius.md,
                        padding: spacing.lg,
                        gap: spacing.md,
                    }}
                >
                    <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
                        <View
                            style={{
                                width: 52,
                                height: 52,
                                borderRadius: 26,
                                backgroundColor: colors.accent,
                                alignItems: "center",
                                justifyContent: "center",
                            }}
                        >
                            <Text
                                style={{
                                    color: colors.textOnAccent,
                                    fontFamily: fonts.heading,
                                    fontSize: fontSizes.lg,
                                }}
                            >
                                {name.charAt(0)}
                            </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text
                                style={{
                                    color: colors.text,
                                    fontFamily: fonts.heading,
                                    fontSize: fontSizes.lg,
                                }}
                            >
                                {name}
                            </Text>
                            <Text
                                style={{
                                    color: colors.textMuted,
                                    fontFamily: fonts.label,
                                    fontSize: fontSizes.sm,
                                }}
                            >
                                {role}
                            </Text>
                        </View>
                    </View>

                    <Text
                        style={{
                            color: colors.text,
                            fontFamily: fonts.body,
                            fontSize: fontSizes.md,
                            lineHeight: fontSizes.md * 1.5,
                        }}
                    >
                        {blurb}
                    </Text>

                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.xs }}>
                        {tags.map((t) => (
                            <View
                                key={t}
                                style={{
                                    paddingHorizontal: 10,
                                    paddingVertical: 4,
                                    borderRadius: 999,
                                    borderWidth: 1,
                                    borderColor: colors.border,
                                }}
                            >
                                <Text
                                    style={{
                                        color: colors.textMuted,
                                        fontFamily: fonts.label,
                                        fontSize: fontSizes.xs,
                                    }}
                                >
                                    {t}
                                </Text>
                            </View>
                        ))}
                    </View>

                    {hint && (
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                            <Ionicons name="phone-portrait-outline" size={14} color={colors.accent} />
                            <Text
                                style={{
                                    color: colors.accent,
                                    fontFamily: fonts.label,
                                    fontSize: fontSizes.xs,
                                }}
                            >
                                {hint}
                            </Text>
                        </View>
                    )}

                    {children}
                </Pressable>
            </Animated.View>
        </Animated.View>
    );
}

function YouCard() {
    const { colors, fonts, fontSizes, spacing, radius } = useTheme();
    const { session } = useUserSession();
    const [imageFailed, setImageFailed] = useState(false);
    const showPhoto = !!session?.photoUri && !imageFailed;
    const name = session?.name || "You";

    return (
        <Animated.View
            entering={FadeInDown.springify().damping(12)}
            exiting={FadeOut}
            style={{
                alignItems: "center",
                gap: spacing.sm,
                padding: spacing.lg,
                backgroundColor: colors.card,
                borderColor: colors.border,
                borderWidth: 1.5,
                borderRadius: radius.md,
            }}
        >
            {showPhoto ? (
                <Image
                    source={{ uri: session!.photoUri! }}
                    onError={() => setImageFailed(true)}
                    style={{
                        width: 88,
                        height: 88,
                        borderRadius: 44,
                        borderWidth: 2,
                        borderColor: colors.accent,
                    }}
                />
            ) : (
                <View
                    style={{
                        width: 88,
                        height: 88,
                        borderRadius: 44,
                        backgroundColor: colors.accent,
                        alignItems: "center",
                        justifyContent: "center",
                    }}
                >
                    <Text
                        style={{
                            color: colors.textOnAccent,
                            fontFamily: fonts.heading,
                            fontSize: fontSizes.xxl,
                        }}
                    >
                        {name.charAt(0).toUpperCase()}
                    </Text>
                </View>
            )}
            <Text
                style={{
                    color: colors.text,
                    fontFamily: fonts.heading,
                    fontSize: fontSizes.lg,
                }}
            >
                {name}
            </Text>
            <Text
                style={{
                    color: colors.textMuted,
                    fontFamily: fonts.body,
                    fontSize: fontSizes.md,
                    lineHeight: fontSizes.md * 1.5,
                    textAlign: "center",
                }}
            >
                {"Yep, you and the amazing users like you made Quill possible :)"}
            </Text>
            <Ionicons name="heart" size={18} color={colors.accent} />
        </Animated.View>
    )
}
function HapticShowcase() {
    const { colors, fonts, fontSizes, spacing } = useTheme();
    const [hapticsOn, setHapticsOn] = useState(false);

    return (
        <View style={{ alignItems: "center", gap: spacing.sm }}>
            <HapticLottie size={190} haptics={hapticsOn} />
            <Pressable
                onPress={() => setHapticsOn((v) => !v)}
                hitSlop={8}
                accessibilityRole="switch"
                accessibilityState={{ checked: hapticsOn }}
                accessibilityLabel="Toggle haptic demo"
                style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: hapticsOn ? colors.accent : colors.border,
                }}
            >
                <Ionicons
                    name={hapticsOn ? "pulse" : "ban-outline"}
                    size={16}
                    color={hapticsOn ? colors.accent : colors.textMuted}
                />
                <Text
                    style={{
                        color: hapticsOn ? colors.accent : colors.textMuted,
                        fontFamily: fonts.label,
                        fontSize: fontSizes.xs,
                    }}
                >
                    {hapticsOn ? "Haptics on · tap to stop" : "Haptics off · tap to feel it"}
                </Text>
            </Pressable>
        </View>
    )
}
export default function CreditsScreen() {
    const { colors, fonts, fontSizes, spacing, radius } = useTheme();
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const [showYou, setShowYou] = useState(false);

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{
                    paddingTop: insets.top + spacing.sm,
                    paddingBottom: insets.bottom + spacing.xl,
                    paddingHorizontal: spacing.lg,
                    gap: spacing.lg,
                }}
            >
                <TouchableOpacity
                    onPress={() => router.back()}
                    hitSlop={12}
                    accessibilityRole="button"
                    accessibilityLabel="Back"
                    style={{
                        width: 38,
                        height: 38,
                        borderRadius: 19,
                        backgroundColor: colors.card,
                        borderWidth: 1,
                        borderColor: colors.border,
                        alignItems: "center",
                        justifyContent: "center",
                    }}
                >
                    <Ionicons name="chevron-back" size={20} color={colors.text} />
                </TouchableOpacity>

                <Animated.View entering={FadeInDown.springify()} style={{ gap: spacing.sm }}>
                    <Pressable
                        onPress={() => {
                            if (showYou) haptic.tap();
                            else haptic.success();
                            setShowYou((v) => !v);
                        }}
                    >
                        <Text
                            style={{
                                color: colors.text,
                                fontFamily: fonts.heading,
                                fontSize: fontSizes.xxxl,
                            }}
                        >
                            People who made Quill possible
                        </Text>
                    </Pressable>
                    <View
                        style={{
                            alignSelf: "flex-start",
                            paddingHorizontal: 12,
                            paddingVertical: 5,
                            borderRadius: 999,
                            backgroundColor: colors.card,
                            borderWidth: 1,
                            borderColor: colors.border,
                        }}
                    >
                        <Text
                            style={{
                                color: colors.textMuted,
                                fontFamily: fonts.label,
                                fontSize: fontSizes.xs,
                            }}
                        >
                            Version {version}
                            {build ? ` (${build})` : ""}
                        </Text>
                    </View>
                    <Text
                        style={{
                            color: colors.textMuted,
                            fontFamily: fonts.body,
                            fontSize: fontSizes.md,
                        }}
                    >
                        Made with ♡ by 3 people from Egypt, the US and India!
                    </Text>
                </Animated.View>

                {showYou && <YouCard />}

                <PersonCard
                    index={0}
                    name="NiceSapien"
                    role="Idea & feel"
                    blurb="Came up with Quill and built the end-to-end encryption, the animations and the haptics."
                    tags={["Idea", "Encryption", "Animations", "Haptics"]}
                >
                    <HapticShowcase />
                </PersonCard>

                {showYou &&
                    <PersonCard
                        index={1}
                        name="Amru"
                        role="Nerd (don't tell him I said that)"
                        blurb={"Organized the code, did the nerdy stuff everyone else was too lazy to do, designed a lot of the UI and built the timeline features."}
                        tags={["Architecture", "UI design", "Timeline"]}
                    />
                }
                {!showYou &&
                    <PersonCard
                        index={1}
                        name="Amru"
                        role="Code & structure"
                        blurb={"Organized the code, did the nerdy stuff everyone else was too lazy to do, designed a lot of the UI and built the timeline features."}
                        tags={["Architecture", "UI design", "Timeline"]}
                    />
                }
                <PersonCard
                    index={2}
                    name="Jyoshita"
                    role="Art & design"
                    blurb="Designed much of Quill's art and some of the UI, and helped out with all sorts of other stuff."
                    tags={["Art", "UI design"]}
                >
                    {JYOSHITA_ART.length > 0 ? (
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={{ gap: spacing.sm }}
                        >
                            {JYOSHITA_ART.map((src, i) => (
                                <Image
                                    key={i}
                                    source={src}
                                    resizeMode="cover"
                                    style={{
                                        width: 150,
                                        height: 190,
                                        borderRadius: radius.md,
                                        borderWidth: 1,
                                        borderColor: colors.border,
                                    }}
                                />
                            ))}
                        </ScrollView>
                    ) : (
                        <View
                            style={{
                                height: 140,
                                borderRadius: radius.md,
                                borderWidth: 1,
                                borderStyle: "dashed",
                                borderColor: colors.border,
                                alignItems: "center",
                                justifyContent: "center",
                                gap: 6,
                            }}
                        >
                            <Ionicons name="brush-outline" size={24} color={colors.textMuted} />
                            <Text
                                style={{
                                    color: colors.textMuted,
                                    fontFamily: fonts.label,
                                    fontSize: fontSizes.sm,
                                }}
                            >
                                Her art goes here
                            </Text>
                        </View>
                    )}
                </PersonCard>

                <Text
                    style={{
                        color: colors.textMuted,
                        fontFamily: fonts.body,
                        fontSize: fontSizes.xs,
                        textAlign: "center",
                        marginTop: spacing.sm,
                    }}
                >
                    Your diaries are end-to-end encrypted. Only you and the people you invite can read them.
                </Text>
            </ScrollView>
        </View>
    )
}