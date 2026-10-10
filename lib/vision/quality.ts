/**
 * Stage 1b: observable image-quality measurements.
 */
import type { ImageQualityMetrics, RgbaImage } from "@/types/analysis";
import type { LabPlanes } from "./colour";

export function measureQuality(
  img: RgbaImage,
  planes: LabPlanes,
  original: { width: number; height: number },
): ImageQualityMetrics {
  const { width, height, data } = img;
  const n = width * height;
  let sumL = 0;
  let sumL2 = 0;
  let clipped = 0;
  let crushed = 0;
  let transparent = 0;
  for (let i = 0, p = 0; i < n; i++, p += 4) {
    const l = planes.L[i];
    sumL += l;
    sumL2 += l * l;
    const mx = Math.max(data[p], data[p + 1], data[p + 2]);
    if (mx >= 252) clipped++;
    if (mx <= 8) crushed++;
    if (data[p + 3] < 128) transparent++;
  }
  const meanL = sumL / n;
  const stdL = Math.sqrt(Math.max(0, sumL2 / n - meanL * meanL));

  return {
    originalWidth: original.width,
    originalHeight: original.height,
    analysedWidth: width,
    analysedHeight: height,
    meanLightness: meanL,
    lightnessStd: stdL,
    clippedHighlightFraction: clipped / n,
    crushedShadowFraction: crushed / n,
    sharpness: laplacianVariance(planes.gray, width, height),
    illuminationVariation: blockIlluminationVariation(planes.L, width, height, 8),
    illuminationMethod: "p90",
    transparentFraction: transparent / n,
  };
}

/** Variance of the 4-neighbour Laplacian — a standard focus/blur measure (Pech-Pacheco et al., 2000). */
export function laplacianVariance(gray: Float32Array, width: number, height: number): number {
  let sum = 0;
  let sum2 = 0;
  let cnt = 0;
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x;
      const v = gray[i - 1] + gray[i + 1] + gray[i - width] + gray[i + width] - 4 * gray[i];
      sum += v;
      sum2 += v * v;
      cnt++;
    }
  }
  if (cnt === 0) return 0;
  const mean = sum / cnt;
  return sum2 / cnt - mean * mean;
}

/**
 * Coefficient of variation of the 90th-percentile L* across a grid of blocks.
 * Bright pixels track illumination more than dark ones, but the measure is still
 * confounded by scene content (e.g. a brown-glass cluster lowers a block's value).
 */
export function blockIlluminationVariation(L: Float32Array, width: number, height: number, grid: number): number {
  const values: number[] = [];
  for (let gy = 0; gy < grid; gy++) {
    for (let gx = 0; gx < grid; gx++) {
      const x0 = Math.floor((gx * width) / grid);
      const x1 = Math.floor(((gx + 1) * width) / grid);
      const y0 = Math.floor((gy * height) / grid);
      const y1 = Math.floor(((gy + 1) * height) / grid);
      const hist = new Uint32Array(101);
      let cnt = 0;
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          hist[Math.min(100, Math.max(0, Math.round(L[y * width + x])))]++;
          cnt++;
        }
      }
      if (cnt === 0) continue;
      const target = cnt * 0.9;
      let acc = 0;
      let p90 = 100;
      for (let v = 0; v <= 100; v++) {
        acc += hist[v];
        if (acc >= target) {
          p90 = v;
          break;
        }
      }
      values.push(p90);
    }
  }
  if (values.length === 0) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  if (mean <= 0) return 0;
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance) / mean;
}

/**
 * Lighting variation measured on the detected background only: coefficient of
 * variation of mean L* across grid blocks that are at least 25% background.
 * A uniform surface should have uniform lightness, so variation here reflects
 * lighting rather than content. Returns null if fewer than 6 blocks qualify.
 */
export function backgroundIlluminationVariation(
  L: Float32Array,
  mask: Uint8Array,
  width: number,
  height: number,
  grid = 8,
): number | null {
  const values: number[] = [];
  for (let gy = 0; gy < grid; gy++) {
    for (let gx = 0; gx < grid; gx++) {
      const x0 = Math.floor((gx * width) / grid);
      const x1 = Math.floor(((gx + 1) * width) / grid);
      const y0 = Math.floor((gy * height) / grid);
      const y1 = Math.floor(((gy + 1) * height) / grid);
      let sum = 0;
      let cnt = 0;
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          const i = y * width + x;
          if (mask[i]) {
            sum += L[i];
            cnt++;
          }
        }
      }
      if (cnt >= 0.25 * (x1 - x0) * (y1 - y0) && cnt > 0) values.push(sum / cnt);
    }
  }
  if (values.length < 6) return null;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  if (mean <= 0) return null;
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance) / mean;
}
