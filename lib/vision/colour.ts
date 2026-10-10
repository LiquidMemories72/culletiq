/**
 * Colour-space conversions (sRGB → CIELAB D65, sRGB → HSV) and per-image Lab planes.
 * Formulas follow IEC 61966-2-1 (sRGB) and CIE 15 (CIELAB, D65 reference white).
 */
import type { RgbaImage } from "@/types/analysis";

const SRGB_TO_LINEAR = new Float32Array(256);
for (let i = 0; i < 256; i++) {
  const c = i / 255;
  SRGB_TO_LINEAR[i] = c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

// D65 reference white
const XN = 0.95047;
const YN = 1.0;
const ZN = 1.08883;
const EPS = 216 / 24389;
const KAPPA = 24389 / 27;

function labF(t: number): number {
  return t > EPS ? Math.cbrt(t) : (KAPPA * t + 16) / 116;
}

/** Convert one 8-bit sRGB colour to CIELAB [L*, a*, b*]. */
export function rgbToLab(r: number, g: number, b: number): [number, number, number] {
  const rl = SRGB_TO_LINEAR[r | 0];
  const gl = SRGB_TO_LINEAR[g | 0];
  const bl = SRGB_TO_LINEAR[b | 0];
  const x = (0.4124564 * rl + 0.3575761 * gl + 0.1804375 * bl) / XN;
  const y = (0.2126729 * rl + 0.7151522 * gl + 0.072175 * bl) / YN;
  const z = (0.0193339 * rl + 0.119192 * gl + 0.9503041 * bl) / ZN;
  const fx = labF(x);
  const fy = labF(y);
  const fz = labF(z);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

/** Convert 8-bit sRGB to HSV with H in degrees [0, 360), S and V in [0, 1]. */
export function rgbToHsv(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const d = max - min;
  let h = 0;
  if (d > 0) {
    if (max === rn) h = 60 * (((gn - bn) / d) % 6);
    else if (max === gn) h = 60 * ((bn - rn) / d + 2);
    else h = 60 * ((rn - gn) / d + 4);
  }
  if (h < 0) h += 360;
  return [h, max === 0 ? 0 : d / max, max];
}

/** CIELAB chroma C*ab. */
export function chroma(a: number, b: number): number {
  return Math.sqrt(a * a + b * b);
}

/** CIELAB hue angle h_ab in degrees [0, 360). */
export function hueAngle(a: number, b: number): number {
  const h = (Math.atan2(b, a) * 180) / Math.PI;
  return h < 0 ? h + 360 : h;
}

/** CIE76 colour difference. */
export function deltaE(l1: number, a1: number, b1: number, l2: number, a2: number, b2: number): number {
  const dl = l1 - l2;
  const da = a1 - a2;
  const db = b1 - b2;
  return Math.sqrt(dl * dl + da * da + db * db);
}

export interface LabPlanes {
  L: Float32Array;
  A: Float32Array;
  B: Float32Array;
  /** Chroma C*ab per pixel. */
  C: Float32Array;
  /** Rec. 601 luma, 0–255, used for gradients/sharpness. */
  gray: Float32Array;
}

/** Compute per-pixel CIELAB, chroma and luma planes. */
export function computeLabPlanes(img: RgbaImage): LabPlanes {
  const n = img.width * img.height;
  const L = new Float32Array(n);
  const A = new Float32Array(n);
  const B = new Float32Array(n);
  const C = new Float32Array(n);
  const gray = new Float32Array(n);
  // Cache conversions: cullet images have many repeated colours after resampling.
  const cache = new Map<number, number>();
  const cacheL: number[] = [];
  const cacheA: number[] = [];
  const cacheB: number[] = [];
  const d = img.data;
  for (let i = 0, p = 0; i < n; i++, p += 4) {
    const r = d[p];
    const g = d[p + 1];
    const b = d[p + 2];
    const key = (r << 16) | (g << 8) | b;
    let idx = cache.get(key);
    if (idx === undefined) {
      const lab = rgbToLab(r, g, b);
      idx = cacheL.length;
      cacheL.push(lab[0]);
      cacheA.push(lab[1]);
      cacheB.push(lab[2]);
      if (cache.size < 200000) cache.set(key, idx);
    }
    L[i] = cacheL[idx];
    A[i] = cacheA[idx];
    B[i] = cacheB[idx];
    C[i] = Math.sqrt(A[i] * A[i] + B[i] * B[i]);
    gray[i] = 0.299 * r + 0.587 * g + 0.114 * b;
  }
  return { L, A, B, C, gray };
}

/** Sobel gradient magnitude on a gray plane (0–255 scale, normalised by 1/4). */
export function gradientMagnitude(gray: Float32Array, width: number, height: number): Float32Array {
  const out = new Float32Array(width * height);
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x;
      const tl = gray[i - width - 1];
      const t = gray[i - width];
      const tr = gray[i - width + 1];
      const l = gray[i - 1];
      const r = gray[i + 1];
      const bl = gray[i + width - 1];
      const b = gray[i + width];
      const br = gray[i + width + 1];
      const gx = tr + 2 * r + br - tl - 2 * l - bl;
      const gy = bl + 2 * b + br - tl - 2 * t - tr;
      out[i] = Math.sqrt(gx * gx + gy * gy) / 4;
    }
  }
  return out;
}
