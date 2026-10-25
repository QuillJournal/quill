import type { MoodKey } from "./moods";

export type FaceParams = {
  eyeOpen: number;
  browTilt: number;
  browY: number;
  browOpacity: number;
  mouthCurve: number;
  mouthOpen: number;
  mouthWidth: number;
  mouthY: number;
};

export const FACE_PARAMS: Record<MoodKey, FaceParams> = {
  awesome: {
    eyeOpen: 1,
    browTilt: 0,
    browY: 26,
    browOpacity: 0,
    mouthCurve: 1,
    mouthOpen: 1,
    mouthWidth: 20,
    mouthY: 62,
  },
  happy: {
    eyeOpen: 1,
    browTilt: 0,
    browY: 28,
    browOpacity: 0,
    mouthCurve: 1,
    mouthOpen: 0,
    mouthWidth: 17,
    mouthY: 64,
  },
  calm: {
    eyeOpen: 0.35,
    browTilt: 0,
    browY: 30,
    browOpacity: 0,
    mouthCurve: 0.45,
    mouthOpen: 0,
    mouthWidth: 13,
    mouthY: 66,
  },
  meh: {
    eyeOpen: 0.9,
    browTilt: 0,
    browY: 30,
    browOpacity: 1,
    mouthCurve: 0,
    mouthOpen: 0,
    mouthWidth: 14,
    mouthY: 68,
  },
  sad: {
    eyeOpen: 0.85,
    browTilt: 1,
    browY: 31,
    browOpacity: 1,
    mouthCurve: -0.8,
    mouthOpen: 0,
    mouthWidth: 13,
    mouthY: 72,
  },
  anxious: {
    eyeOpen: 1.3,
    browTilt: 0.7,
    browY: 29,
    browOpacity: 1,
    mouthCurve: -0.2,
    mouthOpen: 0,
    mouthWidth: 12,
    mouthY: 70,
  },
  angry: {
    eyeOpen: 0.7,
    browTilt: -1,
    browY: 31,
    browOpacity: 1,
    mouthCurve: -0.6,
    mouthOpen: 0,
    mouthWidth: 15,
    mouthY: 71,
  },
};

export function lerpParams(
  a: FaceParams,
  b: FaceParams,
  t: number,
): FaceParams {
  "worklet";
  return {
    eyeOpen: a.eyeOpen + (b.eyeOpen - a.eyeOpen) * t,
    browTilt: a.browTilt + (b.browTilt - a.browTilt) * t,
    browY: a.browY + (b.browY - a.browY) * t,
    browOpacity: a.browOpacity + (b.browOpacity - a.browOpacity) * t,
    mouthCurve: a.mouthCurve + (b.mouthCurve - a.mouthCurve) * t,
    mouthOpen: a.mouthOpen + (b.mouthOpen - a.mouthOpen) * t,
    mouthWidth: a.mouthWidth + (b.mouthWidth - a.mouthWidth) * t,
    mouthY: a.mouthY + (b.mouthY - a.mouthY) * t,
  };
}

export function faceGeometry(p: FaceParams, blink = 0) {
  "worklet";
  const baseRy = Math.max(1.4, 5.5 * p.eyeOpen);
  const eyeRy = Math.max(1.4, 5.5 * p.eyeOpen);

  const inner = p.browY - p.browTilt * 5;
  const outer = p.browY + p.browTilt * 3;
  const leftBrow = `M 24 ${outer} L 44 ${inner}`;
  const rightBrow = `M 76 ${outer} L 56 ${inner}`;
  const browOpacity = Math.min(1, Math.max(0, p.browOpacity));

  const x1 = 50 - p.mouthWidth;
  const x2 = 50 + p.mouthWidth;
  const topCtrl = p.mouthY + p.mouthCurve * 18;
  const bottomCtrl = topCtrl + Math.max(0, p.mouthOpen) * 28;
  const mouth = `M ${x1} ${p.mouthY} Q 50 ${topCtrl} ${x2} ${p.mouthY} Q 50 ${bottomCtrl} ${x1} ${p.mouthY} Z`;
  const filled = p.mouthOpen > 0.05;

  return {
    eyeRy,
    leftBrow,
    rightBrow,
    browOpacity,
    mouth,
  };
}

export type ExpressionKind = "none" | "awesome" | "angry";

export const EXPRESSIVE: Partial<Record<MoodKey, ExpressionKind>> = {
  awesome: "awesome",
  angry: "angry",
};

export function applyExpression(
  p: FaceParams,
  kind: ExpressionKind,
  e: number,
  s: number,
  w: number,
): FaceParams {
  "worklet";
  if (kind === "none" || w <= 0) return p;

  if (kind === "awesome") {
    return {
      ...p,
      eyeOpen: p.eyeOpen - 0.6 * e * w,
      mouthOpen: p.mouthOpen - 0.45 * (1 - e) * w + 0.15 * e * w,
      mouthWidth: p.mouthWidth + 3 * e * w,
    };
  }

  return {
    ...p,
    browTilt: p.browTilt - 0.25 * e * w,
    browY: p.browY + 1.5 * e * w + s * 0.6 * e * w,
    eyeOpen: p.eyeOpen - 0.2 * e * w,
    mouthCurve: p.mouthCurve - 0.3 * e * w,
    mouthWidth: p.mouthWidth - 2 * e * w,
    mouthY: p.mouthY + s * 0.7 * e * w,
  };
}
