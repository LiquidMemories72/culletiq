import { describe, expect, it } from "vitest";
import { itemError, mainClassShares, summariseErrors } from "@/lib/analysis/evaluation";
import { computeDistribution } from "@/lib/vision/classify";
import { LABEL_CODE } from "@/types/analysis";

function dist(counts: Partial<Record<keyof typeof LABEL_CODE, number>>) {
  const arr: number[] = [];
  for (const [k, n] of Object.entries(counts)) for (let i = 0; i < n!; i++) arr.push(LABEL_CODE[k as keyof typeof LABEL_CODE]);
  return computeDistribution(Uint8Array.from(arr));
}

describe("evaluation metrics", () => {
  it("renormalises the three main classes, dropping other/uncertain", () => {
    const s = mainClassShares(dist({ clear: 20, green: 40, brown: 20, uncertain: 20 }))!;
    expect(s.clear).toBeCloseTo(25);
    expect(s.green).toBeCloseTo(50);
    expect(s.brown).toBeCloseTo(25);
  });

  it("returns null when no main class is observed", () => {
    expect(mainClassShares(dist({ uncertain: 10 }))).toBeNull();
  });

  it("computes MAE and bias, excluding unusable items", () => {
    const a = itemError("a", dist({ clear: 30, green: 40, brown: 30 }), { clear: 20, green: 50, brown: 30 }, true);
    const b = itemError("b", dist({ clear: 50, green: 50 }), { clear: 50, green: 50, brown: 0 }, true);
    const c = itemError("c", dist({ clear: 50 }), { clear: 0, green: 100, brown: 0 }, false);
    expect(a.error!.clear).toBeCloseTo(10);
    expect(c.error).toBeNull();
    const s = summariseErrors([a, b, c]);
    expect(s.n).toBe(3);
    expect(s.failed).toBe(1);
    expect(s.mae!.clear).toBeCloseTo(5);
    expect(s.bias!.green).toBeCloseTo(-5);
    expect(s.maxAbsError).toBeCloseTo(10);
  });

  it("handles all-failed sets", () => {
    const s = summariseErrors([itemError("x", dist({ uncertain: 1 }), { clear: 100, green: 0, brown: 0 }, true)]);
    expect(s.mae).toBeNull();
    expect(s.failed).toBe(1);
  });
});
