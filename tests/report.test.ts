import { describe, expect, it } from "vitest";
import { buildReport, describeLocation, reportFileName, reportToJson } from "@/lib/reports/report";
import { DISCLAIMER } from "@/lib/reports/methodology";
import { makeRecord } from "./helpers";

const REQUIRED_DISCLAIMER =
  "This report is an image-based preliminary assessment. Colour proportions represent estimated visible image area, not mass fractions or certified material purity. Visual screening cannot reliably establish chemical composition or guarantee industrial suitability. Verify results using appropriate physical sampling and material-testing methods.";

function loaded(scene = "synthetic-with-foreign-objects") {
  return {
    record: makeRecord("S-1", scene, "2026-03-04T05:06:07Z", "Bay 3 / pile A"),
    thumbnailUrl: "data:thumb",
    overlayUrl: "data:overlay",
  };
}

describe("report generation", () => {
  it("includes the exact disclaimer", () => {
    expect(DISCLAIMER).toBe(REQUIRED_DISCLAIMER);
    expect(buildReport(loaded()).disclaimer).toBe(REQUIRED_DISCLAIMER);
  });

  it("copies actual computed values and sums rounded rows to 100", () => {
    const l = loaded();
    const r = buildReport(l, { now: new Date("2026-03-05T00:00:00Z") });
    expect(r.sample.id).toBe("S-1");
    expect(r.sample.analysedAt).toBe("2026-03-04T05:06:07Z");
    expect(r.generatedAt).toBe("2026-03-05T00:00:00.000Z");
    expect(r.algorithm.version).toBe(l.record.result.algorithm.version);
    const total = r.colourDistribution.rows.reduce((s, x) => s + x.percent, 0);
    expect(Math.round(total * 10)).toBe(1000);
    const green = r.colourDistribution.rows.find((x) => x.cls === "green")!;
    expect(green.percent).toBeCloseTo(l.record.result.colour.percentages.green, 0);
    expect(green.pixels).toBe(l.record.result.colour.pixelCounts.green);
    expect(r.colourDistribution.basis).toMatch(/not mass/i);
  });

  it("lists anomalies with locations and verification steps", () => {
    const l = loaded();
    const r = buildReport(l);
    expect(r.anomalies.length).toBe(l.record.result.anomalies.length);
    expect(r.anomalies.length).toBeGreaterThan(0);
    for (const a of r.anomalies) {
      expect(a.location).toMatch(/upper|middle|lower|centre/);
      expect(a.verification.length).toBeGreaterThan(0);
    }
    expect(r.recommendedChecks.length).toBeGreaterThan(0);
  });

  it("includes methodology, limitations and reliability indicators", () => {
    const r = buildReport(loaded());
    expect(r.methodology.length).toBeGreaterThanOrEqual(8);
    expect(r.limitations.some((x) => /mass/i.test(x))).toBe(true);
    expect(r.reliability.indicators.length).toBeGreaterThan(5);
  });

  it("embeds images only when requested and serialises to valid JSON", () => {
    expect(buildReport(loaded()).images).toBeUndefined();
    const r = buildReport(loaded(), { includeImages: true });
    expect(r.images).toEqual({ thumbnail: "data:thumb", overlay: "data:overlay" });
    const parsed = JSON.parse(reportToJson(r));
    expect(parsed.schema).toBe("culletiq.report/1");
    expect(parsed.disclaimer).toBe(REQUIRED_DISCLAIMER);
  });

  it("makes safe file names", () => {
    expect(reportFileName(buildReport(loaded()), "json")).toBe("culletiq-S-1-Bay-3-pile-A.json");
  });

  it("describes locations in words", () => {
    expect(describeLocation(0.1, 0.1)).toBe("upper left");
    expect(describeLocation(0.5, 0.5)).toBe("centre");
    expect(describeLocation(0.9, 0.9)).toBe("lower right");
  });
});
