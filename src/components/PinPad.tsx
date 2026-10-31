import { Ionicons } from "@expo/vector-icons";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { spacing } from "../constants/spacings";
import useTheme from "../hooks/useTheme";
import { haptic } from "../services/haptics";

type IconName = keyof typeof Ionicons.glyphMap;

type PinPadProps = {
    length: number;
    value: string;
    onChange: (next: string) => void;
    disabled?: boolean;
    hasError?: boolean;
    extraKeyIcon?: IconName;
    onExtraKeyPress?: () => void;
};

const DIGIT_ROWS = [
    ["1", "2", "3"],
    ["4", "5", "6"],
    ["7", "8", "9"],
];

function Key({
    onPress,
    disabled,
    label,
    children,
}: {
    onPress: () => void;
    disabled?: boolean;
    label: string;
    children: ReactNode;
}) {
    const { colors } = useTheme();
    return (
        <Pressable
            onPress={onPress}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel={label}
            style={({ pressed }) => [
                styles.key,
                {
                    backgroundColor: pressed ? colors.cardPressed : colors.card,
                    borderColor: colors.border,
                    opacity: disabled ? 0.5 : 1,
                },
            ]}
        >
            {children}
        </Pressable>
    );
}

export default function Pinpad({
    length,
    value,
    onChange,
    disabled = false,
    hasError = false,
    extraKeyIcon,
    onExtraKeyPress,
}: PinPadProps) {
    const { colors, fonts, fontSizes } = useTheme();
    const tone = hasError ? colors.danger : colors.accent;

    const press = (digit: string) => {
        if (disabled || value.length >= length) return;
        haptic.select();
        onChange(value + digit);
    };
    const backspace = () => {
        if (disabled || value.length === 0) return;
        haptic.select();
        onChange(value.slice(0, -1));
    };

    return (
        <View style={styles.root}>
            <View style={styles.dots}>
                {Array.from({ length }, (_, i) => (
                    <View
                        key={i}
                        style={[
                            styles.dot,
                            {
                                borderColor: tone,
                                backgroundColor: i < value.length ? tone : "transparent",
                            },
                        ]}
                    />
                ))}
            </View>

            {DIGIT_ROWS.map((row) => (
                <View key={row[0]} style={styles.row}>
                    {row.map((d) => (
                        <Key key={d} label={d} disabled={disabled} onPress={() => press(d)}>
                            <Text
                                style={{
                                    color: colors.text,
                                    fontFamily: fonts.heading,
                                    fontSize: fontSizes.xxl,
                                }}
                            >
                                {d}
                            </Text>
                        </Key>
                    ))}
                </View>
            ))}

            <View style={styles.row}>
                {extraKeyIcon && onExtraKeyPress ? (
                    <Key label="Unlock with biometrics" onPress={onExtraKeyPress}>
                        <Ionicons name={extraKeyIcon} size={28} color={colors.accent} />
                    </Key>
                ) : (
                    <View style={styles.spacer} />
                )}
                <Key label="0" disabled={disabled} onPress={() => press("0")}>
                    <Text
                        style={{
                            color: colors.text,
                            fontFamily: fonts.heading,
                            fontSize: fontSizes.xxl,
                        }}
                    >
                        0
                    </Text>
                </Key>
                <Key label="Delete" disabled={disabled} onPress={backspace}>
                    <Ionicons name="backspace-outline" size={28} color={colors.text} />
                </Key>
            </View>
        </View>
    );
}

const KEY_SIZE = 72;

const styles = StyleSheet.create({
    root: {
        alignItems: "center",
        gap: spacing.md
    },
    dots: {
        flexDirection: "row",
        gap: spacing.md,
        marginBottom: spacing.lg,
    },
    dot: {
        width: 14,
        height: 14,
        borderRadius: 7,
        borderWidth: 1.5,
    },
    row: {
        flexDirection: "row",
        gap: spacing.lg
    },
    key: {
        width: KEY_SIZE,
        height: KEY_SIZE,
        borderRadius: KEY_SIZE / 2,
        borderWidth: 1,
        alignItems: "center",
        justifyContent: "center",
    },
    spacer: {
        width: KEY_SIZE,
        height: KEY_SIZE,
    },
})