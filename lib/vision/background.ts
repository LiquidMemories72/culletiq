/**
 * Stage 2a: background separation.
 *
 * Hypothesis: if the photo shows fragments on a uniform surface, the image border
 * is dominated by one low-texture colour. We model that colour from the border
 * ring and flood-fill inward through similar, low-gradient pixels. Fragment edges
 * (high gradient) act as barriers so same-coloured glass interiors are not
 * swallowed — but transparent glass transmits the background, so separation of
 * clear glass is inherently unreliable and is flagged.
 */
import type { BackgroundConfig, BackgroundEstimate, ColourThresholds, RgbaImage } from "@/types/analysis";
import { chroma, deltaE, type LabPlanes } from "./colour";

export interface BackgroundOutput {
  estimate: BackgroundEstimate;
  /** 1 = background pixel. */
  mask: Uint8Array;
}

function median(values: Float32Array | number[]): number {
  const arr = Array.from(values).sort((a, b) => a - b);
  if (arr.length === 0) return 0;
  const mid = arr.length >> 1;
  return arr.length % 2 ? arr[mid] : (arr[mid - 1] + arr[mid]) / 2;
}

export function estimateBackground(
  img: RgbaImage,
  planes: LabPlanes,
  grad: Float32Array,
  cfg: BackgroundConfig,
  thresholds: ColourThresholds,
): BackgroundOutput {
  const { width: w, height: h, data } = img;
  const n = w * h;
  const mask = new Uint8Array(n);
  let transparent = 0;
  for (let i = 0; i < n; i++) {
    if (data[i * 4 + 3] < 128) {
      mask[i] = 1;
      transparent++;
    }
  }

  const reject = (reason: string, extra: Partial<BackgroundEstimate> = {}): BackgroundOutput => {
    // Keep only transparent pixels as background.
    const m = new Uint8Array(n);
    for (let i = 0; i < n; i++) if (data[i * 4 + 3] < 128) m[i] = 1;
    return {
      mask: m,
      estimate: {
        mode: cfg.mode,
        detected: false,
        meanLab: null,
        borderConsistency: 0,
        borderTexture: 0,
        fraction: transparent / n,
        similarToClearGlass: false,
        reason,
        ...extra,
      },
    };
  };

  if (cfg.mode === "none") {
    return reject("Background detection disabled: the material is assumed to fill the frame.");
  }

  // Border ring indices.
  const m = Math.max(2, Math.round(Math.min(w, h) * cfg.borderFraction));
  const border: number[] = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (x < m || x >= w - m || y < m || y >= h - m) {
        const i = y * w + x;
        if (data[i * 4 + 3] >= 128) border.push(i);
      }
    }
  }
  if (border.length === 0) return reject("No opaque border pixels to model a background from.");

  // Median border colour (subsampled for speed).
  const stride = Math.max(1, Math.floor(border.length / 20000));
  const sl: number[] = [];
  const sa: number[] = [];
  const sb: number[] = [];
  for (let k = 0; k < border.length; k += stride) {
    const i = border[k];
    sl.push(planes.L[i]);
    sa.push(planes.A[i]);
    sb.push(planes.B[i]);
  }
  const mL = median(sl);
  const mA = median(sa);
  const mB = median(sb);

  let consistent = 0;
  let texSum = 0;
  let sumL = 0;
  let sumA = 0;
  let sumB = 0;
  const seeds: number[] = [];
  for (const i of border) {
    if (deltaE(planes.L[i], planes.A[i], planes.B[i], mL, mA, mB) < cfg.colourTolerance) {
      consistent++;
      texSum += grad[i];
      sumL += planes.L[i];
      sumA += planes.A[i];
      sumB += planes.B[i];
      if (grad[i] < cfg.floodGradientLimit) seeds.push(i);
    }
  }
  const consistency = consistent / border.length;
  const texture = consistent ? texSum / consistent : Infinity;
  const diag = { borderConsistency: consistency, borderTexture: Number.isFinite(texture) ? texture : 0 };

  if (consistency < cfg.minBorderConsistency) {
    return reject(
      `Border colours vary (${(consistency * 100).toFixed(0)}% consistent; ${(cfg.minBorderConsistency * 100).toFixed(0)}% required). The material probably fills the frame or the surface is non-uniform, so no background was removed.`,
      diag,
    );
  }
  if (texture > cfg.maxBorderTexture) {
    return reject(
      `The border is uniform in colour but textured (mean gradient ${texture.toFixed(1)} > ${cfg.maxBorderTexture}), which is more typical of packed material than a plain surface. No background was removed.`,
      diag,
    );
  }

  const bgL = sumL / consistent;
  const bgA = sumA / consistent;
  const bgB = sumB / consistent;
  let spread2 = 0;
  for (const i of border) {
    const d = deltaE(planes.L[i], planes.A[i], planes.B[i], bgL, bgA, bgB);
    if (d < cfg.colourTolerance) spread2 += d * d;
  }
  const spread = Math.sqrt(spread2 / consistent);
  const tol = Math.min(cfg.colourTolerance * 2, Math.max(cfg.colourTolerance, 2.5 * spread));

  // Flood fill from seeds through similar, low-gradient pixels (4-connected).
  const queue = new Int32Array(n);
  let qh = 0;
  let qt = 0;
  for (const s of seeds) {
    if (!mask[s]) {
      mask[s] = 1;
      queue[qt++] = s;
    }
  }
  const accept = (j: number) =>
    !mask[j] &&
    grad[j] < cfg.floodGradientLimit &&
    deltaE(planes.L[j], planes.A[j], planes.B[j], bgL, bgA, bgB) < tol;
  while (qh < qt) {
    const i = queue[qh++];
    const x = i % w;
    const y = (i - x) / w;
    if (x > 0 && accept(i - 1)) {
      mask[i - 1] = 1;
      queue[qt++] = i - 1;
    }
    if (x < w - 1 && accept(i + 1)) {
      mask[i + 1] = 1;
      queue[qt++] = i + 1;
    }
    if (y > 0 && accept(i - w)) {
      mask[i - w] = 1;
      queue[qt++] = i - w;
    }
    if (y < h - 1 && accept(i + w)) {
      mask[i + w] = 1;
      queue[qt++] = i + w;
    }
  }

  // Absorb thin edge rings that the gradient barrier left behind: background-coloured
  // pixels touching background (2 passes, so at most ~2 px are absorbed at any edge).
  for (let pass = 0; pass < 2; pass++) {
    const add: number[] = [];
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const i = y * w + x;
        if (mask[i]) continue;
        const nb = mask[i - 1] + mask[i + 1] + mask[i - w] + mask[i + w];
        if (nb === 0) continue;
        const d = deltaE(planes.L[i], planes.A[i], planes.B[i], bgL, bgA, bgB);
        if (d < tol || (nb >= 3 && d < tol * 1.5)) add.push(i);
      }
    }
    for (const i of add) mask[i] = 1;
  }

  let count = 0;
  for (let i = 0; i < n; i++) count += mask[i];
  const fraction = count / n;

  if (fraction > cfg.maxBackgroundFraction) {
    return reject(
      `A background candidate would cover ${(fraction * 100).toFixed(0)}% of the image (limit ${(cfg.maxBackgroundFraction * 100).toFixed(0)}%), so it is more likely to be material. No background was removed.`,
      diag,
    );
  }

  const bgChroma = chroma(bgA, bgB);
  const neutral = bgChroma < thresholds.clearMaxChroma + 4;
  const reason =
    `Uniform border detected (${(consistency * 100).toFixed(0)}% consistent, mean gradient ${texture.toFixed(1)}). ` +
    `Background colour L*=${bgL.toFixed(0)}, a*=${bgA.toFixed(0)}, b*=${bgB.toFixed(0)}; ${(fraction * 100).toFixed(1)}% of the image removed.` +
    (neutral
      ? " The background is neutral-coloured: clear glass transmits it and may be partly removed with it or confused with it."
      : "");

  return {
    mask,
    estimate: {
      mode: cfg.mode,
      detected: true,
      meanLab: [bgL, bgA, bgB],
      borderConsistency: consistency,
      borderTexture: texture,
      fraction,
      similarToClearGlass: neutral,
      reason,
    },
  };
}
