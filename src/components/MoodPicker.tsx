import { MOOD_KEYS, MOODS, type MoodKey } from "@/src/constants/moods";
import { fonts, fontSizes } from "@/src/constants/typography";
import useTheme from "@/src/hooks/useTheme";
import { haptic } from "@/src/services/haptics";
import { StyleSheet, Text, View } from "react-native";
import MojiFace from "./MojiFace";
import PressableScale from "./PressableScale";
import AppModal from "./ui/AppModal";

type Props = {
    isOpen: boolean;
    value: MoodKey | null;
    onSelect: (mood: MoodKey | null) => void;
    onClose: () => void;
};

export default function MoodPicker({ isOpen, value, onSelect, onClose }: Props) {
    const { colors } = useTheme();
    const styles = getStyles(colors);

    const handlePick = (key: MoodKey) => {
        haptic.select();
        onSelect(value === key ? null : key);
        onClose();
    };

    return (
    <AppModal title="How are you feeling?" isOpen={isOpen} onClose={onClose}>
      <View style={styles.grid}>
        {MOOD_KEYS.map((key) => {
          const selected = value === key;
          return (
            <PressableScale
              key={key}
              onPress={() => handlePick(key)}
              accessibilityRole="button"
              accessibilityLabel={MOODS[key].label}
              accessibilityState={{ selected }}
              style={styles.item}
            >
              <View style={[styles.ring, selected && styles.ringSelected]}>
                <MojiFace mood={key} size={52} />
              </View>
              <Text style={[styles.label, selected && styles.labelSelected]}>
                {MOODS[key].label}
              </Text>
            </PressableScale>
          );
        })}
      </View>
      <Text style={styles.hint}>Your mood will be visible to everyone in the diary. Tap on a selected mood to clear it.</Text>
    </AppModal>
  );
}

const getStyles = (colors: ReturnType<typeof useTheme>["colors"]) =>
  StyleSheet.create({
    grid: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "center",
      gap: 16,
      paddingVertical: 8,
    },
    item: {
      width: 76,
      alignItems: "center",
      gap: 6,
    },
    ring: {
      padding: 4,
      borderRadius: 999,
      borderWidth: 2,
      borderColor: "transparent",
    },
    ringSelected: {
      borderColor: colors.accent,
    },
    label: {
      fontFamily: fonts.label,
      fontSize: fontSizes.xs,
      color: colors.textMuted,
    },
    labelSelected: {
      color: colors.text,
    },
    hint: {
      fontFamily: fonts.body,
      fontSize: fontSizes.xs,
      color: colors.textMuted,
      textAlign: "center",
      marginTop: 12,
      marginBottom: 8,
    },
  });