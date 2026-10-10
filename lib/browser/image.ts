"use client";

/** Browser-only image helpers: decode files, make thumbnails, render overlays. */
import type { RgbaImage } from "@/types/analysis";
import { fitWithin, sniffImageType, validateFileMeta } from "@/lib/vision/preprocess";
import { renderOverlay } from "@/lib/vision/overlay";

/** Decoded pixels are capped at this longest side before analysis to bound memory. */
export const DECODE_MAX_DIMENSION = 2048;

export class ImageInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImageInputError";
  }
}

export interface DecodedImage {
  image: RgbaImage;
  originalSize: { width: number; height: number };
  /** Object URL for previewing the original file. Revoke when done. */
  previewUrl: string;
}

export async function decodeImageFile(file: File): Promise<DecodedImage> {
  const meta = validateFileMeta(file);
  if (!meta.ok) throw new ImageInputError(meta.error);
  const header = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  if (!sniffImageType(header)) {
    throw new ImageInputError("The file content is not a JPEG, PNG or WebP image (it may be renamed or corrupted).");
  }
  let bitmap: ImageBitmap;
  try {
    // "from-image" applies EXIF orientation so phone photos are upright.
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new ImageInputError("The image could not be decoded. It may be corrupted or in an unsupported variant.");
  }
  try {
    const originalSize = { width: bitmap.width, height: bitmap.height };
    const { width, height } = fitWithin(bitmap.width, bitmap.height, DECODE_MAX_DIMENSION);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new ImageInputError("Canvas 2D is not available in this browser.");
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bitmap, 0, 0, width, height);
    const data = ctx.getImageData(0, 0, width, height).data;
    return { image: { width, height, data }, originalSize, previewUrl: URL.createObjectURL(file) };
  } finally {
    bitmap.close();
  }
}

/** Fetch a same-origin demo asset and wrap it as a File. */
export async function fetchDemoFile(url: string, name: string): Promise<File> {
  const res = await fetch(url);
  if (!res.ok) throw new ImageInputError(`Could not load demonstration image (${res.status}).`);
  const blob = await res.blob();
  return new File([blob], name, { type: blob.type || "image/png" });
}

export function imageToDataUrl(img: RgbaImage, maxDim: number, type = "image/jpeg", quality = 0.85): string {
  const src = document.createElement("canvas");
  src.width = img.width;
  src.height = img.height;
  src.getContext("2d")!.putImageData(new ImageData(new Uint8ClampedArray(img.data), img.width, img.height), 0, 0);
  const { width, height } = fitWithin(img.width, img.height, maxDim);
  if (width === img.width && height === img.height) return src.toDataURL(type, quality);
  const dst = document.createElement("canvas");
  dst.width = width;
  dst.height = height;
  const ctx = dst.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(src, 0, 0, width, height);
  return dst.toDataURL(type, quality);
}

export function overlayToDataUrl(labelMap: Uint8Array, boundaryMask: Uint8Array, width: number, height: number): string {
  const rgba = renderOverlay(labelMap, boundaryMask, width, height);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d")!.putImageData(new ImageData(rgba, width, height), 0, 0);
  return canvas.toDataURL("image/png");
}

export function downloadText(content: string, fileName: string, mime = "application/json") {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
