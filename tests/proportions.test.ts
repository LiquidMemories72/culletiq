import { describe, expect, it } from "vitest";
import { LABEL_CODE, COLOUR_CLASSES } from "@/types/analysis";
import { computeDistribution, roundPercentages, MIN_MATERIAL_FRACTION } from "@/lib/vision/classify";

function labels(spec: Partial<Record<keyof typeof LABEL_CODE, number>>): Uint8Array {
  const arr: number[] = [];
  for (const [k, n] of Object.entries(spec)) for (let i = 0; i < n!; i++) arr.push(LABEL_CODE[k as keyof typeof LABEL_CODE]);
  return Uint8Array.from(arr);
}

const sum = (r: Record<string, number>) => Object.values(r).reduce((a, b) => a + b, 0);

describe("computeDistribution", () => {
  it("computes material-area proportions that sum to 100", () => {
    const d = computeDistribution(labels({ clear: 30, green: 50, brown: 10, otherColour: 5, uncertain: 5 }));
    expect(d.valid).toBe(true);
    expect(d.percentages.green).toBeCloseTo(50);
    expect(sum(d.percentages)).toBeCloseTo(100, 10);
  });

  it("excludes background and glare from the denominator and reports them separately", () => {
    const d = computeDistribution(labels({ background: 500, glare: 100, green: 300, brown: 100 }));
    expect(d.materialPixels).toBe(400);
    expect(d.percentages.green).toBeCloseTo(75);
    expect(d.percentages.brown).toBeCloseTo(25);
    expect(d.excludedPercentOfImage.background).toBeCloseTo(50);
    expect(d.excludedPercentOfImage.glare).toBeCloseTo(10);
    expect(sum(d.percentages)).toBeCloseTo(100, 10);
  });

  it("counts uncertain regions as material, not as a colour", () => {
    const d = computeDistribution(labels({ uncertain: 60, clear: 40 }));
    expect(d.percentages.uncertain).toBeCloseTo(60);
    expect(d.percentages.clear).toBeCloseTo(40);
  });

  it("handles an empty material mask without NaN and marks it invalid", () => {
    const d = computeDistribution(labels({ background: 1000 }));
    expect(d.materialPixels).toBe(0);
    expect(d.valid).toBe(false);
    for (const c of COLOUR_CLASSES) expect(d.percentages[c]).toBe(0);
    expect(Number.isNaN(sum(d.percentages))).toBe(false);
  });

  it("handles a zero-length label map", () => {
    const d = computeDistribution(new Uint8Array(0));
    expect(d.valid).toBe(false);
    expect(d.totalPixels).toBe(0);
    expect(d.excludedPercentOfImage.background).toBe(0);
  });

  it("marks too-little material as invalid", () => {
    const tiny = Math.floor(1000 * MIN_MATERIAL_FRACTION) - 1;
    const d = computeDistribution(labels({ background: 1000 - tiny, green: tiny }));
    expect(d.valid).toBe(false);
    expect(d.percentages.green).toBeCloseTo(100); // still computed, but flagged invalid
  });
});

describe("roundPercentages", () => {
  it("keeps the rounded total at exactly 100", () => {
    const r = roundPercentages({ a: 33.333, b: 33.333, c: 33.334 }, 1);
    expect(Math.round(sum(r) * 10)).toBe(1000);
    const r2 = roundPercentages({ a: 12.345, b: 45.678, c: 41.977, d: 0 }, 1);
    expect(Math.round(sum(r2) * 10)).toBe(1000);
  });

  it("normalises inputs that do not sum to 100", () => {
    const r = roundPercentages({ a: 1, b: 1 }, 0);
    expect(r).toEqual({ a: 50, b: 50 });
  });

  it("returns zeros for an all-zero input", () => {
    expect(roundPercentages({ a: 0, b: 0 })).toEqual({ a: 0, b: 0 });
  });
});
