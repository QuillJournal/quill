import type { MoodKey } from "../constants/moods";

export type DiaryRules = {
  requireMood: boolean;
  requireTitle: boolean;
  requirePhoto: boolean;
  minBodyChars: number;
};

export const DEFAULT_RULES: DiaryRules = {
  requireMood: false,
  requireTitle: false,
  requirePhoto: false,
  minBodyChars: 0,
};

export const MIN_BODY_CHOICES = [50, 100, 200, 500] as const;

export function parseRules(json: string | null | undefined): DiaryRules {
  if (!json) return DEFAULT_RULES;
  try {
    const r = JSON.parse(json);
    const min = Number(r?.minBodyChars);
    return {
      requireMood: r?.requireMood === true,
      requireTitle: r?.requireTitle === true,
      requirePhoto: r?.requirePhoto === true,
      minBodyChars:
        Number.isFinite(min) && min > 0 ? Math.min(Math.floor(min), 5000) : 0,
    };
  } catch {
    return DEFAULT_RULES;
  }
}

export function sameRules(a: DiaryRules, b: DiaryRules): boolean {
  return (
    a.requireMood === b.requireMood &&
    a.requireTitle === b.requireTitle &&
    a.requirePhoto === b.requirePhoto &&
    a.minBodyChars === b.minBodyChars
  );
}

export type RuleViolation = {
  field: "mood" | "title" | "body" | "photo";
  message: string;
};

export function checkRules(
  rules: DiaryRules,
  entry: {
    mood: MoodKey | null;
    title: string;
    bodyText: string;
    photoCount: number;
  },
): RuleViolation | null {
  if (rules.requireMood && !entry.mood) {
    return {
      field: "mood",
      message: "This diary requires a mood on every entry.",
    };
  }
  if (rules.requireTitle && !entry.title.trim()) {
    return {
      field: "title",
      message: "This diary requires a title on every entry.",
    };
  }
  if (rules.minBodyChars > 0 && entry.bodyText.length < rules.minBodyChars) {
    return {
      field: "body",
      message: `This diary requires at least ${rules.minBodyChars} characters of text (you have ${entry.bodyText.length}).`,
    };
  }
  if (rules.requirePhoto && entry.photoCount === 0) {
    return {
      field: "photo",
      message:
        "This diary requires at least one photo or video on every entry.",
    };
  }
  return null;
}

export function describeRules(rules: DiaryRules): string[] {
  const out: string[] = [];
  if (rules.requireMood) out.push("A mood on every entry");
  if (rules.requirePhoto) out.push("A title on every entry");
  if (rules.minBodyChars > 0)
    out.push(`At least ${rules.minBodyChars} characters of text`);
  if (rules.requirePhoto) out.push("At least on photo or video");
  return out;
}
