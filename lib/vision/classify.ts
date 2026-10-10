/**
 * Stage 2b: per-pixel colour categorisation in CIELAB and area proportions.
 *
 * Decision order for each pixel:
 *   1. background mask              → background (excluded)
 *   2. L* ≥ glareMin and C* ≤ glareMaxC → glare (excluded: illumination, not material colour)
 *   3. L* < darkMax                 → uncertain (too dark to judge)
 *   4. C* ≥ required chroma         → chromatic; go to 6. Required chroma is
 *      max(minChroma, min(colourMinChroma, lowLightMinSaturation × L*)), so dark
 *      pixels qualify on relative chroma (C* ÷ L*) — dark glass cannot reach high C*.
 *   5. otherwise C* < clearMaxChroma → clear if L* ≥ neutralMinLightness, else uncertain;
 *      anything else → uncertain (weak tint: clear-vs-tinted ambiguous)
 *   6. hue angle h_ab inside a class range (minus margin) → that class
 *   7. hue within margin of a class boundary → uncertain
 *   8. otherwise                    → otherColour (e.g. blue, red, violet)
 */
import {
  COLOUR_CLASSES,
  LABEL_BY_CODE,
  LABEL_CODE,
  type ColourClass,
  type ColourDistribution,
  type ColourThresholds,
  type PixelLabel,
} from "@/types/analysis";
import { hueAngle, type LabPlanes } from "./colour";

/** Below this share of material pixels the distribution is not reported as valid. */
export const MIN_MATERIAL_FRACTION = 0.05;

function inRange(h: number, lo: number, hi: number): boolean {
  return h >= lo && h <= hi;
}

/** Chroma a pixel of lightness L* needs to count as chromatic. */
export function requiredChroma(L: number, t: ColourThresholds): number {
  return Math.max(t.minChroma, Math.min(t.colourMinChroma, t.lowLightMinSaturation * L));
}

/** Classify a single pixel from its CIELAB coordinates (background handled by caller). */
export function classifyLab(L: number, a: number, b: number, t: ColourThresholds): PixelLabel {
  const C = Math.sqrt(a * a + b * b);
  if (L >= t.glareMinLightness && C <= t.glareMaxChroma) return "glare";
  if (L < t.darkMaxLightness) return "uncertain";
  if (C < requiredChroma(L, t)) {
    if (C < t.clearMaxChroma) return L >= t.neutralMinLightness ? "clear" : "uncertain";
    return "uncertain";
  }
  const h = hueAngle(a, b);
  const m = t.hueMargin;
  if (inRange(h, t.brownHue[0] + m, t.brownHue[1] - m)) return "brown";
  if (inRange(h, t.greenHue[0] + m, t.greenHue[1] - m)) return "green";
  if (inRange(h, t.brownHue[0] - m, t.brownHue[1] + m) || inRange(h, t.greenHue[0] - m, t.greenHue[1] + m)) {
    return "uncertain";
  }
  return "otherColour";
}

/** Produce a label map (LABEL_CODE values) for the whole image. */
export function classifyImage(planes: LabPlanes, backgroundMask: Uint8Array, t: ColourThresholds): Uint8Array {
  const n = planes.L.length;
  const labels = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    labels[i] = backgroundMask[i]
      ? LABEL_CODE.background
      : LABEL_CODE[classifyLab(planes.L[i], planes.A[i], planes.B[i], t)];
  }
  return labels;
}

/** Count labels and convert to material-area percentages. */
export function computeDistribution(labels: Uint8Array): ColourDistribution {
  const counts = new Array<number>(LABEL_BY_CODE.length).fill(0);
  for (let i = 0; i < labels.length; i++) counts[labels[i]]++;
  const pixelCounts = Object.fromEntries(LABEL_BY_CODE.map((l, i) => [l, counts[i]])) as Record<PixelLabel, number>;
  const total = labels.length;
  const material = COLOUR_CLASSES.reduce((s, c) => s + pixelCounts[c], 0);
  const valid = total > 0 && material / total >= MIN_MATERIAL_FRACTION;
  const percentages = Object.fromEntries(
    COLOUR_CLASSES.map((c) => [c, material > 0 ? (pixelCounts[c] / material) * 100 : 0]),
  ) as Record<ColourClass, number>;
  return {
    percentages,
    pixelCounts,
    materialPixels: material,
    totalPixels: total,
    excludedPercentOfImage: {
      background: total ? (pixelCounts.background / total) * 100 : 0,
      glare: total ? (pixelCounts.glare / total) * 100 : 0,
    },
    valid,
  };
}

/**
 * Round percentages to `decimals` places while keeping their sum exactly 100
 * (largest-remainder method). Returns zeros if the input sums to 0.
 */
export function roundPercentages<K extends string>(values: Record<K, number>, decimals = 1): Record<K, number> {
  const keys = Object.keys(values) as K[];
  const total = keys.reduce((s, k) => s + values[k], 0);
  const scale = 10 ** decimals;
  if (total <= 0) return Object.fromEntries(keys.map((k) => [k, 0])) as Record<K, number>;
  const target = Math.round(100 * scale);
  const raw = keys.map((k) => ((values[k] / total) * 100 * scale));
  const floored = raw.map(Math.floor);
  let remainder = target - floored.reduce((a, b) => a + b, 0);
  const order = raw.map((v, i) => ({ i, frac: v - Math.floor(v) })).sort((a, b) => b.frac - a.frac);
  for (let k = 0; k < order.length && remainder > 0; k++, remainder--) floored[order[k].i]++;
  return Object.fromEntries(keys.map((k, i) => [k, floored[i] / scale])) as Record<K, number>;
}
