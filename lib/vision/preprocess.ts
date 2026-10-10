/**
 * Stage 1: input validation and resampling.
 */
import type { RgbaImage } from "@/types/analysis";

export const ACCEPTED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const MAX_FILE_BYTES = 15 * 1024 * 1024;
/** Images smaller than this on either side are rejected outright. */
export const MIN_IMAGE_SIDE = 64;
/** Images larger than this are rejected to protect browser memory. */
export const MAX_IMAGE_PIXELS = 50_000_000;

export type FileValidation = { ok: true } | { ok: false; error: string };

/** Validate file metadata before decoding. */
export function validateFileMeta(file: { name: string; type: string; size: number }): FileValidation {
  if (file.size === 0) return { ok: false, error: "The file is empty." };
  if (file.size > MAX_FILE_BYTES) {
    return {
      ok: false,
      error: `The file is ${(file.size / 1024 / 1024).toFixed(1)} MB. The limit is ${MAX_FILE_BYTES / 1024 / 1024} MB.`,
    };
  }
  const type = file.type.toLowerCase();
  const ext = file.name.toLowerCase().split(".").pop() ?? "";
  const typeOk = (ACCEPTED_MIME_TYPES as readonly string[]).includes(type);
  const extOk = ["jpg", "jpeg", "png", "webp"].includes(ext);
  if (!typeOk && !(type === "" && extOk)) {
    return {
      ok: false,
      error: `Unsupported file type${type ? ` (${type})` : ""}. Please upload a JPEG, PNG or WebP image.`,
    };
  }
  return { ok: true };
}

/** Check the magic bytes so a renamed non-image file is rejected before decoding. */
export function sniffImageType(header: Uint8Array): "image/jpeg" | "image/png" | "image/webp" | null {
  if (header.length >= 3 && header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff) return "image/jpeg";
  if (
    header.length >= 8 &&
    header[0] === 0x89 &&
    header[1] === 0x50 &&
    header[2] === 0x4e &&
    header[3] === 0x47 &&
    header[4] === 0x0d &&
    header[5] === 0x0a &&
    header[6] === 0x1a &&
    header[7] === 0x0a
  )
    return "image/png";
  if (
    header.length >= 12 &&
    String.fromCharCode(header[0], header[1], header[2], header[3]) === "RIFF" &&
    String.fromCharCode(header[8], header[9], header[10], header[11]) === "WEBP"
  )
    return "image/webp";
  return null;
}

/** Validate decoded dimensions and buffer consistency. */
export function validateImage(img: RgbaImage): FileValidation {
  if (!Number.isInteger(img.width) || !Number.isInteger(img.height) || img.width <= 0 || img.height <= 0) {
    return { ok: false, error: "The image has invalid dimensions." };
  }
  if (img.data.length !== img.width * img.height * 4) {
    return { ok: false, error: "The image pixel buffer is inconsistent with its dimensions." };
  }
  if (img.width < MIN_IMAGE_SIDE || img.height < MIN_IMAGE_SIDE) {
    return {
      ok: false,
      error: `The image is ${img.width}×${img.height} px. At least ${MIN_IMAGE_SIDE} px per side is required.`,
    };
  }
  if (img.width * img.height > MAX_IMAGE_PIXELS) {
    return { ok: false, error: "The image is too large to process in the browser (over 50 megapixels)." };
  }
  return { ok: true };
}

/** Target size preserving aspect ratio so the longest side ≤ maxDim. Never upsamples. */
export function fitWithin(width: number, height: number, maxDim: number): { width: number; height: number } {
  const longest = Math.max(width, height);
  if (longest <= maxDim) return { width, height };
  const s = maxDim / longest;
  return { width: Math.max(1, Math.round(width * s)), height: Math.max(1, Math.round(height * s)) };
}

/**
 * Area-average (box filter) downsampling. Equivalent in intent to OpenCV INTER_AREA:
 * each output pixel is the mean of the source pixels it covers, which avoids aliasing.
 */
export function resizeArea(img: RgbaImage, maxDim: number): RgbaImage {
  const { width: ow, height: oh } = fitWithin(img.width, img.height, maxDim);
  if (ow === img.width && oh === img.height) {
    return { width: img.width, height: img.height, data: new Uint8ClampedArray(img.data) };
  }
  const out = new Uint8ClampedArray(ow * oh * 4);
  const sw = img.width;
  const src = img.data;
  for (let y = 0; y < oh; y++) {
    const sy0 = Math.floor((y * img.height) / oh);
    const sy1 = Math.max(sy0 + 1, Math.floor(((y + 1) * img.height) / oh));
    for (let x = 0; x < ow; x++) {
      const sx0 = Math.floor((x * sw) / ow);
      const sx1 = Math.max(sx0 + 1, Math.floor(((x + 1) * sw) / ow));
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      for (let sy = sy0; sy < sy1; sy++) {
        let p = (sy * sw + sx0) * 4;
        for (let sx = sx0; sx < sx1; sx++, p += 4) {
          r += src[p];
          g += src[p + 1];
          b += src[p + 2];
          a += src[p + 3];
        }
      }
      const cnt = (sy1 - sy0) * (sx1 - sx0);
      const o = (y * ow + x) * 4;
      out[o] = r / cnt;
      out[o + 1] = g / cnt;
      out[o + 2] = b / cnt;
      out[o + 3] = a / cnt;
    }
  }
  return { width: ow, height: oh, data: out };
}
