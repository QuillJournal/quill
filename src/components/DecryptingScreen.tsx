import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { radius } from "../constants/radius";
import { spacing } from "../constants/spacings";
import { fonts, fontSizes } from "../constants/typography";
import useTheme from "../hooks/useTheme";
import { useSyncProgress } from "../services/syncEngine";

export default function DecryptingScreen() {
    const { colors } = useTheme();
    const { label, fraction } = useSyncProgress();
    const pct = Math.round(Math.min(1, Math.max(0, fraction)) * 100);

    return (
        <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
            <ActivityIndicator size="large" color={colors.accent} />
            <Text style={[styles.title, { color: colors.text }]}>Decrypting</Text>
            <Text style={[styles.label, { color: colors.textMuted }]}>{label}</Text>
            <View style={[styles.track, { backgroundColor: colors.border }]}>
                <View
                style={[
                    styles.fill,
                    { backgroundColor: colors.accent, width: `${pct}%` },
                ]}
                />
            </View>
            <Text style={[styles.pct, { color: colors.textMuted }]}>{pct}%</Text>
        </SafeAreaView>
    )
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFill,
    zIndex: 10,
    elevation: 10,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  title: { fontFamily: fonts.heading, fontSize: fontSizes.xl },
  label: { fontFamily: fonts.body, fontSize: fontSizes.sm, textAlign: "center" },
  track: {
    width: "100%",
    height: 8,
    borderRadius: radius.md,
    overflow: "hidden",
  },
  fill: { height: "100%" },
  pct: { fontFamily: fonts.label, fontSize: fontSizes.xs },
});