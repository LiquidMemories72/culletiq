/**
 * Default pipeline configuration.
 *
 * These values are UNCALIBRATED starting points chosen from CIELAB conventions
 * (a ΔE of ~2.3 is roughly one just-noticeable difference; neutral greys sit at
 * C* ≈ 0) and inspection of synthetic test scenes. The brown/green hue boundary
 * (98°) was chosen by comparing hue histograms of two hand-sorted real photos
 * (green and amber fractions, public/demo/real) — a sanity check on 2 images,
 * not a calibration. Nothing here has been validated against measured ground
 * truth; recalibrate for any specific camera, lighting rig and background
 * before the numbers are relied on.
 */
import type { AnalysisConfig, ColourThresholds } from "@/types/analysis";

export const ALGORITHM_NAME = "CulletIQ colour-area baseline (CIELAB thresholds + SLIC regions + heuristic screening)";
export const ALGORITHM_VERSION = "0.1.0";

export const DEFAULT_THRESHOLDS: ColourThresholds = {
  clearMaxChroma: 10,
  colourMinChroma: 16,
  neutralMinLightness: 40,
  darkMaxLightness: 6,
  lowLightMinSaturation: 0.6,
  minChroma: 4,
  glareMinLightness: 93,
  glareMaxChroma: 8,
  brownHue: [40, 98],
  greenHue: [98, 200],
  hueMargin: 6,
};

export const DEFAULT_CONFIG: AnalysisConfig = {
  maxAnalysisDimension: 720,
  thresholds: DEFAULT_THRESHOLDS,
  background: {
    mode: "auto",
    borderFraction: 0.04,
    colourTolerance: 12,
    minBorderConsistency: 0.6,
    maxBorderTexture: 6,
    floodGradientLimit: 10,
    maxBackgroundFraction: 0.9,
  },
  whiteBalance: {
    mode: "background",
    maxBackgroundChroma: 15,
    maxGain: 1.5,
  },
  regions: {
    targetCount: 600,
    compactness: 12,
    iterations: 6,
  },
  fragments: {
    minAreaFraction: 0.0003,
  },
  anomalies: {
    minAreaFraction: 0.001,
    maxAreaFraction: 0.15,
    maxReported: 20,
    unusualColourMinChroma: 30,
    opaqueLightMinLightness: 75,
    opaqueMaxChroma: 12,
    opaqueMaxTexture: 4,
    metalMaxChroma: 10,
    metalMinTexture: 20,
    metalMinHighlightFraction: 0.08,
    metalMinDarkFraction: 0.08,
    darkOpaqueMaxLightness: 18,
  },
};

/** Deep-merge a partial config over the defaults. */
export function resolveConfig(partial?: DeepPartial<AnalysisConfig>): AnalysisConfig {
  const base = structuredClone(DEFAULT_CONFIG);
  if (!partial) return base;
  return {
    maxAnalysisDimension: partial.maxAnalysisDimension ?? base.maxAnalysisDimension,
    thresholds: { ...base.thresholds, ...(partial.thresholds as Partial<ColourThresholds>) },
    background: { ...base.background, ...partial.background },
    whiteBalance: { ...base.whiteBalance, ...partial.whiteBalance },
    regions: { ...base.regions, ...partial.regions },
    fragments: { ...base.fragments, ...partial.fragments },
    anomalies: { ...base.anomalies, ...partial.anomalies },
  };
}

/** Throw if thresholds are internally inconsistent. */
export function validateThresholds(t: ColourThresholds): void {
  if (t.clearMaxChroma <= 0) throw new Error("clearMaxChroma must be positive");
  if (t.colourMinChroma < t.clearMaxChroma) throw new Error("colourMinChroma must be ≥ clearMaxChroma");
  if (t.darkMaxLightness >= t.neutralMinLightness) throw new Error("darkMaxLightness must be < neutralMinLightness");
  if (t.brownHue[0] >= t.brownHue[1] || t.greenHue[0] >= t.greenHue[1]) throw new Error("hue ranges must be ordered");
  if (t.hueMargin < 0) throw new Error("hueMargin must be ≥ 0");
  if (t.lowLightMinSaturation <= 0) throw new Error("lowLightMinSaturation must be positive");
  if (t.minChroma < 0 || t.minChroma > t.colourMinChroma) throw new Error("minChroma must be in [0, colourMinChroma]");
}

export type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] };
