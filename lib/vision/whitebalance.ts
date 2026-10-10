/**
 * Background-referenced white balance (von Kries-style diagonal correction in linear RGB).
 *
 * Assumption: the detected background is a neutral (white/grey) surface. Each
 * linear channel is scaled so the background's mean becomes neutral while its
 * luminance is preserved. If the surface is genuinely coloured, this assumption
 * is wrong — so it is only applied when the background is already near-neutral,
 * gains are capped, and the operator can switch it off.
 */
import type { RgbaImage, WhiteBalanceConfig, WhiteBalanceResult } from "@/types/analysis";
import { chroma } from "./colour";

const TO_LINEAR = new Float32Array(256);
for (let i = 0; i < 256; i++) {
  const c = i / 255;
  TO_LINEAR[i] = c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function toSrgb8(v: number): number {
  const c = v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
  return Math.max(0, Math.min(255, Math.round(c * 255)));
}

export function backgroundWhiteBalance(
  img: RgbaImage,
  backgroundMask: Uint8Array,
  backgroundLab: [number, number, number] | null,
  cfg: WhiteBalanceConfig,
): { image: RgbaImage; result: WhiteBalanceResult } {
  const skip = (reason: string) => ({ image: img, result: { applied: false, gains: null, reason } });
  if (cfg.mode === "none") return skip("White balance disabled by the operator.");
  if (!backgroundLab) return skip("No background detected, so there is no neutral reference; colours are uncorrected.");
  const bgC = chroma(backgroundLab[1], backgroundLab[2]);
  if (bgC > cfg.maxBackgroundChroma) {
    return skip(
      `The background is noticeably coloured (C* ${bgC.toFixed(1)} > ${cfg.maxBackgroundChroma}), so it cannot be assumed neutral; colours are uncorrected.`,
    );
  }

  let r = 0;
  let g = 0;
  let b = 0;
  let n = 0;
  const d = img.data;
  for (let i = 0; i < backgroundMask.length; i++) {
    if (!backgroundMask[i] || d[i * 4 + 3] < 128) continue;
    r += TO_LINEAR[d[i * 4]];
    g += TO_LINEAR[d[i * 4 + 1]];
    b += TO_LINEAR[d[i * 4 + 2]];
    n++;
  }
  if (n === 0) return skip("No usable background pixels; colours are uncorrected.");
  r /= n;
  g /= n;
  b /= n;
  if (r <= 0 || g <= 0 || b <= 0) return skip("Background too dark to use as a white reference; colours are uncorrected.");
  const Y = 0.2126729 * r + 0.7151522 * g + 0.072175 * b;
  const clamp = (v: number) => Math.min(cfg.maxGain, Math.max(1 / cfg.maxGain, v));
  const gains: [number, number, number] = [clamp(Y / r), clamp(Y / g), clamp(Y / b)];

  // 8-bit lookup tables per channel.
  const lut = gains.map((k) => {
    const t = new Uint8ClampedArray(256);
    for (let i = 0; i < 256; i++) t[i] = toSrgb8(Math.min(1, TO_LINEAR[i] * k));
    return t;
  });
  const out = new Uint8ClampedArray(d.length);
  for (let p = 0; p < d.length; p += 4) {
    out[p] = lut[0][d[p]];
    out[p + 1] = lut[1][d[p + 1]];
    out[p + 2] = lut[2][d[p + 2]];
    out[p + 3] = d[p + 3];
  }
  return {
    image: { width: img.width, height: img.height, data: out },
    result: {
      applied: true,
      gains: gains.map((v) => Math.round(v * 1000) / 1000) as [number, number, number],
      reason: `Background (C* ${bgC.toFixed(1)}) assumed neutral; linear-RGB gains R×${gains[0].toFixed(3)}, G×${gains[1].toFixed(3)}, B×${gains[2].toFixed(3)} applied before colour categorisation.`,
    },
  };
}
