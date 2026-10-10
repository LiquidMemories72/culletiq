import { describe, expect, it } from "vitest";
import {
  MAX_FILE_BYTES,
  fitWithin,
  resizeArea,
  sniffImageType,
  validateFileMeta,
  validateImage,
} from "@/lib/vision/preprocess";
import { solidImage } from "./helpers";

describe("validateFileMeta (invalid uploads)", () => {
  it("accepts JPEG, PNG and WebP", () => {
    for (const type of ["image/jpeg", "image/png", "image/webp"]) {
      expect(validateFileMeta({ name: "a.img", type, size: 1000 }).ok).toBe(true);
    }
  });

  it("rejects other MIME types with a useful message", () => {
    const r = validateFileMeta({ name: "doc.pdf", type: "application/pdf", size: 1000 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/JPEG, PNG or WebP/);
    expect(validateFileMeta({ name: "a.gif", type: "image/gif", size: 10 }).ok).toBe(false);
    expect(validateFileMeta({ name: "a.heic", type: "image/heic", size: 10 }).ok).toBe(false);
  });

  it("falls back to the extension when the browser gives no MIME type", () => {
    expect(validateFileMeta({ name: "photo.JPG", type: "", size: 10 }).ok).toBe(true);
    expect(validateFileMeta({ name: "photo.txt", type: "", size: 10 }).ok).toBe(false);
  });

  it("rejects empty and oversized files", () => {
    expect(validateFileMeta({ name: "a.png", type: "image/png", size: 0 }).ok).toBe(false);
    const big = validateFileMeta({ name: "a.png", type: "image/png", size: MAX_FILE_BYTES + 1 });
    expect(big.ok).toBe(false);
    if (!big.ok) expect(big.error).toMatch(/limit/);
  });
});

describe("sniffImageType", () => {
  it("recognises magic bytes", () => {
    expect(sniffImageType(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe("image/jpeg");
    expect(sniffImageType(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe("image/png");
    const webp = new TextEncoder().encode("RIFF\0\0\0\0WEBPVP8 ");
    expect(sniffImageType(webp)).toBe("image/webp");
  });

  it("rejects renamed non-image content", () => {
    expect(sniffImageType(new TextEncoder().encode("%PDF-1.7 hello"))).toBeNull();
    expect(sniffImageType(new Uint8Array([]))).toBeNull();
  });
});

describe("validateImage", () => {
  it("accepts a normal image", () => {
    expect(validateImage(solidImage(200, 100, [10, 20, 30])).ok).toBe(true);
  });
  it("rejects tiny images", () => {
    const r = validateImage(solidImage(32, 200, [0, 0, 0]));
    expect(r.ok).toBe(false);
  });
  it("rejects inconsistent buffers and bad dimensions", () => {
    expect(validateImage({ width: 100, height: 100, data: new Uint8ClampedArray(10) }).ok).toBe(false);
    expect(validateImage({ width: 0, height: 100, data: new Uint8ClampedArray(0) }).ok).toBe(false);
    expect(validateImage({ width: 1.5, height: 100, data: new Uint8ClampedArray(600) }).ok).toBe(false);
  });
});

describe("resizing", () => {
  it("preserves aspect ratio and never upsamples", () => {
    expect(fitWithin(4000, 3000, 800)).toEqual({ width: 800, height: 600 });
    expect(fitWithin(3000, 4000, 800)).toEqual({ width: 600, height: 800 });
    expect(fitWithin(300, 200, 800)).toEqual({ width: 300, height: 200 });
  });

  it("area-averages pixels", () => {
    // Left half black, right half white → 2×1 output after 2× downscale of a 4×2 image.
    const img = solidImage(4, 2, [0, 0, 0], { rgb: [255, 255, 255], x: 2, y: 0, w: 2, h: 2 });
    const out = resizeArea(img, 2);
    expect(out.width).toBe(2);
    expect(out.height).toBe(1);
    expect(out.data[0]).toBe(0);
    expect(out.data[4]).toBe(255);
  });

  it("averages mixed blocks", () => {
    const img = solidImage(2, 2, [0, 0, 0], { rgb: [200, 100, 50], x: 0, y: 0, w: 1, h: 2 });
    const out = resizeArea(img, 1);
    expect(Array.from(out.data.slice(0, 3))).toEqual([100, 50, 25]);
  });

  it("returns a copy when no resize is needed", () => {
    const img = solidImage(10, 10, [1, 2, 3]);
    const out = resizeArea(img, 100);
    expect(out.data).not.toBe(img.data);
    expect(out.data).toEqual(img.data);
  });
});
