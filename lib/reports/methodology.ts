/**
 * Methodology and limitations text — single source for the methodology page,
 * "How was this calculated?" panels and exported reports.
 */
import type { AnalysisConfig } from "@/types/analysis";

export const DISCLAIMER =
  "This report is an image-based preliminary assessment. Colour proportions represent estimated visible image area, not mass fractions or certified material purity. Visual screening cannot reliably establish chemical composition or guarantee industrial suitability. Verify results using appropriate physical sampling and material-testing methods.";

export type MethodKey =
  | "preprocess"
  | "quality"
  | "background"
  | "whiteBalance"
  | "colour"
  | "segmentation"
  | "screening"
  | "reliability"
  | "rules";

export interface MethodStep {
  key: MethodKey;
  title: string;
  measures: string;
  algorithm: (c: AnalysisConfig) => string;
  limitations: string;
  verification: string;
}

export const METHOD_STEPS: MethodStep[] = [
  {
    key: "preprocess",
    title: "Decoding and preprocessing",
    measures: "Turns the uploaded file into a fixed-size pixel grid in standard colour spaces.",
    algorithm: (c) =>
      `The browser decodes the JPEG/PNG/WebP and applies EXIF orientation. The image is downsampled with an area-average (box) filter so its longest side is at most ${c.maxAnalysisDimension} px, then every pixel is converted from sRGB to CIELAB (D65 white point) and to luma for gradient measures.`,
    limitations:
      "No camera colour calibration is applied. Downsampling hides fragments smaller than a few pixels.",
    verification: "Include a neutral grey/colour reference card in the photo so lighting effects can be checked.",
  },
  {
    key: "quality",
    title: "Image-quality measurements",
    measures: "Exposure, clipping, focus and lighting uniformity of the photograph itself.",
    algorithm: () =>
      "Mean CIELAB L*; share of pixels with a channel ≥252 (clipped) or all channels ≤8 (crushed); variance of the 4-neighbour Laplacian (focus); coefficient of variation of block lightness on an 8×8 grid (lighting), measured on background pixels when a background is detected.",
    limitations:
      "Thresholds for these indicators are heuristic. The Laplacian measure depends on content and resolution; the lighting measure is confounded by content when no background is visible.",
    verification: "Photograph with fixed camera settings and diffuse lighting so conditions are consistent between samples.",
  },
  {
    key: "background",
    title: "Background separation",
    measures: "Which pixels belong to the surface the material sits on, so they are not counted as glass.",
    algorithm: (c) =>
      `The median CIELAB colour of a border ring (${(c.background.borderFraction * 100).toFixed(0)}% of the shorter side) is computed. If at least ${(c.background.minBorderConsistency * 100).toFixed(0)}% of border pixels lie within ΔE76 ${c.background.colourTolerance} of it and the border is smooth (mean gradient ≤ ${c.background.maxBorderTexture}), a flood fill grows inward from the border through similar, low-gradient pixels (gradient < ${c.background.floodGradientLimit}). Fragment edges stop the fill. The hypothesis is rejected if it would cover more than ${(c.background.maxBackgroundFraction * 100).toFixed(0)}% of the image.`,
    limitations:
      "Transparent glass transmits the background, so clear glass can be removed with a neutral background or confused with it. A pile that fills the frame has no background. A uniformly coloured pile (e.g. all green) can, in rare cases, be mistaken for a background.",
    verification:
      "Use a plain, strongly coloured surface that is unlike any glass colour, spread fragments so they do not touch, and check the overlay.",
  },
  {
    key: "whiteBalance",
    title: "Background-referenced white balance",
    measures: "Corrects an overall colour cast from the light source, using the background as a white reference.",
    algorithm: (c) =>
      c.whiteBalance.mode === "none"
        ? "Disabled for this analysis."
        : `If a background was detected and its chroma is at most C* ${c.whiteBalance.maxBackgroundChroma}, it is assumed to be a neutral (white/grey) surface. The mean linear-RGB value of background pixels is computed and each channel is scaled (von Kries-style diagonal correction, gains capped at ×${c.whiteBalance.maxGain}) so the background becomes neutral while keeping its luminance. Colour categorisation then uses the corrected pixels.`,
    limitations:
      "Wrong if the surface is genuinely coloured (e.g. cream paper is 'corrected' to grey, shifting all glass colours slightly towards blue). Cannot correct mixed lighting or casts that vary across the frame.",
    verification: "Photograph with a grey reference card and check that it reads as neutral (a*, b* ≈ 0) after correction.",
  },
  {
    key: "colour",
    title: "Colour categorisation and area proportions",
    measures: "The share of visible material pixels that look clear, green, brown/amber, another colour, or uncertain.",
    algorithm: (c) => {
      const t = c.thresholds;
      return `Each non-background pixel is categorised by CIELAB lightness L*, chroma C* = √(a*² + b*²) and hue angle h = atan2(b*, a*). Near-white low-chroma pixels (L* ≥ ${t.glareMinLightness}, C* ≤ ${t.glareMaxChroma}) are glare and excluded. L* < ${t.darkMaxLightness} → uncertain (too dark). A pixel is chromatic if C* ≥ max(${t.minChroma}, min(${t.colourMinChroma}, ${t.lowLightMinSaturation} × L*)) — the relative-chroma term lets dark glass, which cannot reach high chroma, qualify on saturation C*/L*. Non-chromatic pixels with C* < ${t.clearMaxChroma} → clear if L* ≥ ${t.neutralMinLightness}, otherwise uncertain; other non-chromatic pixels → uncertain (weak tint). Chromatic pixels by hue ${t.brownHue[0]}–${t.brownHue[1]}° → brown/amber, ${t.greenHue[0]}–${t.greenHue[1]}° → green, other hues → other colour; hues within ${t.hueMargin}° of a range boundary → uncertain. Proportions = class pixels ÷ all categorised material pixels (background and glare excluded), so the five classes sum to 100%.`;
    },
    limitations:
      "These are proportions of visible image area, not mass. Fragments differ in thickness and density, overlap and hide each other, and only the top layer of a pile is visible. Thresholds are uncalibrated starting values. Thin or light-tinted green glass can look clear; very dark amber can look uncertain; olive/'dead-leaf' glass sits on the green–brown boundary.",
    verification:
      "To obtain a mass composition: take a representative sample (e.g. by riffle splitting or coning and quartering), hand-sort by colour, weigh each fraction, and compare with the image estimate.",
  },
  {
    key: "segmentation",
    title: "Fragments and regions",
    measures: "Approximate pieces (when a background is separated) and colour-coherent regions used for screening.",
    algorithm: (c) =>
      `SLIC superpixels (Achanta et al., 2012): about ${c.regions.targetCount} regions, compactness ${c.regions.compactness}, ${c.regions.iterations} iterations in CIELAB+xy space, followed by a connectivity pass. When a background was separated, the foreground mask is cleaned with 3×3 morphological opening and closing and split into 8-connected components; components smaller than ${(c.fragments.minAreaFraction * 100).toFixed(2)}% of the image are dropped.`,
    limitations:
      "Touching or overlapping fragments merge into one component; a single fragment with a strong internal edge is not split. Superpixels are not fragments. Without a background, no fragment count is produced.",
    verification: "Count fragments manually on a subset of photos to check the component count.",
  },
  {
    key: "screening",
    title: "Possible visual anomalies",
    measures: "Regions whose colour or texture is unusual for container glass under the prototype rules.",
    algorithm: (c) =>
      `Per-superpixel statistics (mean L*, chroma, hue, L* standard deviation, share of highlight pixels L* ≥ 93 and dark pixels L* < 20) are tested against four rules: unusual colour (mostly 'other colour' with C* ≥ ${c.anomalies.unusualColourMinChroma}); uniform light low-texture region (L* ≥ ${c.anomalies.opaqueLightMinLightness}, C* < ${c.anomalies.opaqueMaxChroma}, σL* < ${c.anomalies.opaqueMaxTexture}, no highlights); high-contrast neutral neighbourhood (C* < ${c.anomalies.metalMaxChroma}, σL* ≥ ${c.anomalies.metalMinTexture}, both highlights and dark pixels); dark featureless region against a light background (L* < ${c.anomalies.darkOpaqueMaxLightness}). Adjacent flagged superpixels of the same type are merged; regions smaller than ${(c.anomalies.minAreaFraction * 100).toFixed(1)}% of the image are ignored, and regions larger than ${(c.anomalies.maxAreaFraction * 100).toFixed(0)}% are treated as a probable surface rather than an object.`,
    limitations:
      "No trained model is used. Colour and texture cannot reliably distinguish glass from ceramic, stone, porcelain, glass-ceramic, metal or plastic. Expect both false positives (e.g. overlapping clear glass, glints) and false negatives (e.g. clear plastic, white ceramic on a white background, small contaminants). Rule thresholds were set by inspecting synthetic test scenes only.",
    verification:
      "Physically locate and inspect every flagged region. Ceramic/stone/porcelain screening in practice requires transmitted-light optical sorting or manual inspection; metals need magnetic or eddy-current separation.",
  },
  {
    key: "reliability",
    title: "Reliability indicators",
    measures: "Whether the photograph's conditions allow a meaningful colour estimate.",
    algorithm: () =>
      "Each indicator (resolution, exposure, clipping, shadows, focus, lighting, material share, uncertain share, glare, background separation, region colour consistency, fragment separation) is graded good / caution / poor against fixed thresholds. Tier: Unsuitable if any critical indicator is poor; Low if any indicator is poor; Moderate if any is caution; otherwise Higher.",
    limitations:
      "The tier is a rule-based summary, not a calibrated probability, and is not an accuracy figure. A 'Higher' tier says the photo has no detected problems — it does not say the estimate is correct, and it says nothing about material identification.",
    verification: "Estimate real error by comparing against physically sorted and weighed samples (see README → Evaluation).",
  },
  {
    key: "rules",
    title: "Prototype inspection rules",
    measures: "Turns the measurements into plain-language prompts for an operator.",
    algorithm: () =>
      "A list of configurable rules (lib/analysis/rules.ts) each inspects the measurements and may emit a finding with severity info, caution, action or blocking. Overall status: Unsuitable if any blocking finding; Inspect if any action finding; otherwise Assessable.",
    limitations:
      "These rules are prototype inspection prompts. They are not industrial acceptance criteria, are not derived from any standard or regulation, and must not be used to accept, reject or route a batch.",
    verification: "Agree acceptance criteria with the receiving plant and base them on physical testing.",
  },
];

export const WHAT_IT_CANNOT_MEASURE = [
  "Mass or volume composition of a batch (only visible image area).",
  "Chemical composition, lead or heavy-metal content, or glass type (soda-lime vs borosilicate vs glass-ceramic).",
  "Ceramic, stone and porcelain (CSP) content with any reliability.",
  "Material hidden beneath the top layer or outside the frame.",
  "Fragment size distribution with metrological accuracy (no scale reference).",
  "Furnace suitability, compliance with any specification, or remelt quality.",
];

export const PHYSICAL_VALIDATION = [
  "Collect representative physical samples alongside each photo, using a documented sampling procedure.",
  "Hand-sort each sample by colour and contaminant type; weigh each fraction to obtain mass ground truth.",
  "Photograph under a fixed, documented rig (camera, lens, lighting, background, colour reference card).",
  "Hold out a test set of photos not used for tuning; report per-class error (e.g. mean absolute error in percentage points) and its spread.",
  "Establish the relationship between image area and mass for your material before using area as a proxy.",
  "For contaminant screening, measure detection and false-alarm rates against hand-inspected samples.",
];
