import useTheme from "@/src/hooks/useTheme";
import { useState } from "react";
import { StyleSheet, Text } from "react-native";

type InlineReadMoreProps = { text: string; maxLength?: number };
export default function InlineReadMore({
  text,
  maxLength = 100,
}: InlineReadMoreProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { colors } = useTheme();
  const sytles = getStyles(colors);
  if (text.length <= maxLength) {
    return <Text style={sytles.baseText}></Text>;
  }
  return (
    <Text style={sytles.baseText}>
      {`${isExpanded ? text : text.slice(0, maxLength)}... `}
      <Text
        style={sytles.readMoreText}
        onPress={() => setIsExpanded((prev) => !prev)}
      >
        {isExpanded ? "Read less" : "Read more"}
      </Text>
    </Text>
  );
}

const getStyles = (colors: ReturnType<typeof useTheme>["colors"]) =>
  StyleSheet.create({
    baseText: { fontSize: 14, lineHeight: 20, color: colors.text },
    readMoreText: { fontSize: 14, color: colors.textMuted },
  });
