/** Render a classification overlay (RGBA, transparent where background). */
import { LABEL_BY_CODE, LABEL_CODE } from "@/types/analysis";
import { CLASS_STYLE } from "@/lib/classes";

export function renderOverlay(
  labelMap: Uint8Array,
  boundaryMask: Uint8Array,
  w: number,
  h: number,
): Uint8ClampedArray<ArrayBuffer> {
  const out = new Uint8ClampedArray(w * h * 4);
  const rgb = LABEL_BY_CODE.map((l) => CLASS_STYLE[l].rgb);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const p = i * 4;
      if (boundaryMask.length && boundaryMask[i]) {
        out[p] = 255;
        out[p + 1] = 255;
        out[p + 2] = 255;
        out[p + 3] = 255;
        continue;
      }
      const code = labelMap[i];
      if (code === LABEL_CODE.background) continue;
      const [r, g, b] = rgb[code];
      out[p] = r;
      out[p + 1] = g;
      out[p + 2] = b;
      if (code === LABEL_CODE.uncertain) {
        // Diagonal hatching so "uncertain" reads differently from any colour class.
        out[p + 3] = (x + y) % 8 < 4 ? 230 : 70;
      } else if (code === LABEL_CODE.glare) {
        out[p + 3] = 140;
      } else {
        out[p + 3] = 190;
      }
    }
  }
  return out;
}
