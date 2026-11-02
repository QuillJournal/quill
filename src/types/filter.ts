import { Ionicons } from "@expo/vector-icons";

export type FilterValue = "all" | "mine" | "audio" | "media";
export type FilterObject = {
  label: string;
  value: FilterValue;
  icon?: keyof typeof Ionicons.glyphMap;
};
