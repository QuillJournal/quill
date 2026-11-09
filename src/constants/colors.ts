const primitives = {
  inkMuted: "#44474E",
  frostMuted: "#C4C6D0",
  // Playful accents
  grapeDark: "#A78BFF",
  grapeLight: "#6C4DF6",

  bubblegumDark: "#FF7AB6",
  bubblegumLight: "#E8408A",

  tangerineDark: "#FFA14A",
  tangerineLight: "#E8650A",

  sunshineDark: "#FFD84D",
  sunshineLight: "#C98A00",

  mintDark: "#5EEAC0",
  mintLight: "#12957A",

  skyDark: "#6CC8FF",
  skyLight: "#1E8FE0",

  crimson: "#E5384F",
  crimsonDark: "#C42A40",
  crimsonLight: "#FF6B7F",
} as const;

export const colors = {
  light: {
    background: "#F9F9FF",
    backgroundopacity: "#F9F9FF4E",
    surface: "#F3F3FA",
    surfaceHigh: "#E7E8EE",
    card: "#EDEDF4",
    cardPressed: "#E2E2E9",
    text: "#191C20",
    textMuted: "#44474E",
    textOnAccent: "#FFFFFF",
    calendarText: "#1E2540",
    accent: "#415F91",
    accentPressed: "#284777",
    accentContainer: "#D6E3FF",
    onAccentContainer: "#284777",
    secondaryAccent: "#705575",
    secondaryContainer: "#DAE2F9",
    onSecondaryContainer: "#3E4759",
    success: primitives.mintLight,
    warning: primitives.sunshineLight,
    border: "#C4C6D0",
    outline: "#74777F",
    shadow: "#000000",
    danger: "#BA1A1A",
    dangerPressed: "#93000A",
    dangerContainer: "#FFDAD6",
    onDangerContainer: "#93000A",
    SegmentedControl: "#E7E8EE",
    calendarBackground: "#fff",
    streak: "#D97706",
  },
  dark: {
    background: "#111318",
    backgroundopacity: "#11131842",
    surface: "#191C20",
    surfaceHigh: "#282A2F",
    card: "#1D2024",
    cardPressed: "#33353A",
    text: "#E2E2E9",
    textMuted: "#C4C6D0",
    textOnAccent: "#0A305F",
    calendarText: "#E2E2E9",
    accent: "#AAC7FF",
    accentPressed: "#86ACF0",
    accentContainer: "#284777",
    onAccentContainer: "#D6E3FF",
    secondaryAccent: "#DDBCE0",
    secondaryContainer: "#3E4759",
    onSecondaryContainer: "#DAE2F9",
    success: primitives.mintDark,
    warning: primitives.sunshineDark,
    border: "#44474E",
    outline: "#8E9099",
    shadow: "#000000",
    danger: "#FFB4AB",
    dangerPressed: "#FFDAD6",
    dangerContainer: "#93000A",
    onDangerContainer: "#FFDAD6",
    SegmentedControl: "#282A2F",
    calendarBackground: "#191C20",
    streak: "#FBBF24",
  },
};

// Keys are unchanged on purpose: they're what's stored on each diary,
// so existing diaries keep working. Only the values (and names in comments) changed.
export const diaryColors = {
  cobalt: { light: "#6C4DF6", dark: "#A78BFF" }, // Grape
  rose: { light: "#E8408A", dark: "#FF7AB6" }, // Bubblegum
  amber: { light: "#E8650A", dark: "#FFA14A" }, // Tangerine
  forest: { light: "#12957A", dark: "#5EEAC0" }, // Mint
  teal: { light: "#1E8FE0", dark: "#6CC8FF" }, // Sky
  violet: { light: "#C98A00", dark: "#FFD84D" }, // Sunshine
  slate: { light: "#E5384F", dark: "#FF6B7F" }, // Strawberry
} as const;

export const moodColors = {
  awesome: { light: primitives.sunshineLight, dark: primitives.sunshineDark },
  happy: { light: primitives.mintLight, dark: primitives.mintDark },
  calm: { light: primitives.skyLight, dark: primitives.skyDark },
  meh: { light: primitives.inkMuted, dark: primitives.frostMuted },
  sad: { light: primitives.grapeLight, dark: primitives.grapeDark },
  anxious: { light: primitives.tangerineLight, dark: primitives.tangerineDark },
  angry: { light: primitives.crimson, dark: primitives.crimsonLight },
} as const;

export type DiaryColorKey = keyof typeof diaryColors;
export const DEFAULT_DIARY_COLOR: DiaryColorKey = "cobalt";

export const resolveDiaryColor = (key: string, scheme: "light" | "dark") =>
  (diaryColors[key as DiaryColorKey] ?? diaryColors[DEFAULT_DIARY_COLOR])[
    scheme
  ];
