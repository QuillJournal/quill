const primitives = {
  snow: "#FFFFFF",
  cream: "#FFF9F0",
  cardLight: "#FFFFFF",
  borderLight: "#F1E5D5",
  borderDark: "#3A3358",

  plumDeep: "#17132A",
  plumSurface: "#1F1A38",
  plumCard: "#282142",
  plumPressed: "#342B55",

  inkDark: "#2A2140",
  inkMuted: "#7A6F94",
  frostText: "#FBF7FF",
  frostMuted: "#A99FC6",

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
    background: primitives.cream,
    surface: primitives.snow,
    card: primitives.cardLight,
    cardPressed: "#FFF1DE",
    text: primitives.inkDark,
    textMuted: primitives.inkMuted,
    textOnAccent: primitives.snow,
    accent: primitives.grapeLight,
    accentPressed: "#5538D6",
    secondaryAccent: primitives.bubblegumLight,
    success: primitives.mintLight,
    warning: primitives.sunshineLight,
    border: primitives.borderLight,
    shadow: "#2A2140",
    danger: primitives.crimson,
    dangerPressed: primitives.crimsonDark,
    SegmentedControl: "#EEF2F6",
  },
  dark: {
    background: primitives.plumDeep,
    surface: primitives.plumSurface,
    card: primitives.plumCard,
    cardPressed: primitives.plumPressed,
    text: primitives.frostText,
    textMuted: primitives.frostMuted,
    textOnAccent: primitives.plumDeep,
    accent: primitives.grapeDark,
    accentPressed: "#8C6CF2",
    secondaryAccent: primitives.bubblegumDark,
    success: primitives.mintDark,
    warning: primitives.sunshineDark,
    border: primitives.borderDark,
    shadow: "#000000",
    danger: primitives.crimsonLight,
    SegmentedControl: "#1E293B",
    dangerPressed: primitives.crimson,
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
