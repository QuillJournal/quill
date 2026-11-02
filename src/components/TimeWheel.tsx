import WheelPicker from "@quidone/react-native-wheel-picker";
import { StyleSheet, View } from "react-native";
import useTheme from "../hooks/useTheme";

const HOURS = Array.from({ length: 12 }, (_, i) => ({
    value: i + 1,
    label: String(i + 1),
}));
const MINUTES = Array.from({ length: 60 }, (_, i) => ({
    value: i,
    label: String(i).padStart(2, "0"),
}));
const PERIODS = [
    { value: "AM", label: "AM" },
    { value: "PM", label: "PM" },
];

interface Props {
    value: string;
    onChange: (hhmm: string) => void;
}

export default function TimeWheel({ value, onChange }: Props) {
    const { colors } = useTheme();
    const [h24, m] = value.split(":").map(Number);
    const period = h24 >= 12 ? "PM" : "AM";
    const h12 = h24 % 12 === 0 ? 12 : h24 % 12;

    const emit = (h: number, min: number, p: string) => {
        const hh = (h % 12) + (p === "PM" ? 12 : 0);
        onChange(
            `${String(hh).padStart(2, "0")}:${String(min).padStart(2, "0")}`,
        );
    };

    const textStyle = { color: colors.text };
    return (
        <View style={styles.row}>
            <WheelPicker
            data={HOURS}
            value={h12}
            width={72}
            itemTextStyle={textStyle}
            onValueChanged={({ item }) => emit(item.value, m, period)}
            />
            <WheelPicker
            data={MINUTES}
            value={m}
            width={72}
            itemTextStyle={textStyle}
            onValueChanged={({ item }) => emit(h12, item.value, period)}
            />
            <WheelPicker
            data={PERIODS}
            value={period}
            width={72}
            itemTextStyle={textStyle}
            onValueChanged={({ item }) => emit(h12, m, item.value)}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    row: {
        flexDirection: "row",
        justifyContent: "center",
        gap: 8,
    },
})