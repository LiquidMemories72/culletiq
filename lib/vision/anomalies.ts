/**
 * Stage 4: conservative visual-anomaly screening on SLIC regions.
 *
 * These are colour/texture heuristics, NOT a trained material classifier.
 * Colour and brightness statistics cannot reliably distinguish glass from
 * ceramic, stone, porcelain, glass-ceramic, metal or plastic. Every output is
 * a "possible visual anomaly" that needs physical verification.
 */
import { LABEL_CODE, type Anomaly, type AnomalyCategory, type AnomalyConfig, type BackgroundEstimate } from "@/types/analysis";
import { chroma, deltaE, hueAngle } from "./colour";
import { NUM_LABELS, type RegionStats } from "./regions";

interface CategoryInfo {
  label: string;
  rule: (c: AnomalyConfig) => string;
  possible: string;
  verification: string;
}

export const ANOMALY_CATEGORIES: Record<AnomalyCategory, CategoryInfo> = {
  unusualColour: {
    label: "Unusual colour",
    rule: (c) =>
      `Region dominated (≥60%) by pixels outside the clear/green/brown hue ranges with mean chroma C* ≥ ${c.unusualColourMinChroma}.`,
    possible: "Blue, red or violet glass; a plastic cap or fragment; a label or printed paper.",
    verification: "Locate the piece in the physical sample and inspect it by hand; separate it if it is not container glass.",
  },
  opaqueLight: {
    label: "Uniform light, low-texture region",
    rule: (c) =>
      `Light (mean L* ≥ ${c.opaqueLightMinLightness}), near-neutral (C* < ${c.opaqueMaxChroma}), very uniform (σL* < ${c.opaqueMaxTexture}) region with no specular highlights, distinct from any detected background.`,
    possible:
      "Ceramic, stone or porcelain (CSP); paper or a label; a flat piece of clear glass photographed against a uniform surface.",
    verification:
      "Check the piece under transmitted light: glass transmits light, ceramic/stone does not. CSP screening normally requires optical sorters or manual inspection.",
  },
  metalLike: {
    label: "High-contrast neutral region",
    rule: (c) =>
      `Near-neutral (C* < ${c.metalMaxChroma}) region whose neutral neighbourhood (region + adjacent near-neutral superpixels) has strong brightness variation (σL* ≥ ${c.metalMinTexture}) containing both bright (L* ≥ 93, ≥${(c.metalMinHighlightFraction * 100).toFixed(0)}%) and dark (L* < 20, ≥${(c.metalMinDarkFraction * 100).toFixed(0)}%) pixels.`,
    possible: "A metal cap, ring or foil; a strongly lit glass edge; a shadowed clear fragment.",
    verification: "Inspect the location; a magnet or eddy-current test can confirm ferrous/non-ferrous metal.",
  },
  darkOpaque: {
    label: "Dark, featureless region",
    rule: (c) =>
      `Very dark (mean L* < ${c.darkOpaqueMaxLightness}), uniform (σL* < 3) region with no highlights, distinct from a detected background that is not itself dark. Not evaluated when no background is detected (gaps and shadows look the same).`,
    possible: "Stone, very dark glass, a shadow, metal, organic residue.",
    verification: "Inspect under transmitted light; dark glass transmits some light at its edges, stone does not.",
  },
};

class UnionFind {
  parent: Int32Array;
  constructor(n: number) {
    this.parent = new Int32Array(n);
    for (let i = 0; i < n; i++) this.parent[i] = i;
  }
  find(i: number): number {
    while (this.parent[i] !== i) {
      this.parent[i] = this.parent[this.parent[i]];
      i = this.parent[i];
    }
    return i;
  }
  union(a: number, b: number) {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra !== rb) this.parent[rb] = ra;
  }
}

/** Statistics over a region and its adjacent near-neutral regions (non-background pixels). */
function neutralNeighbourhoodStats(stats: RegionStats, r: number, adjacency: Set<number>[], maxChroma: number) {
  let fg = 0;
  let sumL = 0;
  let sumL2 = 0;
  let sumA = 0;
  let sumB = 0;
  let hl = 0;
  let dark = 0;
  for (const q of [r, ...adjacency[r]]) {
    const f = stats.fgArea[q];
    if (!f || chroma(stats.meanA[q], stats.meanB[q]) >= maxChroma) continue;
    fg += f;
    sumL += stats.meanL[q] * f;
    sumL2 += stats.sumL2[q];
    sumA += stats.meanA[q] * f;
    sumB += stats.meanB[q] * f;
    hl += stats.highlightFrac[q] * f;
    dark += stats.darkFrac[q] * f;
  }
  if (!fg) return null;
  const meanL = sumL / fg;
  return {
    stdL: Math.sqrt(Math.max(0, sumL2 / fg - meanL * meanL)),
    chroma: chroma(sumA / fg, sumB / fg),
    highlightFrac: hl / fg,
    darkFrac: dark / fg,
  };
}

/** Decide which (if any) anomaly rule a single region triggers. */
export function categoriseRegion(
  stats: RegionStats,
  r: number,
  adjacency: Set<number>[],
  cfg: AnomalyConfig,
  background: BackgroundEstimate,
): AnomalyCategory | null {
  const area = stats.area[r];
  const fg = stats.fgArea[r];
  if (!area || fg / area < 0.5) return null;
  const L = stats.meanL[r];
  const C = chroma(stats.meanA[r], stats.meanB[r]);
  const sd = stats.stdL[r];
  const hl = stats.highlightFrac[r];

  let material = 0;
  for (let c = LABEL_CODE.clear; c < NUM_LABELS; c++) material += stats.classCounts[r * NUM_LABELS + c];
  const other = stats.classCounts[r * NUM_LABELS + LABEL_CODE.otherColour];
  if (material > 0 && other / material >= 0.6 && C >= cfg.unusualColourMinChroma) return "unusualColour";

  const distinctFromBackground =
    !background.detected ||
    !background.meanLab ||
    deltaE(L, stats.meanA[r], stats.meanB[r], ...background.meanLab) > 10;

  // Metal test uses the 1-ring neighbourhood: SLIC splits high-contrast objects
  // into internally uniform superpixels, so contrast is only visible across regions.
  if (C < cfg.metalMaxChroma) {
    const nb = neutralNeighbourhoodStats(stats, r, adjacency, cfg.metalMaxChroma);
    if (
      nb &&
      nb.chroma < cfg.metalMaxChroma &&
      nb.stdL >= cfg.metalMinTexture &&
      nb.highlightFrac >= cfg.metalMinHighlightFraction &&
      nb.darkFrac >= cfg.metalMinDarkFraction
    ) {
      return "metalLike";
    }
  }
  if (L >= cfg.opaqueLightMinLightness && C < cfg.opaqueMaxChroma && sd < cfg.opaqueMaxTexture && hl < 0.01 && distinctFromBackground) {
    return "opaqueLight";
  }
  // Dark featureless regions are only meaningful against a detected, non-dark
  // background; in packed piles they are indistinguishable from gaps and shadows.
  const backgroundIsLight = background.detected && background.meanLab !== null && background.meanLab[0] >= 30;
  if (backgroundIsLight && L < cfg.darkOpaqueMaxLightness && sd < 3 && hl === 0 && distinctFromBackground) {
    return "darkOpaque";
  }
  return null;
}

export interface ScreeningOutput {
  anomalies: Anomaly[];
  /** Area (% of image) of flagged groups too large to be an object (likely a visible surface). */
  suppressedLargePercents: number[];
}

export function screenAnomalies(
  stats: RegionStats,
  adjacency: Set<number>[],
  w: number,
  h: number,
  cfg: AnomalyConfig,
  background: BackgroundEstimate,
): ScreeningOutput {
  const k = stats.count;
  const cats: (AnomalyCategory | null)[] = new Array(k);
  for (let r = 0; r < k; r++) cats[r] = categoriseRegion(stats, r, adjacency, cfg, background);

  const uf = new UnionFind(k);
  for (let r = 0; r < k; r++) {
    if (!cats[r]) continue;
    for (const q of adjacency[r]) if (cats[q] === cats[r]) uf.union(r, q);
  }

  interface Acc {
    cat: AnomalyCategory;
    area: number;
    fg: number;
    L: number;
    A: number;
    B: number;
    sd: number;
    hl: number;
    dark: number;
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
    sx: number;
    sy: number;
    regions: number;
  }
  const groups = new Map<number, Acc>();
  for (let r = 0; r < k; r++) {
    const cat = cats[r];
    if (!cat) continue;
    const root = uf.find(r);
    let g = groups.get(root);
    if (!g) {
      g = { cat, area: 0, fg: 0, L: 0, A: 0, B: 0, sd: 0, hl: 0, dark: 0, minX: w, minY: h, maxX: 0, maxY: 0, sx: 0, sy: 0, regions: 0 };
      groups.set(root, g);
    }
    const f = stats.fgArea[r];
    g.area += stats.area[r];
    g.fg += f;
    g.L += stats.meanL[r] * f;
    g.A += stats.meanA[r] * f;
    g.B += stats.meanB[r] * f;
    g.sd += stats.stdL[r] * f;
    g.hl += stats.highlightFrac[r] * f;
    g.dark += stats.darkFrac[r] * f;
    g.minX = Math.min(g.minX, stats.minX[r]);
    g.minY = Math.min(g.minY, stats.minY[r]);
    g.maxX = Math.max(g.maxX, stats.maxX[r]);
    g.maxY = Math.max(g.maxY, stats.maxY[r]);
    g.sx += stats.sumX[r];
    g.sy += stats.sumY[r];
    g.regions++;
  }

  const n = w * h;
  const minArea = cfg.minAreaFraction * n;
  const maxArea = cfg.maxAreaFraction * n;
  const out: Anomaly[] = [];
  const suppressedLargePercents: number[] = [];
  for (const g of groups.values()) {
    if (g.area < minArea || g.fg === 0) continue;
    if (g.area > maxArea) {
      suppressedLargePercents.push(Math.round((g.area / n) * 1000) / 10);
      continue;
    }
    const info = ANOMALY_CATEGORIES[g.cat];
    const meanA = g.A / g.fg;
    const meanB = g.B / g.fg;
    out.push({
      id: 0,
      category: g.cat,
      label: info.label,
      box: { x: g.minX / w, y: g.minY / h, w: (g.maxX - g.minX + 1) / w, h: (g.maxY - g.minY + 1) / h },
      centroid: { x: g.sx / g.area / w, y: g.sy / g.area / h },
      areaPercent: (g.area / n) * 100,
      features: {
        meanLightness: round(g.L / g.fg),
        meanChroma: round(chroma(meanA, meanB)),
        hueAngle: round(hueAngle(meanA, meanB)),
        lightnessStd: round(g.sd / g.fg),
        highlightFraction: round(g.hl / g.fg, 3),
        darkFraction: round(g.dark / g.fg, 3),
        superpixels: g.regions,
      },
      rule: info.rule(cfg),
      possibleExplanations: info.possible,
      verification: info.verification,
    });
  }
  out.sort((a, b) => b.areaPercent - a.areaPercent);
  out.forEach((a, i) => (a.id = i + 1));
  return { anomalies: out.slice(0, cfg.maxReported), suppressedLargePercents };
}

function round(v: number, d = 1): number {
  const s = 10 ** d;
  return Math.round(v * s) / s;
}
