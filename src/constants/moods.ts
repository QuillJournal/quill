export type MoodValence = "positive" | "neutral" | "negative";

export const MOODS = {
  awesome: { label: "Awesome", valence: "positive" },
  happy: { label: "Happy", valence: "positive" },
  calm: { label: "Calm", valence: "positive" },
  meh: { label: "Meh", valence: "neutral" },
  sad: { label: "Sad", valence: "negative" },
  anxious: { label: "Anxious", valence: "negative" },
  angry: { label: "Angry", valence: "negative" },
} as const satisfies Record<string, { label: string; valence: MoodValence }>;

export type MoodKey = keyof typeof MOODS;

export const MOOD_KEYS = Object.keys(MOODS) as MoodKey[];

export const isMoodKey = (v: unknown): v is MoodKey =>
  typeof v === "string" && MOOD_KEYS.includes(v as MoodKey);
