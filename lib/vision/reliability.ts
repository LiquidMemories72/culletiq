/**
 * Stage 5: reliability indicators from observable image properties.
 *
 * The tier is a rule-based summary of these indicators. It is NOT a calibrated
 * probability that the colour estimate is correct, and it says nothing about
 * whether materials have been identified correctly.
 */
import type {
  BackgroundEstimate,
  ColourDistribution,
  ImageQualityMetrics,
  IndicatorStatus,
  ReliabilityAssessment,
  ReliabilityIndicator,
  ReliabilityTier,
  SegmentationResult,
} from "@/types/analysis";

/** Indicator thresholds. Heuristic; not derived from a validation study. */
export const RELIABILITY_LIMITS = {
  minSidePoor: 160,
  minSideCaution: 480,
  lightnessPoorLow: 15,
  lightnessPoorHigh: 92,
  lightnessCautionLow: 25,
  lightnessCautionHigh: 85,
  clippedCaution: 0.05,
  clippedPoor: 0.15,
  crushedCaution: 0.1,
  crushedPoor: 0.25,
  sharpnessPoor: 8,
  sharpnessCaution: 30,
  illuminationCaution: 0.2,
  illuminationPoor: 0.35,
  uncertainCaution: 15,
  uncertainPoor: 35,
  materialPoor: 0.05,
  materialCaution: 0.15,
  purityCaution: 0.85,
  purityPoor: 0.7,
  glareCaution: 10,
  glarePoor: 25,
  mergedCaution: 0.6,
};

const L = RELIABILITY_LIMITS;

function grade(value: number, caution: number, poor: number, higherIsWorse: boolean): IndicatorStatus {
  if (higherIsWorse) return value >= poor ? "poor" : value >= caution ? "caution" : "good";
  return value <= poor ? "poor" : value <= caution ? "caution" : "good";
}

const pct = (v: number, d = 1) => `${v.toFixed(d)}%`;

export function assessReliability(
  q: ImageQualityMetrics,
  bg: BackgroundEstimate,
  colour: ColourDistribution,
  seg: SegmentationResult,
): ReliabilityAssessment {
  const ind: ReliabilityIndicator[] = [];
  const minSide = Math.min(q.originalWidth, q.originalHeight);

  ind.push({
    id: "resolution",
    label: "Image resolution",
    value: minSide,
    displayValue: `${q.originalWidth}×${q.originalHeight} px (analysed at ${q.analysedWidth}×${q.analysedHeight})`,
    status: grade(minSide, L.minSideCaution, L.minSidePoor, false),
    critical: true,
    explanation: `Shorter side ${minSide} px. Below ${L.minSideCaution} px small fragments blur into their neighbours; below ${L.minSidePoor} px the image is rejected.`,
  });

  const lightStatus: IndicatorStatus =
    q.meanLightness < L.lightnessPoorLow || q.meanLightness > L.lightnessPoorHigh
      ? "poor"
      : q.meanLightness < L.lightnessCautionLow || q.meanLightness > L.lightnessCautionHigh
        ? "caution"
        : "good";
  ind.push({
    id: "exposure",
    label: "Overall exposure",
    value: q.meanLightness,
    displayValue: `mean L* ${q.meanLightness.toFixed(1)}`,
    status: lightStatus,
    critical: true,
    explanation: `Mean CIELAB lightness. Outside ${L.lightnessPoorLow}–${L.lightnessPoorHigh} colours are compressed towards black or white and cannot be categorised.`,
  });

  ind.push({
    id: "clipping",
    label: "Clipped highlights",
    value: q.clippedHighlightFraction * 100,
    displayValue: pct(q.clippedHighlightFraction * 100),
    status: grade(q.clippedHighlightFraction, L.clippedCaution, L.clippedPoor, true),
    critical: false,
    explanation: "Share of pixels with a saturated channel (≥252). Clipped pixels lose their true colour.",
  });

  ind.push({
    id: "shadows",
    label: "Crushed shadows",
    value: q.crushedShadowFraction * 100,
    displayValue: pct(q.crushedShadowFraction * 100),
    status: grade(q.crushedShadowFraction, L.crushedCaution, L.crushedPoor, true),
    critical: false,
    explanation: "Share of pixels with every channel ≤8. Colour cannot be read from near-black pixels.",
  });

  ind.push({
    id: "sharpness",
    label: "Focus / detail",
    value: q.sharpness,
    displayValue: `Laplacian variance ${q.sharpness.toFixed(0)}`,
    status: grade(q.sharpness, L.sharpnessCaution, L.sharpnessPoor, false),
    critical: false,
    explanation:
      "Variance of the Laplacian of the analysed image. Low values indicate blur, which smears colours across fragment edges. Scale depends on content and resolution.",
  });

  ind.push({
    id: "lighting",
    label: "Lighting variation",
    value: q.illuminationVariation,
    displayValue: `CV ${q.illuminationVariation.toFixed(2)} (${q.illuminationMethod === "background" ? "background" : "content-based"})`,
    status: grade(q.illuminationVariation, L.illuminationCaution, L.illuminationPoor, true),
    critical: false,
    explanation:
      q.illuminationMethod === "background"
        ? "Coefficient of variation of mean background lightness across an 8×8 grid. A uniform surface should look uniform, so this mainly reflects uneven lighting, which shifts apparent colour."
        : "Coefficient of variation of the 90th-percentile lightness across an 8×8 grid (no background available). Uneven lighting shifts apparent colour, but this measure is also raised by genuine content differences (e.g. a brown cluster in one corner).",
  });

  const materialShare = colour.totalPixels ? colour.materialPixels / colour.totalPixels : 0;
  ind.push({
    id: "material",
    label: "Material pixels analysed",
    value: materialShare * 100,
    displayValue: `${pct(materialShare * 100)} of image (${colour.materialPixels.toLocaleString("en-GB")} px)`,
    status: grade(materialShare, L.materialCaution, L.materialPoor, false),
    critical: true,
    explanation: "Pixels left after removing background and glare. Too few makes proportions meaningless.",
  });

  ind.push({
    id: "uncertain",
    label: "Uncertain pixels",
    value: colour.percentages.uncertain,
    displayValue: `${pct(colour.percentages.uncertain)} of material`,
    status: grade(colour.percentages.uncertain, L.uncertainCaution, L.uncertainPoor, true),
    critical: false,
    explanation:
      "Material pixels that were too dark, weakly tinted, dark-neutral or near a hue boundary. Their true class is unknown, so every class proportion could be off by up to this amount.",
  });

  ind.push({
    id: "glare",
    label: "Glare excluded",
    value: colour.excludedPercentOfImage.glare,
    displayValue: `${pct(colour.excludedPercentOfImage.glare)} of image`,
    status: grade(colour.excludedPercentOfImage.glare, L.glareCaution, L.glarePoor, true),
    critical: false,
    explanation: "Near-white specular highlights removed from the denominator. Glass under the glare is not counted.",
  });

  let bgStatus: IndicatorStatus;
  let bgExpl: string;
  if (bg.mode === "none") {
    bgStatus = "good";
    bgExpl = "Background detection was turned off: the operator stated that material fills the frame. Not verified by the software.";
  } else if (!bg.detected) {
    bgStatus = "caution";
    bgExpl = `${bg.reason} If any surface is visible it is counted as material.`;
  } else if (bg.similarToClearGlass) {
    bgStatus = "caution";
    bgExpl = `${bg.reason}`;
  } else {
    bgStatus = "good";
    bgExpl = bg.reason;
  }
  ind.push({
    id: "background",
    label: "Background separation",
    value: bg.fraction * 100,
    displayValue: bg.mode === "none" ? "disabled" : bg.detected ? `${pct(bg.fraction * 100)} removed` : "not separated",
    status: bgStatus,
    critical: false,
    explanation: bgExpl,
  });

  ind.push({
    id: "purity",
    label: "Region colour consistency",
    value: seg.meanRegionPurity * 100,
    displayValue: pct(seg.meanRegionPurity * 100),
    status: grade(seg.meanRegionPurity, L.purityCaution, L.purityPoor, false),
    critical: false,
    explanation:
      "Average share of each superpixel's material pixels belonging to its dominant class. Low values mean colours are mixed at fine scale (overlap, transmission, noise), so per-pixel labels are less stable.",
  });

  if (seg.mode === "fragments") {
    ind.push({
      id: "segmentation",
      label: "Fragment separation",
      value: seg.largestComponentShare * 100,
      displayValue: `${seg.fragmentCount} components; largest ${pct(seg.largestComponentShare * 100, 0)} of foreground`,
      status: seg.largestComponentShare >= L.mergedCaution ? "caution" : "good",
      critical: false,
      explanation:
        "When one connected component holds most of the foreground, touching fragments have merged and the fragment count is an undercount.",
    });
  }

  const tier = tierFromIndicators(ind);
  return { tier, indicators: ind, summary: summarise(tier, ind) };
}

export function tierFromIndicators(ind: ReliabilityIndicator[]): ReliabilityTier {
  if (ind.some((i) => i.critical && i.status === "poor")) return "unsuitable";
  if (ind.some((i) => i.status === "poor")) return "low";
  if (ind.some((i) => i.status === "caution")) return "moderate";
  return "higher";
}

export const TIER_LABEL: Record<ReliabilityTier, string> = {
  higher: "Higher",
  moderate: "Moderate",
  low: "Low",
  unsuitable: "Unsuitable",
};

function summarise(tier: ReliabilityTier, ind: ReliabilityIndicator[]): string {
  const poor = ind.filter((i) => i.status === "poor").map((i) => i.label.toLowerCase());
  const caution = ind.filter((i) => i.status === "caution").map((i) => i.label.toLowerCase());
  switch (tier) {
    case "unsuitable":
      return `Image unsuitable for colour estimation: ${poor.join(", ")}.`;
    case "low":
      return `Colour estimate has low reliability because of: ${poor.join(", ")}${caution.length ? `; also note ${caution.join(", ")}` : ""}.`;
    case "moderate":
      return `Image conditions are acceptable with caveats: ${caution.join(", ")}.`;
    default:
      return "No image-condition indicator raised a concern. This does not establish accuracy of the estimate.";
  }
}
