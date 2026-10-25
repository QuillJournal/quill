import { MOODS, type MoodKey } from "@/src/constants/moods";
import useTheme from "@/src/hooks/useTheme";
import { useMemo } from "react";
import { View } from "react-native";
import Svg, { Circle, Ellipse, Path } from "react-native-svg";
import { moodColors } from "../constants/colors";
import { FACE_PARAMS, faceGeometry } from "../constants/mojiFaces";

type Props = {
    mood: MoodKey;
    size?: number;
}

export default function MojiFace({ mood, size = 40 }: Props) {
    const { colors, isDark } = useTheme();
    const fill = moodColors[mood][isDark ? "dark" : "light"];
    const ink = colors.textOnAccent;
    const g = useMemo(() => faceGeometry(FACE_PARAMS[mood]), [mood]);

    return (
            <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={`${MOODS[mood].label} face`}
      style={{ width: size, height: size }}
    >
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Circle cx={50} cy={50} r={46} fill={fill} />
        <Path d={g.leftBrow} stroke={ink} strokeWidth={3.5} strokeLinecap="round" fill="none" opacity={g.browOpacity}/>
        <Path d={g.rightBrow} stroke={ink} strokeWidth={3.5} strokeLinecap="round" fill="none" opacity={g.browOpacity}/>
        <Ellipse cx={35} cy={44} rx={5.2} ry={g.eyeRy} fill={ink} />
        <Ellipse cx={65} cy={44} rx={5.2} ry={g.eyeRy} fill={ink} />
        <Path
          d={g.mouth}
          stroke={ink}
          strokeWidth={4}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill={g.filled ? ink : "none"}
        />
      </Svg>
    </View>
    );
}