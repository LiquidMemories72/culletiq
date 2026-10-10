/**
 * Stage 3a: SLIC superpixels (Achanta et al., 2012) in CIELAB + xy, plus per-region statistics.
 * Superpixels give region-level analysis when individual fragments cannot be separated.
 */
import { LABEL_BY_CODE, LABEL_CODE, type RegionConfig } from "@/types/analysis";
import type { LabPlanes } from "./colour";

export interface SlicOutput {
  labels: Int32Array;
  count: number;
}

export function slic(planes: LabPlanes, grad: Float32Array, w: number, h: number, cfg: RegionConfig): SlicOutput {
  const n = w * h;
  const K = Math.max(1, Math.min(cfg.targetCount, Math.floor(n / 16)));
  const S = Math.max(2, Math.sqrt(n / K));
  const cL: number[] = [];
  const cA: number[] = [];
  const cB: number[] = [];
  const cX: number[] = [];
  const cY: number[] = [];
  for (let y = S / 2; y < h; y += S) {
    for (let x = S / 2; x < w; x += S) {
      let bx = Math.min(w - 1, Math.round(x));
      let by = Math.min(h - 1, Math.round(y));
      // Move seed to the lowest-gradient position in a 3×3 neighbourhood.
      let best = Infinity;
      const ox = bx;
      const oy = by;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const xx = ox + dx;
          const yy = oy + dy;
          if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
          const g = grad[yy * w + xx];
          if (g < best) {
            best = g;
            bx = xx;
            by = yy;
          }
        }
      }
      const i = by * w + bx;
      cL.push(planes.L[i]);
      cA.push(planes.A[i]);
      cB.push(planes.B[i]);
      cX.push(bx);
      cY.push(by);
    }
  }
  const k = cL.length;
  const labels = new Int32Array(n).fill(-1);
  const dist = new Float32Array(n);
  const spatialW = (cfg.compactness / S) ** 2;
  const win = Math.ceil(S);

  for (let it = 0; it < cfg.iterations; it++) {
    dist.fill(Infinity);
    for (let c = 0; c < k; c++) {
      const x0 = Math.max(0, Math.floor(cX[c] - win));
      const x1 = Math.min(w - 1, Math.ceil(cX[c] + win));
      const y0 = Math.max(0, Math.floor(cY[c] - win));
      const y1 = Math.min(h - 1, Math.ceil(cY[c] + win));
      for (let y = y0; y <= y1; y++) {
        const dy = y - cY[c];
        for (let x = x0; x <= x1; x++) {
          const i = y * w + x;
          const dl = planes.L[i] - cL[c];
          const da = planes.A[i] - cA[c];
          const db = planes.B[i] - cB[c];
          const dx = x - cX[c];
          const d = dl * dl + da * da + db * db + spatialW * (dx * dx + dy * dy);
          if (d < dist[i]) {
            dist[i] = d;
            labels[i] = c;
          }
        }
      }
    }
    const sL = new Float64Array(k);
    const sA = new Float64Array(k);
    const sB = new Float64Array(k);
    const sX = new Float64Array(k);
    const sY = new Float64Array(k);
    const cnt = new Float64Array(k);
    for (let i = 0; i < n; i++) {
      const c = labels[i];
      if (c < 0) continue;
      sL[c] += planes.L[i];
      sA[c] += planes.A[i];
      sB[c] += planes.B[i];
      sX[c] += i % w;
      sY[c] += Math.floor(i / w);
      cnt[c]++;
    }
    for (let c = 0; c < k; c++) {
      if (!cnt[c]) continue;
      cL[c] = sL[c] / cnt[c];
      cA[c] = sA[c] / cnt[c];
      cB[c] = sB[c] / cnt[c];
      cX[c] = sX[c] / cnt[c];
      cY[c] = sY[c] / cnt[c];
    }
  }
  return enforceConnectivity(labels, w, h, Math.max(4, Math.floor((S * S) / 4)));
}

/** Relabel so every superpixel is 4-connected; tiny fragments merge into a neighbour. */
function enforceConnectivity(old: Int32Array, w: number, h: number, minSize: number): SlicOutput {
  const n = w * h;
  const out = new Int32Array(n).fill(-1);
  const queue = new Int32Array(n);
  let next = 0;
  for (let s = 0; s < n; s++) {
    if (out[s] >= 0) continue;
    const sx = s % w;
    const sy = (s - sx) / w;
    let adj = -1;
    if (sx > 0 && out[s - 1] >= 0) adj = out[s - 1];
    else if (sy > 0 && out[s - w] >= 0) adj = out[s - w];
    const lab = old[s];
    let qh = 0;
    let qt = 0;
    queue[qt++] = s;
    out[s] = next;
    while (qh < qt) {
      const i = queue[qh++];
      const x = i % w;
      const y = (i - x) / w;
      const nbs = [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, y > 0 ? i - w : -1, y < h - 1 ? i + w : -1];
      for (const j of nbs) {
        if (j >= 0 && out[j] < 0 && old[j] === lab) {
          out[j] = next;
          queue[qt++] = j;
        }
      }
    }
    if (qt < minSize && adj >= 0) {
      for (let q = 0; q < qt; q++) out[queue[q]] = adj;
    } else {
      next++;
    }
  }
  return { labels: out, count: next };
}

/** Per-region statistics computed over non-background pixels. */
export interface RegionStats {
  count: number;
  /** All pixels in region. */
  area: Float64Array;
  /** Non-background pixels in region. */
  fgArea: Float64Array;
  meanL: Float64Array;
  meanA: Float64Array;
  meanB: Float64Array;
  stdL: Float64Array;
  /** Sum of L*² over non-background pixels (for neighbourhood statistics). */
  sumL2: Float64Array;
  highlightFrac: Float64Array;
  darkFrac: Float64Array;
  /** Pixel counts per label code, stride = LABEL_BY_CODE.length. */
  classCounts: Float64Array;
  minX: Int32Array;
  minY: Int32Array;
  maxX: Int32Array;
  maxY: Int32Array;
  sumX: Float64Array;
  sumY: Float64Array;
}

export const NUM_LABELS = LABEL_BY_CODE.length;
/** L* at or above which a pixel counts as a specular highlight. */
export const HIGHLIGHT_L = 93;
/** L* below which a pixel counts as dark. */
export const DARK_L = 20;

export function computeRegionStats(
  regions: SlicOutput,
  planes: LabPlanes,
  labelMap: Uint8Array,
  w: number,
): RegionStats {
  const k = regions.count;
  const s: RegionStats = {
    count: k,
    area: new Float64Array(k),
    fgArea: new Float64Array(k),
    meanL: new Float64Array(k),
    meanA: new Float64Array(k),
    meanB: new Float64Array(k),
    stdL: new Float64Array(k),
    sumL2: new Float64Array(k),
    highlightFrac: new Float64Array(k),
    darkFrac: new Float64Array(k),
    classCounts: new Float64Array(k * NUM_LABELS),
    minX: new Int32Array(k).fill(1 << 30),
    minY: new Int32Array(k).fill(1 << 30),
    maxX: new Int32Array(k).fill(-1),
    maxY: new Int32Array(k).fill(-1),
    sumX: new Float64Array(k),
    sumY: new Float64Array(k),
  };
  const sumL2 = s.sumL2;
  const bg = LABEL_CODE.background;
  for (let i = 0; i < regions.labels.length; i++) {
    const r = regions.labels[i];
    const x = i % w;
    const y = (i - x) / w;
    s.area[r]++;
    s.classCounts[r * NUM_LABELS + labelMap[i]]++;
    if (x < s.minX[r]) s.minX[r] = x;
    if (y < s.minY[r]) s.minY[r] = y;
    if (x > s.maxX[r]) s.maxX[r] = x;
    if (y > s.maxY[r]) s.maxY[r] = y;
    s.sumX[r] += x;
    s.sumY[r] += y;
    if (labelMap[i] === bg) continue;
    const l = planes.L[i];
    s.fgArea[r]++;
    s.meanL[r] += l;
    s.meanA[r] += planes.A[i];
    s.meanB[r] += planes.B[i];
    sumL2[r] += l * l;
    if (l >= HIGHLIGHT_L) s.highlightFrac[r]++;
    if (l < DARK_L) s.darkFrac[r]++;
  }
  for (let r = 0; r < k; r++) {
    const f = s.fgArea[r];
    if (!f) continue;
    s.meanL[r] /= f;
    s.meanA[r] /= f;
    s.meanB[r] /= f;
    s.stdL[r] = Math.sqrt(Math.max(0, sumL2[r] / f - s.meanL[r] ** 2));
    s.highlightFrac[r] /= f;
    s.darkFrac[r] /= f;
  }
  return s;
}

/** Undirected adjacency between regions (4-neighbour). */
export function regionAdjacency(labels: Int32Array, w: number, h: number, count: number): Set<number>[] {
  const adj = Array.from({ length: count }, () => new Set<number>());
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const a = labels[i];
      if (x < w - 1) {
        const b = labels[i + 1];
        if (a !== b) {
          adj[a].add(b);
          adj[b].add(a);
        }
      }
      if (y < h - 1) {
        const b = labels[i + w];
        if (a !== b) {
          adj[a].add(b);
          adj[b].add(a);
        }
      }
    }
  }
  return adj;
}

/** Material-pixel-weighted mean of each region's dominant-class share. */
export function meanRegionPurity(stats: RegionStats): number {
  let weighted = 0;
  let total = 0;
  for (let r = 0; r < stats.count; r++) {
    let material = 0;
    let max = 0;
    for (let c = LABEL_CODE.clear; c < NUM_LABELS; c++) {
      const v = stats.classCounts[r * NUM_LABELS + c];
      material += v;
      if (v > max) max = v;
    }
    if (!material) continue;
    weighted += max;
    total += material;
  }
  return total ? weighted / total : 0;
}
