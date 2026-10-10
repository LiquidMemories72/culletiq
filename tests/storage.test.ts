import { describe, expect, it } from "vitest";
import { SampleService, toSummary } from "@/lib/storage/service";
import { InMemoryImageStore, InMemorySampleRepository } from "@/lib/storage/memory";
import type { SampleRepository } from "@/lib/storage/types";
import { compareSamples, computeDashboardStats } from "@/lib/analysis/compare";
import { makeRecord, resultFor } from "./helpers";

function service() {
  const images = new InMemoryImageStore();
  return { images, svc: new SampleService(new InMemorySampleRepository(), images) };
}

const input = (name: string, scene = "synthetic-mixed-dark") => ({
  name,
  source: { kind: "upload" as const, fileName: "x.jpg", fileType: "image/jpeg", fileSizeBytes: 123 },
  result: resultFor(scene),
  thumbnailDataUrl: "data:image/jpeg;base64,AAA",
  overlayDataUrl: "data:image/png;base64,BBB",
});

describe("SampleService persistence", () => {
  it("saves, lists newest-first and reopens a sample with its images", async () => {
    const { svc } = service();
    const a = await svc.save(input("first"), new Date("2026-01-01T10:00:00Z"));
    const b = await svc.save(input("second"), new Date("2026-01-02T10:00:00Z"));
    const list = await svc.listSummaries();
    expect(list.map((s) => s.id)).toEqual([b.id, a.id]);
    const loaded = await svc.load(a.id);
    expect(loaded?.record.name).toBe("first");
    expect(loaded?.thumbnailUrl).toBe("data:image/jpeg;base64,AAA");
    expect(loaded?.overlayUrl).toBe("data:image/png;base64,BBB");
    expect(loaded?.record.result.colour).toEqual(resultFor("synthetic-mixed-dark").colour);
  });

  it("deletes a record and its images", async () => {
    const { svc, images } = service();
    const a = await svc.save(input("x"));
    expect(images.size).toBe(2);
    await svc.remove(a.id);
    expect(await svc.load(a.id)).toBeNull();
    expect(images.size).toBe(0);
    await expect(svc.remove("missing")).resolves.toBeUndefined();
  });

  it("validates names and renames", async () => {
    const { svc } = service();
    await expect(svc.save(input("   "))).rejects.toThrow(/name/);
    const a = await svc.save(input("old"));
    await svc.rename(a.id, " new ");
    expect((await svc.load(a.id))?.record.name).toBe("new");
    await expect(svc.rename("missing", "x")).rejects.toThrow(/not found/);
  });

  it("cleans up images if the record write fails", async () => {
    const images = new InMemoryImageStore();
    const failing: SampleRepository = {
      list: async () => [],
      get: async () => null,
      put: async () => {
        throw new Error("quota exceeded");
      },
      delete: async () => undefined,
    };
    const svc = new SampleService(failing, images);
    await expect(svc.save(input("x"))).rejects.toThrow(/quota/);
    expect(images.size).toBe(0);
  });

  it("returns copies so callers cannot mutate stored records", async () => {
    const { svc } = service();
    const a = await svc.save(input("x"));
    const loaded = await svc.load(a.id);
    loaded!.record.name = "mutated";
    expect((await svc.load(a.id))!.record.name).toBe("x");
  });

  it("summarises records", () => {
    const s = toSummary(makeRecord("S1", "synthetic-with-foreign-objects", "2026-01-01T00:00:00Z"));
    expect(s.anomalyCount).toBeGreaterThan(0);
    expect(s.colourValid).toBe(true);
  });
});

describe("sample comparison", () => {
  it("computes per-class differences in percentage points (b − a)", () => {
    const a = makeRecord("A", "synthetic-mixed-dark", "2026-01-01T00:00:00Z");
    const b = makeRecord("B", "synthetic-green-light", "2026-01-02T00:00:00Z");
    const c = compareSamples(a, b);
    expect(c.deltas.green).toBeCloseTo(b.result.colour.percentages.green - a.result.colour.percentages.green);
    expect(c.comparable).toBe(true);
    expect(c.caveats.some((x) => /not mass fractions/.test(x))).toBe(true);
    expect(c.caveats.some((x) => /exposure/.test(x))).toBe(true); // dark vs light surface
    expect(["clear", "green", "brown"]).toContain(c.largestShift!.cls);
  });

  it("marks comparisons with an unsuitable sample as not comparable", () => {
    const a = makeRecord("A", "synthetic-mixed-dark", "2026-01-01T00:00:00Z");
    const b = makeRecord("B", "synthetic-underexposed-blurred", "2026-01-02T00:00:00Z");
    expect(compareSamples(a, b).comparable).toBe(false);
  });

  it("warns when thresholds differ", () => {
    const a = makeRecord("A", "synthetic-mixed-dark", "2026-01-01T00:00:00Z");
    const b = makeRecord("B", "synthetic-mixed-dark", "2026-01-02T00:00:00Z");
    b.result.config.thresholds = { ...b.result.config.thresholds, clearMaxChroma: 12 };
    expect(compareSamples(a, b).caveats.some((x) => /thresholds/.test(x))).toBe(true);
  });
});

describe("dashboard statistics", () => {
  it("returns an empty state with no records", () => {
    const s = computeDashboardStats([]);
    expect(s.total).toBe(0);
    expect(s.averages).toBeNull();
    expect(s.recentFlags).toEqual([]);
  });

  it("averages only usable samples", () => {
    const recs = [
      makeRecord("A", "synthetic-mixed-dark", "2026-01-01T00:00:00Z"),
      makeRecord("B", "synthetic-green-light", "2026-01-02T00:00:00Z"),
      makeRecord("C", "synthetic-underexposed-blurred", "2026-01-03T00:00:00Z"),
    ];
    const s = computeDashboardStats(recs);
    expect(s.total).toBe(3);
    expect(s.usableCount).toBe(2);
    const expected = (recs[0].result.colour.percentages.green + recs[1].result.colour.percentages.green) / 2;
    expect(s.averages!.green).toBeCloseTo(expected);
    expect(s.statusCounts.unsuitable).toBe(1);
    expect(s.recentFlags[0].sampleId).toBe("C"); // newest first
    expect(s.recentFlags.every((f) => f.finding.severity !== "info")).toBe(true);
  });
});
