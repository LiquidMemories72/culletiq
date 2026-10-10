/**
 * Display names and colours for pixel classes — single source for UI, overlays and reports.
 * Chart hexes were checked with a colour-vision-deficiency validator (adjacent pairs pass;
 * green and amber are separated by lightness because they are a red–green pair).
 * "Uncertain" is deliberately neutral grey in charts plus a hatch texture; on image overlays it
 * uses hatched magenta (rgb) so it stands out against glass of any colour.
 */
import type { PixelLabel } from "@/types/analysis";

export interface ClassStyle {
  label: string;
  shortLabel: string;
  hex: string;
  rgb: [number, number, number];
  description: string;
}

export const CLASS_STYLE: Record<PixelLabel, ClassStyle> = {
  clear: {
    label: "Clear / flint-like",
    shortLabel: "Clear",
    hex: "#4a87cc",
    rgb: [74, 135, 204],
    description: "Near-neutral pixels (low CIELAB chroma) bright enough to judge.",
  },
  green: {
    label: "Green",
    shortLabel: "Green",
    hex: "#1f6f45",
    rgb: [31, 111, 69],
    description: "Chromatic pixels with a green hue angle.",
  },
  brown: {
    label: "Brown / amber",
    shortLabel: "Brown",
    hex: "#d68a2e",
    rgb: [214, 138, 46],
    description: "Chromatic pixels with an orange-to-yellow hue angle.",
  },
  otherColour: {
    label: "Other colour",
    shortLabel: "Other",
    hex: "#8a58c4",
    rgb: [138, 88, 196],
    description: "Chromatic pixels outside the green and brown hue ranges (e.g. blue, red, violet).",
  },
  uncertain: {
    label: "Uncertain",
    shortLabel: "Uncertain",
    hex: "#8f8b84",
    rgb: [236, 64, 160],
    description: "Too dark, weakly tinted, dark-neutral, or near a hue boundary to categorise.",
  },
  background: {
    label: "Background (excluded)",
    shortLabel: "Background",
    hex: "#e9e7e1",
    rgb: [0, 0, 0],
    description: "Uniform surface connected to the image border; not counted as material.",
  },
  glare: {
    label: "Glare (excluded)",
    shortLabel: "Glare",
    hex: "#f4f2ec",
    rgb: [255, 255, 255],
    description: "Near-white specular highlights; reflect the light source, not glass colour.",
  },
};
