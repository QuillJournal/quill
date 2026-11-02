import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  DEFAULT_DIARY_COLOR,
  diaryColors,
  resolveDiaryColor,
  type DiaryColorKey,
} from "../constants/colors";
import { spacing } from "../constants/spacings";
import useTheme from "../hooks/useTheme";
import { haptic } from "../services/haptics";
import type { DiaryFormData } from "../types/diary";
import Button from "./Button";
import FormField from "./FormField";
import AppModal from "./ui/AppModal";

type DiaryFormProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: DiaryFormData) => void;
};

const COLOR_KEYS = Object.keys(diaryColors) as DiaryColorKey[];
const EMPTY_FORM: DiaryFormData = { name: "", color: DEFAULT_DIARY_COLOR };

export default function DiaryForm({
  isOpen,
  onClose,
  onSubmit,
}: DiaryFormProps) {
  const { colors, isDark } = useTheme();
  const [formData, setFormData] = useState<DiaryFormData>(EMPTY_FORM);
  const scheme = isDark ? "dark" : "light";

  const close = () => {
    setFormData(EMPTY_FORM);
    onClose();
  };

  const handleSubmit = () => {
    const name = formData.name.trim();
    if (!name) return;
    onSubmit({ name, color: formData.color });
    close();
  };

  return (
    <AppModal title="New Diary" isOpen={isOpen} onClose={onClose}>
      <View style={styles.formContent}>
        <FormField
          label="Title"
          placeholder="Family, Friends, etc."
          value={formData.name}
          onChangeText={(name) => setFormData((prev) => ({ ...prev, name }))}
        />

        <View style={styles.colorSection}>
          <Text style={{ color: colors.textMuted }}>Ribbon color</Text>
          <View style={styles.swatchRow}>
            {COLOR_KEYS.map((key) => {
              const selected = key === formData.color;
              return (
                <Pressable
                  key={key}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  accessibilityLabel={key}
                  hitSlop={4}
                  onPress={() => {
                    haptic.select();
                    setFormData((prev) => ({ ...prev, color: key }));
                  }}
                  style={[
                    styles.swatch,
                    {
                      backgroundColor: resolveDiaryColor(key, scheme),
                      borderColor: selected ? colors.text : "transparent",
                    },
                  ]}
                />
              );
            })}
          </View>
        </View>
        <Button label="Create Diary" onPress={handleSubmit} />
      </View>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  formContent: {
    gap: spacing.md,
  },
  colorSection: {
    gap: spacing.sm,
  },
  swatchRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  swatch: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 3,
  },
});
