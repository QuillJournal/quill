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

export function faceGeometry(p: FaceParams) {
  const eyeRy = Math.max(1.4, 5.5 * p.eyeOpen);

  const inner = p.browY - p.browTilt * 5;
  const outer = p.browY + p.browTilt * 3;
  const leftBrow = `M 24 ${outer} L 44 ${inner}`;
  const rightBrow = `M 76 ${outer} L 56 ${inner}`;

  const x1 = 50 - p.mouthWidth;
  const x2 = 50 + p.mouthWidth;
  const filled = p.mouthOpen > 0.05;

  const mouth = filled
    ? `M ${x1} ${p.mouthY} Q 50 ${p.mouthY + 28 * p.mouthOpen} ${x2} ${p.mouthY} Z`
    : `M ${x1} ${p.mouthY} Q 50 ${p.mouthY + p.mouthCurve * 18} ${x2} ${p.mouthY}`;

  return {
    eyeRy,
    leftBrow,
    rightBrow,
    browOpacity: p.browOpacity,
    mouth,
    filled,
  };
}
