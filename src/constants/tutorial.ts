import type { MoodKey } from "./moods";

export type TutorialStep = { mood: MoodKey; title: string; body: string };

export const TUTORIAL_STEPS: readonly TutorialStep[] = [
  {
    mood: "calm",
    title: "Start a new diary",
    body: "Tap + to create your first diary.",
  },
  {
    mood: "happy",
    title: "Open your diary",
    body: "Tap it to open the diary and start writing.",
  },
  {
    mood: "awesome",
    title: "Invite someone",
    body: "Share this diary with a friend.",
  },
  {
    mood: "happy",
    title: "Write your first memory",
    body: "Tap + to add an entry.",
  },
];
