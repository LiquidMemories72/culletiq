/**
 * Stage 3b: fragment segmentation by morphology + connected components.
 * Only meaningful when a background was separated; touching or overlapping
 * fragments merge into one component and are reported as such.
 */
import {
  COLOUR_CLASSES,
  LABEL_CODE,
  type ColourClass,
  type Fragment,
  type FragmentConfig,
} from "@/types/analysis";

/** 3×3 binary erosion. Out-of-bounds counts as 0. */
export function erode(mask: Uint8Array, w: number, h: number): Uint8Array {
  const out = new Uint8Array(w * h);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      if (
        mask[i] &&
        mask[i - 1] &&
        mask[i + 1] &&
        mask[i - w] &&
        mask[i + w] &&
        mask[i - w - 1] &&
        mask[i - w + 1] &&
        mask[i + w - 1] &&
        mask[i + w + 1]
      )
        out[i] = 1;
    }
  }
  return out;
}

/** 3×3 binary dilation. */
export function dilate(mask: Uint8Array, w: number, h: number): Uint8Array {
  const out = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (!mask[i]) continue;
      for (let dy = -1; dy <= 1; dy++) {
        const yy = y + dy;
        if (yy < 0 || yy >= h) continue;
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx;
          if (xx < 0 || xx >= w) continue;
          out[yy * w + xx] = 1;
        }
      }
    }
  }
  return out;
}

export interface Components {
  labels: Int32Array;
  count: number;
  areas: number[];
}

/** 8-connected component labelling (BFS). Background (0) gets label -1. */
export function connectedComponents(mask: Uint8Array, w: number, h: number): Components {
  const n = w * h;
  const labels = new Int32Array(n).fill(-1);
  const queue = new Int32Array(n);
  const areas: number[] = [];
  let count = 0;
  for (let s = 0; s < n; s++) {
    if (!mask[s] || labels[s] >= 0) continue;
    let qh = 0;
    let qt = 0;
    queue[qt++] = s;
    labels[s] = count;
    while (qh < qt) {
      const i = queue[qh++];
      const x = i % w;
      const y = (i - x) / w;
      for (let dy = -1; dy <= 1; dy++) {
        const yy = y + dy;
        if (yy < 0 || yy >= h) continue;
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx;
          if (xx < 0 || xx >= w || (dx === 0 && dy === 0)) continue;
          const j = yy * w + xx;
          if (mask[j] && labels[j] < 0) {
            labels[j] = count;
            queue[qt++] = j;
          }
        }
      }
    }
    areas.push(qt);
    count++;
  }
  return { labels, count, areas };
}

export interface FragmentOutput {
  fragments: Fragment[];
  fragmentCount: number;
  largestComponentShare: number;
  boundaryMask: Uint8Array;
}

export const MAX_REPORTED_FRAGMENTS = 60;

export function segmentFragments(
  backgroundMask: Uint8Array,
  labelMap: Uint8Array,
  w: number,
  h: number,
  cfg: FragmentConfig,
): FragmentOutput {
  const n = w * h;
  let fg: Uint8Array = new Uint8Array(n);
  for (let i = 0; i < n; i++) fg[i] = backgroundMask[i] ? 0 : 1;
  // Opening removes specks; closing fills pinholes from glare/noise.
  fg = dilate(erode(fg, w, h), w, h);
  fg = erode(dilate(fg, w, h), w, h);

  const cc = connectedComponents(fg, w, h);
  const minArea = Math.max(4, Math.round(cfg.minAreaFraction * n));
  const keep = cc.areas.map((a) => a >= minArea);

  const k = cc.count;
  const minX = new Int32Array(k).fill(w);
  const minY = new Int32Array(k).fill(h);
  const maxX = new Int32Array(k).fill(-1);
  const maxY = new Int32Array(k).fill(-1);
  const sumX = new Float64Array(k);
  const sumY = new Float64Array(k);
  const classCounts = new Float64Array(k * COLOUR_CLASSES.length);
  const boundaryMask = new Uint8Array(n);

  for (let i = 0; i < n; i++) {
    const c = cc.labels[i];
    if (c < 0 || !keep[c]) continue;
    const x = i % w;
    const y = (i - x) / w;
    if (x < minX[c]) minX[c] = x;
    if (y < minY[c]) minY[c] = y;
    if (x > maxX[c]) maxX[c] = x;
    if (y > maxY[c]) maxY[c] = y;
    sumX[c] += x;
    sumY[c] += y;
    const lab = labelMap[i];
    if (lab >= LABEL_CODE.clear) classCounts[c * COLOUR_CLASSES.length + (lab - LABEL_CODE.clear)]++;
    if (
      x === 0 ||
      y === 0 ||
      x === w - 1 ||
      y === h - 1 ||
      cc.labels[i - 1] !== c ||
      cc.labels[i + 1] !== c ||
      cc.labels[i - w] !== c ||
      cc.labels[i + w] !== c
    )
      boundaryMask[i] = 1;
  }

  const fragments: Fragment[] = [];
  let totalFg = 0;
  let largest = 0;
  for (let c = 0; c < k; c++) {
    if (!keep[c]) continue;
    const area = cc.areas[c];
    totalFg += area;
    if (area > largest) largest = area;
    let material = 0;
    let best = -1;
    let bestCount = 0;
    for (let j = 0; j < COLOUR_CLASSES.length; j++) {
      const v = classCounts[c * COLOUR_CLASSES.length + j];
      material += v;
      if (v > bestCount) {
        bestCount = v;
        best = j;
      }
    }
    fragments.push({
      id: 0,
      box: { x: minX[c] / w, y: minY[c] / h, w: (maxX[c] - minX[c] + 1) / w, h: (maxY[c] - minY[c] + 1) / h },
      centroid: { x: sumX[c] / area / w, y: sumY[c] / area / h },
      areaPercent: (area / n) * 100,
      dominantClass: best >= 0 ? (COLOUR_CLASSES[best] as ColourClass) : null,
      purity: material ? bestCount / material : 0,
      touchesBorder: minX[c] === 0 || minY[c] === 0 || maxX[c] === w - 1 || maxY[c] === h - 1,
    });
  }
  fragments.sort((a, b) => b.areaPercent - a.areaPercent);
  fragments.forEach((f, i) => (f.id = i + 1));

  return {
    fragments: fragments.slice(0, MAX_REPORTED_FRAGMENTS),
    fragmentCount: fragments.length,
    largestComponentShare: totalFg ? largest / totalFg : 0,
    boundaryMask,
  };
}
