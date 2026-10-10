/**
 * Core schemas for the CulletIQ analysis pipeline.
 *
 * Every number in an AnalysisResult is computed from image pixels by the
 * pipeline in lib/vision and lib/analysis. Nothing here is a physical
 * measurement: colour proportions are visible image-area fractions.
 */

/** Raw RGBA pixel buffer (same layout as browser ImageData). */
export interface RgbaImage {
  width: number;
  height: number;
  data: Uint8ClampedArray;
}

/** Material colour classes reported as image-area proportions. */
export type ColourClass = "clear" | "green" | "brown" | "otherColour" | "uncertain";

/** Pixels removed from the colour denominator. */
export type ExcludedClass = "background" | "glare";

export type PixelLabel = ColourClass | ExcludedClass;

export const COLOUR_CLASSES: readonly ColourClass[] = ["clear", "green", "brown", "otherColour", "uncertain"];

/** Numeric codes used in label maps (Uint8Array). */
export const LABEL_CODE: Record<PixelLabel, number> = {
  background: 0,
  glare: 1,
  clear: 2,
  green: 3,
  brown: 4,
  otherColour: 5,
  uncertain: 6,
};

export const LABEL_BY_CODE: readonly PixelLabel[] = [
  "background",
  "glare",
  "clear",
  "green",
  "brown",
  "otherColour",
  "uncertain",
];

/** CIELAB thresholds for pixel colour categorisation. Uncalibrated starting values. */
export interface ColourThresholds {
  /** Pixels with chroma C*ab below this are treated as neutral (clear/flint-like candidates). */
  clearMaxChroma: number;
  /** Pixels with chroma at or above this are treated as chromatic. The band between is "uncertain". */
  colourMinChroma: number;
  /** Neutral pixels darker than this L* cannot be told apart from shadow/dark material → uncertain. */
  neutralMinLightness: number;
  /** Any pixel darker than this L* is too dark to categorise → uncertain. */
  darkMaxLightness: number;
  /**
   * Low-light rule: below L* ≈ colourMinChroma / lowLightMinSaturation, the chroma needed to
   * count as chromatic is lowLightMinSaturation × L* (CIELAB saturation C* ÷ L*), because dark
   * glass cannot reach high absolute chroma.
   */
  lowLightMinSaturation: number;
  /** Absolute floor on chroma for any pixel to count as chromatic (noise guard). */
  minChroma: number;
  /** Near-white low-chroma pixels at or above this L* are treated as specular glare (excluded). */
  glareMinLightness: number;
  glareMaxChroma: number;
  /** Hue-angle range h_ab (degrees) for brown/amber. */
  brownHue: [number, number];
  /** Hue-angle range h_ab (degrees) for green. */
  greenHue: [number, number];
  /** Degrees on each side of a hue boundary treated as uncertain. */
  hueMargin: number;
}

export type BackgroundMode = "auto" | "none";

export interface WhiteBalanceConfig {
  /** "background": treat a detected near-neutral background as a white reference. */
  mode: "background" | "none";
  /** Only correct if the background's chroma C* is at most this (otherwise it may be genuinely coloured). */
  maxBackgroundChroma: number;
  /** Cap on any channel gain (and 1/gain). */
  maxGain: number;
}

export interface WhiteBalanceResult {
  applied: boolean;
  /** Linear-RGB channel gains, if applied. */
  gains: [number, number, number] | null;
  reason: string;
}

export interface BackgroundConfig {
  mode: BackgroundMode;
  /** Border ring width as a fraction of the shorter image side. */
  borderFraction: number;
  /** Max ΔE76 from the border median for a border pixel to count as consistent. */
  colourTolerance: number;
  /** Minimum share of border pixels that must be consistent to hypothesise a background. */
  minBorderConsistency: number;
  /** Max mean gradient magnitude (0–255 gray scale) of consistent border pixels. */
  maxBorderTexture: number;
  /** Gradient magnitude above which flood-fill stops (fragment edges act as barriers). */
  floodGradientLimit: number;
  /** Reject the background hypothesis if it would cover more than this fraction of the image. */
  maxBackgroundFraction: number;
}

export interface RegionConfig {
  /** Target number of SLIC superpixels. */
  targetCount: number;
  /** SLIC compactness m. */
  compactness: number;
  iterations: number;
}

export interface FragmentConfig {
  /** Minimum connected-component area as a fraction of the image. */
  minAreaFraction: number;
}

export interface AnomalyConfig {
  /** Minimum merged anomaly area as a fraction of the image. */
  minAreaFraction: number;
  /** Merged regions larger than this fraction are almost certainly a surface, not an object, and are not reported. */
  maxAreaFraction: number;
  /** Max number of anomaly regions reported. */
  maxReported: number;
  unusualColourMinChroma: number;
  opaqueLightMinLightness: number;
  opaqueMaxChroma: number;
  opaqueMaxTexture: number;
  metalMaxChroma: number;
  metalMinTexture: number;
  metalMinHighlightFraction: number;
  metalMinDarkFraction: number;
  darkOpaqueMaxLightness: number;
}

export interface AnalysisConfig {
  /** Longest side (px) the image is resampled to before analysis. */
  maxAnalysisDimension: number;
  thresholds: ColourThresholds;
  background: BackgroundConfig;
  whiteBalance: WhiteBalanceConfig;
  regions: RegionConfig;
  fragments: FragmentConfig;
  anomalies: AnomalyConfig;
}

export interface ImageQualityMetrics {
  originalWidth: number;
  originalHeight: number;
  analysedWidth: number;
  analysedHeight: number;
  /** Mean CIELAB L* (0–100). */
  meanLightness: number;
  lightnessStd: number;
  /** Share of pixels with max channel ≥ 252. */
  clippedHighlightFraction: number;
  /** Share of pixels with max channel ≤ 8. */
  crushedShadowFraction: number;
  /** Variance of the 4-neighbour Laplacian on 0–255 luma. Higher = more fine detail. */
  sharpness: number;
  /** Coefficient of variation of per-block 90th-percentile L* (8×8 grid). Confounded by content. */
  illuminationVariation: number;
  /** "background": CV of block-mean L* over detected background (direct lighting proxy). "p90": content-confounded fallback. */
  illuminationMethod: "background" | "p90";
  /** Share of pixels with alpha < 128 (treated as background). */
  transparentFraction: number;
}

export interface BackgroundEstimate {
  mode: BackgroundMode;
  detected: boolean;
  /** Mean CIELAB of the accepted background model. */
  meanLab: [number, number, number] | null;
  /** Share of border pixels consistent with the border median colour. */
  borderConsistency: number;
  /** Mean gradient magnitude of the consistent border pixels. */
  borderTexture: number;
  /** Share of the analysed image assigned to background. */
  fraction: number;
  /** Background is neutral, so clear glass (which transmits it) is hard to separate. */
  similarToClearGlass: boolean;
  reason: string;
}

export interface ColourDistribution {
  /** Percentage of material (non-excluded) pixels per class. Sums to 100 when valid. */
  percentages: Record<ColourClass, number>;
  pixelCounts: Record<PixelLabel, number>;
  materialPixels: number;
  totalPixels: number;
  /** Percentage of the whole analysed image removed from the denominator. */
  excludedPercentOfImage: Record<ExcludedClass, number>;
  /** False when too few material pixels remain for proportions to be meaningful. */
  valid: boolean;
}

/** Normalised (0–1) bounding box in image coordinates. */
export interface NormBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Fragment {
  id: number;
  box: NormBox;
  centroid: { x: number; y: number };
  /** Area as % of the analysed image. */
  areaPercent: number;
  dominantClass: ColourClass | null;
  /** Share of the fragment's material pixels belonging to the dominant class. */
  purity: number;
  touchesBorder: boolean;
}

export interface SegmentationResult {
  mode: "fragments" | "regions";
  /** Number of SLIC superpixels used for region-level analysis. */
  regionCount: number;
  /** Mean share of each region's material pixels that belong to its dominant class. */
  meanRegionPurity: number;
  /** Connected foreground components above the size threshold (fragments mode only). */
  fragmentCount: number;
  /** Largest component's share of all foreground pixels (fragments mode only). High = touching/merged pieces. */
  largestComponentShare: number;
  /** Up to 60 largest fragments. */
  fragments: Fragment[];
  note: string;
}

export type AnomalyCategory = "unusualColour" | "opaqueLight" | "metalLike" | "darkOpaque";

export interface Anomaly {
  id: number;
  category: AnomalyCategory;
  label: string;
  box: NormBox;
  centroid: { x: number; y: number };
  areaPercent: number;
  /** Measured features that triggered the rule. */
  features: Record<string, number>;
  /** Human-readable rule that fired. */
  rule: string;
  /** What the observation could plausibly be — never a confirmed identification. */
  possibleExplanations: string;
  verification: string;
}

export type IndicatorStatus = "good" | "caution" | "poor";

export interface ReliabilityIndicator {
  id: string;
  label: string;
  value: number;
  displayValue: string;
  status: IndicatorStatus;
  /** Whether a "poor" result makes the image unsuitable for any colour estimate. */
  critical: boolean;
  explanation: string;
}

export type ReliabilityTier = "higher" | "moderate" | "low" | "unsuitable";

export interface ReliabilityAssessment {
  tier: ReliabilityTier;
  indicators: ReliabilityIndicator[];
  summary: string;
}

export type FindingSeverity = "info" | "caution" | "action" | "blocking";

export interface RuleFinding {
  ruleId: string;
  title: string;
  severity: FindingSeverity;
  rationale: string;
  nextStep: string;
  evidence: Record<string, number | string>;
}

export type AssessmentStatus = "assessable" | "inspect" | "unsuitable";

export interface QualityAssessment {
  status: AssessmentStatus;
  headline: string;
  findings: RuleFinding[];
}

export interface AnalysisResult {
  algorithm: { name: string; version: string };
  config: AnalysisConfig;
  quality: ImageQualityMetrics;
  background: BackgroundEstimate;
  whiteBalance: WhiteBalanceResult;
  colour: ColourDistribution;
  segmentation: SegmentationResult;
  anomalies: Anomaly[];
  screening: { performed: boolean; note: string };
  reliability: ReliabilityAssessment;
  assessment: QualityAssessment;
  timingsMs: Record<string, number>;
}

/** Full pipeline output, including per-pixel maps used for overlays (not persisted). */
export interface PipelineOutput {
  result: AnalysisResult;
  width: number;
  height: number;
  labelMap: Uint8Array;
  /** Fragment boundary mask (1 = boundary pixel); empty in regions mode. */
  boundaryMask: Uint8Array;
}

export type ProgressCallback = (stage: string, fraction: number) => void;
