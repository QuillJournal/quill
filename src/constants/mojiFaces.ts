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
    eyeOpen: 0.85,
    browTilt: 0,
    browY: 26,
    browOpacity: 0,
    mouthCurve: 1,
    mouthOpen: 0.3,
    mouthWidth: 19,
    mouthY: 63,
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

export type FaceExtras = {
  dx: number;
  dy: number;
  lookX: number;
  lookY: number;
  dropX: number;
  dropY: number;
  dropOpacity: number;
};

export function faceGeometry(p: FaceParams, blink = 0, x?: FaceExtras) {
  "worklet";
  const dx = x ? x.dx : 0;
  const dy = x ? x.dy : 0;
  const lookX = x ? x.lookX : 0;
  const lookY = x ? x.lookY : 0;

  const eyeRy = Math.max(0.8, Math.max(1.4, 5.5 * p.eyeOpen) * (1 - blink));

  const inner = p.browY - p.browTilt * 5 + dy;
  const outer = p.browY + p.browTilt * 3 + dy;
  const leftBrow = `M ${24 + dx} ${outer} L ${44 + dx} ${inner}`;
  const rightBrow = `M ${76 + dx} ${outer} L ${56 + dx} ${inner}`;
  const browOpacity = Math.min(1, Math.max(0, p.browOpacity));

  const mx = 50 + dx;
  const my = p.mouthY + dy;
  const x1 = mx - p.mouthWidth;
  const x2 = mx + p.mouthWidth;
  const topCtrl = my + p.mouthCurve * 18;
  const bottomCtrl = topCtrl + Math.max(0, p.mouthOpen) * 28;
  const mouth = `M ${x1} ${my} Q ${mx} ${topCtrl} ${x2} ${my} ${mx} ${bottomCtrl} ${x1} ${my} Z`;

  return {
    eyeRy,
    eyeLx: 35 + dx + lookX,
    eyeRx: 65 + dx + lookX,
    eyeCy: 44 + dy + lookY,
    faceCx: 50 + dx,
    faceCy: 50 + dy,
    leftBrow,
    rightBrow,
    browOpacity,
    mouth,
    dropCx: (x ? x.dropX : 0) + dx,
    dropCy: (x ? x.dropY : 0) + dy,
    dropOpacity: x ? x.dropOpacity : 0,
  };
}

export type ExpressionKind = "none" | MoodKey;

export const EXPRESSIVE: Record<MoodKey, ExpressionKind> = {
  awesome: "awesome",
  happy: "happy",
  calm: "calm",
  meh: "meh",
  sad: "sad",
  anxious: "anxious",
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
  const k = e * w;

  switch (kind) {
    case "awesome":
      return {
        ...p,
        eyeOpen: p.eyeOpen - 0.25 * k,
        mouthOpen: p.mouthOpen + 0.25 * k,
        mouthWidth: p.mouthWidth + 2.5 * k,
      };
    case "happy":
      return {
        ...p,
        eyeOpen: p.eyeOpen - 0.25 * k,
        mouthCurve: p.mouthCurve + 0.15 * k,
        mouthWidth: p.mouthWidth + 2 * k,
      };
    case "calm":
      return {
        ...p,
        eyeOpen: p.eyeOpen - 0.12 * k,
        mouthCurve: p.mouthCurve + 0.15 * k,
        mouthWidth: p.mouthWidth + k,
      };
    case "meh":
      return p;
    case "sad":
      return {
        ...p,
        browTilt: p.browTilt + 0.3 * k,
        browY: p.browY + k,
        eyeOpen: p.eyeOpen - 0.2 * k,
        mouthCurve: p.mouthCurve - 0.35 * k,
        mouthY: p.mouthY + 1.5 * k,
      };
    case "anxious":
      return {
        ...p,
        browTilt: p.browTilt + 0.2 * k,
        eyeOpen: p.eyeOpen + 0.15 * k,
        mouthCurve: p.mouthCurve - 0.1 * k + s * 0.15 * k,
        mouthWidth: p.mouthWidth - 1.5 * k,
      };
    default:
      return {
        ...p,
        browTilt: p.browTilt - 0.25 * k,
        browY: p.browY + 1.5 * k + s * 0.6 * k,
        eyeOpen: p.eyeOpen - 0.2 * k,
        mouthCurve: p.mouthCurve - 0.3 * k,
        mouthWidth: p.mouthWidth - 2 * k,
        mouthY: p.mouthY + s * 0.7 * k,
      };
  }
}

export function expressionExtras(
  kind: ExpressionKind,
  e: number,
  s: number,
  d: number,
  w: number,
): FaceExtras {
  "worklet";
  const out: FaceExtras = {
    dx: 0,
    dy: 0,
    lookX: 0,
    lookY: 0,
    dropX: 0,
    dropY: 0,
    dropOpacity: 0,
  };
  if (kind === "none" || w <= 0) return out;
  const k = e * w;
  const fade = d < 0.15 ? d / 0.15 : d > 0.75 ? (1 - d) / 0.25 : 1;

  switch (kind) {
    case "awesome":
      out.dy = -1.6 * k;
      break;
    case "happy":
      out.dy = -2.4 * k;
      break;
    case "calm":
      out.dy = -1.2 * k;
      break;
    case "meh":
      out.lookX = (e - 0.5) * 2 * 2.6 * w;
      out.dx = out.lookX * 0.25;
      break;
    case "sad":
      out.dy = 1.4 * k;
      out.lookY = 1.8 * k;
      out.dropX = 29;
      out.dropY = 54 + d * 22;
      out.dropOpacity = 0.9 * fade * w;
      break;
    case "anxious":
      out.dx = s * 0.9 * k;
      out.lookX = s * 1.8 * k;
      out.dropX = 80;
      out.dropY = 26 + d * 18;
      out.dropOpacity = 0.9 * fade * w;
      break;
    default:
      out.dx = s * 0.7 * k;
  }
  return out;
}
