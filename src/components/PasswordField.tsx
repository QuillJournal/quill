import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Pressable } from "react-native";
import useTheme from "../hooks/useTheme";
import FormField from "./FormField";

type PasswordFieldProps = {
  password: string;
  onChangePassword: (newPassword: string) => void;
  label?: string;
};
export default function PasswordField({
  password,
  onChangePassword,
  label,
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  const { colors } = useTheme();
  return (
    <FormField
      label={label || "PASSWORD"}
      placeholder="******"
      value={password}
      onChangeText={onChangePassword}
      secureTextEntry={!visible}
      rightElement={
        <>
          <Pressable
            onPress={() => setVisible((prev) => !prev)}
            accessibilityLabel={visible ? "hide-password" : "show-password"}
            hitSlop={8}
          >
            <Ionicons
              name={visible ? "eye-off" : "eye"}
              size={20}
              color={colors.text}
            />
          </Pressable>
        </>
      }
    />
  );
}
