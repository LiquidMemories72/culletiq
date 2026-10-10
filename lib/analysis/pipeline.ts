/**
 * End-to-end analysis pipeline. Pure function of (pixels, config): deterministic,
 * no network, no randomness. Runs in a Web Worker in the browser and directly in Node for tests.
 */
import type { AnalysisConfig, PipelineOutput, ProgressCallback, RgbaImage, SegmentationResult } from "@/types/analysis";
import { ALGORITHM_NAME, ALGORITHM_VERSION, resolveConfig, validateThresholds, type DeepPartial } from "@/lib/vision/config";
import { computeLabPlanes, gradientMagnitude } from "@/lib/vision/colour";
import { resizeArea, validateImage } from "@/lib/vision/preprocess";
import { backgroundIlluminationVariation, measureQuality } from "@/lib/vision/quality";
import { estimateBackground } from "@/lib/vision/background";
import { backgroundWhiteBalance } from "@/lib/vision/whitebalance";
import { computeLabPlanes as labPlanesOf } from "@/lib/vision/colour";
import { classifyImage, computeDistribution } from "@/lib/vision/classify";
import { computeRegionStats, meanRegionPurity, regionAdjacency, slic } from "@/lib/vision/regions";
import { segmentFragments } from "@/lib/vision/fragments";
import { screenAnomalies } from "@/lib/vision/anomalies";
import { assessReliability } from "@/lib/vision/reliability";
import { runRules } from "./rules";

export class ImageValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImageValidationError";
  }
}

export function runPipeline(
  input: RgbaImage,
  partialConfig?: DeepPartial<AnalysisConfig>,
  onProgress?: ProgressCallback,
  /** Dimensions of the file before any browser-side downscaling, for the resolution indicator. */
  originalSize?: { width: number; height: number },
): PipelineOutput {
  const config = resolveConfig(partialConfig);
  validateThresholds(config.thresholds);
  const v = validateImage(input);
  if (!v.ok) throw new ImageValidationError(v.error);

  const timings: Record<string, number> = {};
  const t0 = now();
  let tPrev = t0;
  const mark = (stage: string, fraction: number) => {
    const t = now();
    timings[stage] = Math.round(t - tPrev);
    tPrev = t;
    onProgress?.(stage, fraction);
  };

  onProgress?.("preprocess", 0);
  const img = resizeArea(input, config.maxAnalysisDimension);
  const { width: w, height: h } = img;
  let planes = computeLabPlanes(img);
  const grad = gradientMagnitude(planes.gray, w, h);
  const quality = measureQuality(img, planes, originalSize ?? { width: input.width, height: input.height });
  mark("preprocess", 0.2);

  const bg = estimateBackground(img, planes, grad, config.background, config.thresholds);
  if (bg.estimate.detected) {
    const v = backgroundIlluminationVariation(planes.L, bg.mask, w, h);
    if (v !== null) {
      quality.illuminationVariation = v;
      quality.illuminationMethod = "background";
    }
  }
  const wb = backgroundWhiteBalance(img, bg.mask, bg.estimate.meanLab, config.whiteBalance);
  if (wb.result.applied) {
    planes = labPlanesOf(wb.image);
    // Report the background colour after correction so later comparisons use the same colour space.
    let sl = 0;
    let sa = 0;
    let sb = 0;
    let cnt = 0;
    for (let i = 0; i < bg.mask.length; i++) {
      if (!bg.mask[i]) continue;
      sl += planes.L[i];
      sa += planes.A[i];
      sb += planes.B[i];
      cnt++;
    }
    if (cnt) bg.estimate.meanLab = [sl / cnt, sa / cnt, sb / cnt];
  }
  mark("background", 0.3);

  const labelMap = classifyImage(planes, bg.mask, config.thresholds);
  const colour = computeDistribution(labelMap);
  mark("colour", 0.45);

  const regions = slic(planes, grad, w, h, config.regions);
  const stats = computeRegionStats(regions, planes, labelMap, w);
  const adjacency = regionAdjacency(regions.labels, w, h, regions.count);
  mark("regions", 0.7);

  let segmentation: SegmentationResult;
  let boundaryMask: Uint8Array = new Uint8Array(0);
  const purity = meanRegionPurity(stats);
  if (bg.estimate.detected) {
    const frag = segmentFragments(bg.mask, labelMap, w, h, config.fragments);
    boundaryMask = frag.boundaryMask;
    segmentation = {
      mode: "fragments",
      regionCount: regions.count,
      meanRegionPurity: purity,
      fragmentCount: frag.fragmentCount,
      largestComponentShare: frag.largestComponentShare,
      fragments: frag.fragments,
      note:
        "Fragments are connected foreground regions after background removal and 3×3 morphological opening/closing. Touching or overlapping pieces merge into one region; very small pieces are discarded.",
    };
  } else {
    segmentation = {
      mode: "regions",
      regionCount: regions.count,
      meanRegionPurity: purity,
      fragmentCount: 0,
      largestComponentShare: 0,
      fragments: [],
      note:
        "No background could be separated, so individual fragments were not segmented. Analysis uses SLIC superpixels (colour-coherent regions) instead; a superpixel is not a fragment.",
    };
  }
  mark("segmentation", 0.8);

  const reliability = assessReliability(quality, bg.estimate, colour, segmentation);
  const screenable = reliability.tier !== "unsuitable";
  const screened = screenable
    ? screenAnomalies(stats, adjacency, w, h, config.anomalies, bg.estimate)
    : { anomalies: [], suppressedLargePercents: [] };
  const anomalies = screened.anomalies;
  const large = screened.suppressedLargePercents;
  const screening = {
    performed: screenable,
    note: screenable
      ? `Heuristic colour/texture rules evaluated on ${regions.count} superpixels${bg.estimate.detected ? "" : "; the dark-region rule was skipped because no background was detected"}. Outputs are possible visual anomalies only.` +
        (large.length
          ? ` ${large.length} matching area${large.length === 1 ? "" : "s"} covering ${large.map((p) => `${p}%`).join(", ")} of the image ${large.length === 1 ? "was" : "were"} too large to be an object and ${large.length === 1 ? "is" : "are"} probably a visible surface — if so, enable background detection or crop the photo.`
          : "")
      : "Screening skipped: the image is unsuitable, so colour/texture rules would produce meaningless flags.",
  };
  mark("screening", 0.9);
  const partial = {
    algorithm: { name: ALGORITHM_NAME, version: ALGORITHM_VERSION },
    config,
    quality,
    background: bg.estimate,
    whiteBalance: wb.result,
    colour,
    segmentation,
    anomalies,
    screening,
    reliability,
    timingsMs: timings,
  };
  const assessment = runRules(partial);
  mark("assessment", 1);
  timings.total = Math.round(now() - t0);

  return { result: { ...partial, assessment }, width: w, height: h, labelMap, boundaryMask };
}

function now(): number {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}
