/**
 * Procedural SYNTHETIC cullet scenes for demos and tests.
 *
 * These images are drawn by code: convex polygons tinted like clear, green and
 * amber glass, with shading, rim highlights, specular spots and noise. They are
 * NOT photographs and do not represent real industrial samples. Their "ground
 * truth" is the drawn pixel area of each class — exact for the drawing, but it
 * says nothing about how the pipeline performs on real photographs.
 */
import type { RgbaImage } from "@/types/analysis";

export type GlassKind = "clear" | "green" | "brown";
export type ExtraKind = "ceramic" | "metalCap" | "bluePlastic" | "stone";

export interface SceneSpec {
  id: string;
  title: string;
  description: string;
  limitations: string;
  width: number;
  height: number;
  seed: number;
  /** null = no visible surface; fragments are packed over a dark crevice colour. */
  background: { rgb: [number, number, number]; noise: number } | null;
  fragments: { count: number; minRadius: number; maxRadius: number; mix: Record<GlassKind, number> };
  extras: ExtraKind[];
  post?: { brightness?: number; blurRadius?: number };
}

export interface SceneGroundTruth {
  kind: "synthetic-drawn-area";
  /** % of drawn glass pixels by class (sums to 100). */
  glassAreaPercent: Record<GlassKind, number>;
  /** % of whole image covered by each extra object. */
  extraAreaPercent: Partial<Record<ExtraKind, number>>;
  /** Normalised bounding boxes of the drawn extra objects (where they were drawn, before any glass overlap). */
  extraBoxes: { kind: ExtraKind; x: number; y: number; w: number; h: number }[];
  /** % of image not covered by any object. */
  uncoveredPercent: number;
}

export interface SyntheticScene {
  spec: SceneSpec;
  image: RgbaImage;
  groundTruth: SceneGroundTruth;
}

const TINT: Record<GlassKind, { rgb: [number, number, number]; alpha: number }> = {
  clear: { rgb: [228, 236, 231], alpha: 0.55 },
  green: { rgb: [36, 116, 56], alpha: 0.86 },
  brown: { rgb: [122, 64, 18], alpha: 0.9 },
};

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gaussian(rand: () => number): number {
  // Irwin–Hall approximation (sum of 4 uniforms), unit variance.
  return (rand() + rand() + rand() + rand() - 2) * Math.sqrt(3);
}

type Vec = [number, number];

function randomConvexPolygon(rand: () => number, cx: number, cy: number, r: number): Vec[] {
  const n = 5 + Math.floor(rand() * 4);
  const angles = Array.from({ length: n }, (_, i) => ((i + rand() * 0.7) / n) * Math.PI * 2).sort((a, b) => a - b);
  const pts = angles.map((a) => {
    const rr = r * (0.65 + rand() * 0.35);
    return [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * (0.7 + rand() * 0.3)] as Vec;
  });
  return convexHull(pts);
}

function convexHull(points: Vec[]): Vec[] {
  const p = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o: Vec, a: Vec, b: Vec) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower: Vec[] = [];
  for (const pt of p) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], pt) <= 0) lower.pop();
    lower.push(pt);
  }
  const upper: Vec[] = [];
  for (let i = p.length - 1; i >= 0; i--) {
    const pt = p[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], pt) <= 0) upper.pop();
    upper.push(pt);
  }
  return lower.slice(0, -1).concat(upper.slice(0, -1));
}

/** Signed min distance from (x,y) to the edges of a CCW convex polygon (positive inside). */
function insideDistance(poly: Vec[], x: number, y: number): number {
  let min = Infinity;
  for (let i = 0; i < poly.length; i++) {
    const [x1, y1] = poly[i];
    const [x2, y2] = poly[(i + 1) % poly.length];
    const ex = x2 - x1;
    const ey = y2 - y1;
    const len = Math.hypot(ex, ey) || 1;
    const d = (ex * (y - y1) - ey * (x - x1)) / len;
    if (d < min) min = d;
  }
  return min;
}

interface Canvas {
  w: number;
  h: number;
  rgb: Float32Array;
  owner: Int16Array;
}

const EXTRA_OWNER_BASE = 1000;
const EXTRA_KINDS: ExtraKind[] = ["ceramic", "metalCap", "bluePlastic", "stone"];
const GLASS_KINDS: GlassKind[] = ["clear", "green", "brown"];

export function generateScene(spec: SceneSpec): SyntheticScene {
  const rand = mulberry32(spec.seed);
  const { width: w, height: h } = spec;
  const c: Canvas = { w, h, rgb: new Float32Array(w * h * 3), owner: new Int16Array(w * h).fill(-1) };

  // Background (or dark crevice colour for packed piles) with a gentle lighting gradient.
  const bg = spec.background ?? { rgb: [30, 28, 26] as [number, number, number], noise: 4 };
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const light = 0.96 + 0.06 * (x / w) - 0.03 * (y / h);
      const i = (y * w + x) * 3;
      for (let k = 0; k < 3; k++) c.rgb[i + k] = bg.rgb[k] * light + gaussian(rand) * bg.noise;
    }
  }

  const kinds = pickKinds(rand, spec.fragments.count, spec.fragments.mix);
  // Place extras first in the list so glass may partly overlap them, like a real pile.
  const extraBoxes: SceneGroundTruth["extraBoxes"] = [];
  for (const e of spec.extras) extraBoxes.push({ kind: e, ...drawExtra(c, rand, e) });
  for (let f = 0; f < kinds.length; f++) {
    const r = spec.fragments.minRadius + rand() * (spec.fragments.maxRadius - spec.fragments.minRadius);
    const cx = r * 0.5 + rand() * (w - r);
    const cy = r * 0.5 + rand() * (h - r);
    drawGlass(c, rand, randomConvexPolygon(rand, cx, cy, r), kinds[f], GLASS_KINDS.indexOf(kinds[f]));
  }

  if (spec.post?.blurRadius) boxBlur(c, spec.post.blurRadius);
  const brightness = spec.post?.brightness ?? 1;

  const data = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    data[i * 4] = c.rgb[i * 3] * brightness;
    data[i * 4 + 1] = c.rgb[i * 3 + 1] * brightness;
    data[i * 4 + 2] = c.rgb[i * 3 + 2] * brightness;
    data[i * 4 + 3] = 255;
  }

  // Ground truth from the owner map (top-most object per pixel).
  const glassCounts = [0, 0, 0];
  const extraCounts = [0, 0, 0, 0];
  let uncovered = 0;
  for (let i = 0; i < w * h; i++) {
    const o = c.owner[i];
    if (o < 0) uncovered++;
    else if (o >= EXTRA_OWNER_BASE) extraCounts[o - EXTRA_OWNER_BASE]++;
    else glassCounts[o]++;
  }
  const glassTotal = glassCounts.reduce((a, b) => a + b, 0) || 1;
  const n = w * h;
  const extraAreaPercent: Partial<Record<ExtraKind, number>> = {};
  EXTRA_KINDS.forEach((k, i) => {
    if (extraCounts[i]) extraAreaPercent[k] = round2((extraCounts[i] / n) * 100);
  });

  return {
    spec,
    image: { width: w, height: h, data },
    groundTruth: {
      kind: "synthetic-drawn-area",
      glassAreaPercent: {
        clear: round2((glassCounts[0] / glassTotal) * 100),
        green: round2((glassCounts[1] / glassTotal) * 100),
        brown: round2((glassCounts[2] / glassTotal) * 100),
      },
      extraAreaPercent,
      extraBoxes,
      uncoveredPercent: round2((uncovered / n) * 100),
    },
  };
}

function round2(v: number) {
  return Math.round(v * 100) / 100;
}

function pickKinds(rand: () => number, count: number, mix: Record<GlassKind, number>): GlassKind[] {
  const total = mix.clear + mix.green + mix.brown;
  const out: GlassKind[] = [];
  for (let i = 0; i < count; i++) {
    const u = rand() * total;
    out.push(u < mix.clear ? "clear" : u < mix.clear + mix.green ? "green" : "brown");
  }
  return out;
}

function drawGlass(c: Canvas, rand: () => number, poly: Vec[], kind: GlassKind, ownerId: number) {
  const base = TINT[kind];
  const tint = base.rgb.map((v) => Math.max(0, Math.min(255, v + (rand() - 0.5) * 16)));
  const alpha = base.alpha;
  const dir = rand() * Math.PI * 2;
  const dx = Math.cos(dir);
  const dy = Math.sin(dir);
  const xs = poly.map((p) => p[0]);
  const ys = poly.map((p) => p[1]);
  const x0 = Math.max(0, Math.floor(Math.min(...xs)));
  const x1 = Math.min(c.w - 1, Math.ceil(Math.max(...xs)));
  const y0 = Math.max(0, Math.floor(Math.min(...ys)));
  const y1 = Math.min(c.h - 1, Math.ceil(Math.max(...ys)));
  const cx = xs.reduce((a, b) => a + b, 0) / xs.length;
  const cy = ys.reduce((a, b) => a + b, 0) / ys.length;
  const r = Math.max(x1 - x0, y1 - y0) / 2 || 1;
  // Specular spot position inside the polygon.
  const sx = cx + (rand() - 0.5) * r * 0.6;
  const sy = cy + (rand() - 0.5) * r * 0.6;
  const sr = r * (0.06 + rand() * 0.08);
  const rimStrength = 0.35 + rand() * 0.35;

  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const d = insideDistance(poly, x + 0.5, y + 0.5);
      if (d < 0) continue;
      const i = y * c.w + x;
      const p = i * 3;
      const t = ((x - cx) * dx + (y - cy) * dy) / r;
      const shade = 0.88 + 0.14 * t;
      for (let k = 0; k < 3; k++) {
        let v = c.rgb[p + k] * (1 - alpha) + tint[k] * alpha * shade;
        if (d < 1.6) v = v + (255 - v) * rimStrength; // edge catches light
        c.rgb[p + k] = v + gaussian(rand) * 2.5;
      }
      const sd = Math.hypot(x - sx, (y - sy) * 1.6);
      if (sd < sr) {
        const s = 1 - sd / sr;
        for (let k = 0; k < 3; k++) c.rgb[p + k] = c.rgb[p + k] + (252 - c.rgb[p + k]) * Math.min(1, s * 1.8);
      }
      c.owner[i] = ownerId;
    }
  }
}

function drawExtra(c: Canvas, rand: () => number, kind: ExtraKind): { x: number; y: number; w: number; h: number } {
  const r = Math.min(c.w, c.h) * (0.06 + rand() * 0.03);
  const cx = r + rand() * (c.w - 2 * r);
  const cy = r + rand() * (c.h - 2 * r);
  const owner = EXTRA_OWNER_BASE + EXTRA_KINDS.indexOf(kind);
  const poly = kind === "bluePlastic" ? randomConvexPolygon(rand, cx, cy, r) : null;
  for (let y = Math.max(0, Math.floor(cy - r)); y <= Math.min(c.h - 1, Math.ceil(cy + r)); y++) {
    for (let x = Math.max(0, Math.floor(cx - r)); x <= Math.min(c.w - 1, Math.ceil(cx + r)); x++) {
      const ex = (x - cx) / r;
      const ey = (y - cy) / (r * (kind === "ceramic" || kind === "stone" ? 0.75 : 1));
      const dist = Math.hypot(ex, ey);
      const inside = poly ? insideDistance(poly, x + 0.5, y + 0.5) >= 0 : dist <= 1;
      if (!inside) continue;
      const i = y * c.w + x;
      const p = i * 3;
      let rgb: [number, number, number];
      let noise: number;
      switch (kind) {
        case "ceramic": {
          const s = 1 - 0.03 * ex;
          rgb = [226 * s, 223 * s, 215 * s];
          noise = 0.8;
          break;
        }
        case "stone":
          rgb = [40, 38, 35];
          noise = 1.2;
          break;
        case "bluePlastic": {
          const s = 0.95 + 0.05 * ex;
          rgb = [34 * s, 84 * s, 192 * s];
          noise = 1.5;
          break;
        }
        case "metalCap": {
          const v = 132 + 118 * Math.sin(dist * Math.PI * 3.2 + 0.4);
          rgb = [v, v * 0.99, v * 0.97];
          noise = 2;
          break;
        }
      }
      for (let k = 0; k < 3; k++) c.rgb[p + k] = rgb[k] + gaussian(rand) * noise;
      c.owner[i] = owner;
    }
  }
  return { x: (cx - r) / c.w, y: (cy - r) / c.h, w: (2 * r) / c.w, h: (2 * r) / c.h };
}

function boxBlur(c: Canvas, radius: number) {
  const { w, h } = c;
  const tmp = new Float32Array(c.rgb.length);
  const pass = (src: Float32Array, dst: Float32Array, horizontal: boolean) => {
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        for (let k = 0; k < 3; k++) {
          let s = 0;
          let n = 0;
          for (let d = -radius; d <= radius; d++) {
            const xx = horizontal ? x + d : x;
            const yy = horizontal ? y : y + d;
            if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
            s += src[(yy * w + xx) * 3 + k];
            n++;
          }
          dst[(y * w + x) * 3 + k] = s / n;
        }
      }
    }
  };
  pass(c.rgb, tmp, true);
  pass(tmp, c.rgb, false);
}

const SYNTHETIC_NOTE = "SYNTHETIC image generated by code — not a photograph of real cullet.";

export const DEMO_SCENES: SceneSpec[] = [
  {
    id: "synthetic-mixed-dark",
    title: "Mixed fragments on a dark surface",
    description: `${SYNTHETIC_NOTE} Clear, green and amber pieces spread on a dark grey surface.`,
    limitations:
      "Clear glass is drawn semi-transparent over grey, so it appears grey and may be partly classified as uncertain. Ideal, even lighting; no real optics (refraction, thickness, dirt).",
    width: 960,
    height: 720,
    seed: 11,
    background: { rgb: [52, 54, 58], noise: 2 },
    fragments: { count: 46, minRadius: 26, maxRadius: 62, mix: { clear: 0.36, green: 0.34, brown: 0.3 } },
    extras: [],
  },
  {
    id: "synthetic-green-light",
    title: "Mostly green on a light surface",
    description: `${SYNTHETIC_NOTE} Predominantly green fragments with some clear and amber on a pale neutral surface.`,
    limitations:
      "Clear glass on a pale neutral background is nearly the same colour as the background, so clear area is expected to be under-estimated — the app should flag this.",
    width: 960,
    height: 720,
    seed: 23,
    background: { rgb: [214, 212, 205], noise: 1.5 },
    fragments: { count: 40, minRadius: 26, maxRadius: 60, mix: { clear: 0.15, green: 0.7, brown: 0.15 } },
    extras: [],
  },
  {
    id: "synthetic-packed-pile",
    title: "Packed pile filling the frame",
    description: `${SYNTHETIC_NOTE} Densely overlapping fragments with dark gaps and no visible surface.`,
    limitations:
      "No background to separate, so individual fragments are not segmented (region-level analysis only). Dark gaps between pieces are counted as uncertain material. Uniform patches where clear pieces overlap can be flagged by the heuristic screening — an example of a false positive.",
    width: 960,
    height: 720,
    seed: 37,
    background: null,
    fragments: { count: 260, minRadius: 34, maxRadius: 74, mix: { clear: 0.45, green: 0.25, brown: 0.3 } },
    extras: [],
  },
  {
    id: "synthetic-with-foreign-objects",
    title: "Fragments with non-glass look-alikes",
    description: `${SYNTHETIC_NOTE} Mixed glass plus drawn stand-ins for a ceramic chip, a metal cap, a blue plastic piece and a dark stone.`,
    limitations:
      "The foreign objects are simple drawn shapes with idealised appearance. Detecting them here does not show that real ceramic, metal, plastic or stone would be detected.",
    width: 960,
    height: 720,
    seed: 41,
    background: { rgb: [118, 121, 124], noise: 1.8 },
    fragments: { count: 34, minRadius: 26, maxRadius: 58, mix: { clear: 0.4, green: 0.3, brown: 0.3 } },
    extras: ["ceramic", "metalCap", "bluePlastic", "stone"],
  },
  {
    id: "synthetic-underexposed-blurred",
    title: "Underexposed and blurred",
    description: `${SYNTHETIC_NOTE} The mixed scene, darkened and blurred to imitate a poor photograph.`,
    limitations: "Deliberately poor image. The expected outcome is that the app reports the image as unsuitable or low-reliability.",
    width: 960,
    height: 720,
    seed: 11,
    background: { rgb: [52, 54, 58], noise: 2 },
    fragments: { count: 46, minRadius: 26, maxRadius: 62, mix: { clear: 0.36, green: 0.34, brown: 0.3 } },
    extras: [],
    post: { brightness: 0.22, blurRadius: 4 },
  },
];
