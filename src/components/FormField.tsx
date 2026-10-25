import type { KeyboardTypeOptions } from "react-native";
import { Platform, StyleSheet, Text, TextInput, View } from "react-native";
import { radius } from "../constants/radius";
import { spacing } from "../constants/spacings";
import { fonts, fontSizes } from "../constants/typography";
import useTheme from "../hooks/useTheme";

type FormFieldProps = {
  label: string;
  value: string;
  placeholder?: string;
  keyboardType?: KeyboardTypeOptions;
  rightElement?: React.ReactNode;
  secureTextEntry?: boolean;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  onChangeText: (text: string) => void;
};
export default function FormField({
  label,
  value,
  placeholder,
  keyboardType,
  rightElement,
  secureTextEntry,
  autoCapitalize = "none",
  onChangeText,
}: FormFieldProps) {
  const { colors } = useTheme();
  const styles = getStyles(Platform.OS === "ios");

  return (
    <View style={styles.container}>
      <Text style={{ color: colors.textMuted }}>{label}</Text>
      <View
        style={[
          styles.inputRow,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
          },
        ]}
      >
        <TextInput
          style={[
            styles.input,
            {
              color: colors.text,
            },
          ]}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          value={value}
          onChangeText={onChangeText}
          autoCapitalize={autoCapitalize}
          keyboardType={keyboardType}
          autoCorrect={false}
          secureTextEntry={secureTextEntry}
        ></TextInput>
        {rightElement}
      </View>
    </View>
  );
}

const getStyles = (isIos: boolean) =>
  StyleSheet.create({
    container: { gap: 8 },
    inputRow: {
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      borderWidth: 1,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
    },
    inputLabel: {
      fontSize: fontSizes.xs,
      fontFamily: fonts.label,
      letterSpacing: 0.5,
      marginTop: spacing.xs,
    },
    input: {
      // height: isIos ? 32 : "auto",
      flex: 1,
      fontSize: fontSizes.md,
      fontFamily: fonts.body,
    },
  });
