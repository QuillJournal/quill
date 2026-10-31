import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import useTheme from "../hooks/useTheme";
import {
    checkPin,
    removePin,
    setPin,
    useAppLock,
    type PinLength,
} from "../services/appLock";
import { haptic } from "../services/haptics";
import PinPad from "./PinPad";
import SegmentedControl from "./SegmentedControl";
import AppModal from "./ui/AppModal";

export type PinFlowMode = "set" | "change" | "remove";
type Step = "current" | "new" | "confirm";

const STEPS: Record<PinFlowMode, Step[]> = {
    set: ["new", "confirm"],
    change: ["current", "new", "confirm"],
    remove: ["current"],
};
const TITLES: Record<Step, string> = {
    current: "Enter current PIN",
    new: "Choose a new PIN",
    confirm: "Confirm your PIN",
};

export default function PinFlowModal({
    mode,
    onClose,
}: {
    mode: PinFlowMode | null;
    onClose: () => void;
}) {
    const { colors, fonts, fontSizes, spacing } = useTheme();
    const { config } = useAppLock();
    const [stepIndex, setStepIndex] = useState(0);
    const [entry, setEntry] = useState("");
    const [firstPin, setFirstPin] = useState("");
    const [length, setLength] = useState<PinLength>(4);
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if (mode === null) return;
        setStepIndex(0);
        setEntry("");
        setFirstPin("");
        setError(null);
        setBusy(false);
        setLength(config.pinHash ? config.pinLength : 4);
    }, [mode]);

    const step: Step | null = mode ? STEPS[mode][stepIndex] : null;
    const targetLength =
    step === "current"
      ? config.pinLength
      : step === "confirm"
        ? firstPin.length
        : length;

    const advance = () => {
        setError(null);
        setEntry("");
        setStepIndex((i) => i + 1);
    };

    useEffect(() => {
        if (!mode || !step || busy || entry.length !== targetLength) return;
        (async () => {
            setBusy(true);
            try {
                if (step === "current") {
                    if (!(await checkPin(entry))) {
                        haptic.error();
                        setError("Wrong PIN.");
                        setEntry("");
                        return;
                    }
                    if (mode === "remove") {
                        removePin();
                        haptic.success();
                        onClose();
                        return;
                    }
                    advance();
                } else if (step === "new") {
                    setFirstPin(entry);
                    advance();
                } else {
                    if (entry !== firstPin) {
                        haptic.error();
                        setError("PINs didn't match. Start again.");
                        setEntry("");
                        setFirstPin("");
                        setStepIndex(STEPS[mode].indexOf("new"));
                        return;
                    }
                    await setPin(entry, length);
                    haptic.success();
                    onClose();
                }
            } finally {
                setBusy(false);
            }
        })();
    }, [entry]);

    return (
        <AppModal
        title={step ? TITLES[step]: "PIN"}
        isOpen={mode !== null}
        onClose={onClose}
        >
            <View style={{ padding: spacing.lg, gap: spacing.md, alignItems: "center" }}>
                {step === "new" && (
                    <View style={{ width: "100%" }}>
                        <SegmentedControl
                        options={[
                            { label: "4 digits", value: "4" },
                            { label: "5 digits", value: "5" },
                            { label: "6 digits", value: "6" },
                        ]}
                        selectedValue={String(length)}
                        onSelect={(v) => {
                            setLength(Number(v) as PinLength);
                            setEntry("");
                        }}
                        />
            </View>
                )}
                <Text
                style={{
                    minHeight: 20,
                    color: error ? colors.danger : colors.textMuted,
                    fontFamily: fonts.body,
                    fontSize: fontSizes.sm,
                }}
                >
                    {error ?? " "}
                </Text>
                <PinPad
                length={targetLength}
                value={entry}
                onChange={(v) => {
                    setError(null);
                    setEntry(v);
                }}
                disabled={busy}
                hasError={error !== null}
                />
                </View>
        </AppModal>
    );
}