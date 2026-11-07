import { useMemo, useState } from "react";
import { Image, Pressable, Text, View } from "react-native";
import useTheme from "../hooks/useTheme";

const PROMPTS = [
  "What's on your mind today?",
  "Anything worth remembering from today?",
  "A small moment you don't want to forget?",
  "How's your heart right now?",
  "What made you smile lately?",
  "Got a thought that won't leave you alone?",
  "Leave a note for future you.",
];

const AVATAR_SIZE = 48;

const GREETINGS = ["Hey", "Hi", "Hello", "Sup", "Yo", "Howdy", "Heya", "Hiya"];
const MORNING = ["Mornin'", "G'Day"];
const EVENING = ["Evenin", "G'Eve", "Eve"];

function pickGreeting() {
  const h = new Date().getHours();
  const timed = h >= 5 && h < 12 ? MORNING : h >= 17 && h < 22 ? EVENING : [];
  const pool = [...GREETINGS, ...timed];
  return pool[Math.floor(Math.random() * pool.length)];
}

type GreetingHeaderProps = {
  name: string;
  photoUri?: string | null;
  onAvatarPress: () => void;
};

export default function GreetingHeader({
  name,
  photoUri,
  onAvatarPress,
}: GreetingHeaderProps) {
  const { colors, fonts, fontSizes, spacing } = useTheme();
  const [imageFailed, setImageFailed] = useState(false);
  // Picked once per mount so it doesn't reshuffle on re-render.
  const prompt = useMemo(
    () => PROMPTS[Math.floor(Math.random() * PROMPTS.length)],
    [],
  );

  const greeting = useMemo(pickGreeting, []);
  const showPhoto = !!photoUri && !imageFailed;
  const avatarStyle = {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    borderWidth: 2,
    borderColor: colors.accent,
  };

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: spacing.xs, // lines up with the card cells
        paddingTop: spacing.md,
        paddingBottom: spacing.md,
      }}
    >
      <View style={{ flex: 1, marginRight: spacing.md }}>
        <Text
          numberOfLines={1}
          style={{
            color: colors.text,
            fontFamily: fonts.heading,
            fontSize: fontSizes.xxl,
          }}
        >
          {greeting}, {name}!
        </Text>
        <Text style={{ color: colors.textMuted, marginTop: spacing.xs }}>
          {prompt}
        </Text>
      </View>

      <Pressable
        onPress={onAvatarPress}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Open settings"
      >
        {showPhoto ? (
          <Image
            source={{ uri: photoUri! }}
            style={avatarStyle}
            onError={() => setImageFailed(true)}
          />
        ) : (
          <View
            style={[
              avatarStyle,
              {
                backgroundColor: colors.card,
                alignItems: "center",
                justifyContent: "center",
              },
            ]}
          >
            <Text
              style={{
                color: colors.text,
                fontFamily: fonts.heading,
                fontSize: fontSizes.lg,
              }}
            >
              {name.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
      </Pressable>
    </View>
  );
}