import { describe, expect, it } from "vitest";
import { ImageValidationError, runPipeline } from "@/lib/analysis/pipeline";
import { COLOUR_CLASSES, LABEL_CODE } from "@/types/analysis";
import { renderOverlay } from "@/lib/vision/overlay";
import { solidImage, smallScene } from "./helpers";

const sum = (r: Record<string, number>) => Object.values(r).reduce((a, b) => a + b, 0);

describe("runPipeline", () => {
  it("rejects invalid images", () => {
    expect(() => runPipeline(solidImage(20, 20, [0, 0, 0]))).toThrow(ImageValidationError);
  });

  it("is deterministic and produces proportions summing to 100", () => {
    const img = smallScene("synthetic-mixed-dark").image;
    const a = runPipeline(img).result;
    const b = runPipeline(img).result;
    expect(a.colour).toEqual(b.colour);
    expect(a.anomalies).toEqual(b.anomalies);
    expect(a.colour.valid).toBe(true);
    expect(sum(a.colour.percentages)).toBeCloseTo(100, 6);
  });

  it("derives estimates from the image: a solid green image is ~100% green", () => {
    const r = runPipeline(solidImage(200, 150, [40, 120, 60])).result;
    expect(r.background.detected).toBe(false); // would cover the whole frame → rejected
    expect(r.colour.percentages.green).toBeGreaterThan(99);
    const brown = runPipeline(solidImage(200, 150, [130, 70, 20])).result;
    expect(brown.colour.percentages.brown).toBeGreaterThan(99);
  });

  it("separates a uniform background and reports fragments", () => {
    const img = solidImage(240, 180, [60, 60, 64], { rgb: [40, 120, 60], x: 80, y: 60, w: 80, h: 60 });
    const r = runPipeline(img).result;
    expect(r.background.detected).toBe(true);
    expect(r.segmentation.mode).toBe("fragments");
    expect(r.segmentation.fragmentCount).toBe(1);
    expect(r.colour.percentages.green).toBeGreaterThan(95);
    const f = r.segmentation.fragments[0];
    expect(f.dominantClass).toBe("green");
    expect(f.box.x).toBeCloseTo(80 / 240, 1);
  });

  it("falls back to region-level analysis when material fills the frame", () => {
    const r = runPipeline(smallScene("synthetic-packed-pile").image).result;
    expect(r.background.detected).toBe(false);
    expect(r.segmentation.mode).toBe("regions");
    expect(r.segmentation.fragmentCount).toBe(0);
    expect(r.segmentation.regionCount).toBeGreaterThan(50);
  });

  it("honours background mode 'none'", () => {
    const img = solidImage(240, 180, [60, 60, 64], { rgb: [40, 120, 60], x: 80, y: 60, w: 80, h: 60 });
    const r = runPipeline(img, { background: { mode: "none" } }).result;
    expect(r.background.detected).toBe(false);
    expect(r.colour.excludedPercentOfImage.background).toBe(0);
  });

  it("flags an unsuitable image honestly and skips screening", () => {
    const r = runPipeline(solidImage(200, 150, [3, 3, 3])).result;
    expect(r.reliability.tier).toBe("unsuitable");
    expect(r.assessment.status).toBe("unsuitable");
    expect(r.anomalies).toEqual([]);
    expect(r.screening.performed).toBe(false);
  });

  it("flags the underexposed demo as unsuitable", () => {
    const r = runPipeline(smallScene("synthetic-underexposed-blurred").image).result;
    expect(r.reliability.tier).toBe("unsuitable");
  });

  it("flags a neutral background as unreliable for clear glass", () => {
    const r = runPipeline(smallScene("synthetic-green-light").image).result;
    expect(r.background.similarToClearGlass).toBe(true);
    expect(r.assessment.findings.some((f) => f.ruleId === "background-similar-to-clear")).toBe(true);
  });

  it("locates the drawn blue plastic as an unusual-colour anomaly", () => {
    const scene = smallScene("synthetic-with-foreign-objects");
    const r = runPipeline(scene.image).result;
    const blue = scene.groundTruth.extraBoxes.find((b) => b.kind === "bluePlastic")!;
    const hit = r.anomalies.find(
      (a) =>
        a.category === "unusualColour" &&
        a.centroid.x >= blue.x &&
        a.centroid.x <= blue.x + blue.w &&
        a.centroid.y >= blue.y &&
        a.centroid.y <= blue.y + blue.h,
    );
    expect(hit).toBeDefined();
    expect(hit!.verification.length).toBeGreaterThan(10);
  });

  it("applies background white balance to a warm neutral surface and records gains", () => {
    const img = solidImage(240, 180, [215, 200, 180], { rgb: [40, 120, 60], x: 80, y: 60, w: 80, h: 60 });
    const r = runPipeline(img).result;
    expect(r.whiteBalance.applied).toBe(true);
    expect(r.whiteBalance.gains![2]).toBeGreaterThan(1); // blue boosted
    const off = runPipeline(img, { whiteBalance: { mode: "none" } }).result;
    expect(off.whiteBalance.applied).toBe(false);
  });

  it("records the original size for the resolution indicator", () => {
    const r = runPipeline(solidImage(200, 150, [40, 120, 60]), undefined, undefined, { width: 4000, height: 3000 }).result;
    expect(r.quality.originalWidth).toBe(4000);
    expect(r.quality.analysedWidth).toBe(200);
  });

  it("returns maps matching the analysed size and renders an overlay", () => {
    const out = runPipeline(smallScene("synthetic-mixed-dark").image);
    expect(out.labelMap.length).toBe(out.width * out.height);
    const overlay = renderOverlay(out.labelMap, out.boundaryMask, out.width, out.height);
    expect(overlay.length).toBe(out.width * out.height * 4);
    // Background pixels are transparent.
    const i = out.labelMap.indexOf(LABEL_CODE.background);
    expect(overlay[i * 4 + 3]).toBe(0);
  });

  it("does not report a large uniform surface as an anomaly", () => {
    // Light uniform 'paper' filling most of the frame, background detection off.
    const img = solidImage(240, 180, [228, 226, 220], { rgb: [40, 120, 60], x: 100, y: 70, w: 40, h: 40 });
    const r = runPipeline(img, { background: { mode: "none" } }).result;
    expect(r.anomalies.every((a) => a.areaPercent <= r.config.anomalies.maxAreaFraction * 100)).toBe(true);
    expect(r.screening.note).toMatch(/probably a visible surface/);
  });

  it("every colour class percentage is finite", () => {
    const r = runPipeline(smallScene("synthetic-with-foreign-objects").image).result;
    for (const c of COLOUR_CLASSES) expect(Number.isFinite(r.colour.percentages[c])).toBe(true);
  });
});
