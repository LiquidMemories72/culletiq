/** Sample comparison and dashboard aggregates — pure functions over saved records. */
import { COLOUR_CLASSES, type ColourClass, type RuleFinding } from "@/types/analysis";
import type { SampleRecord } from "@/types/sample";

export interface SampleComparison {
  a: { id: string; name: string };
  b: { id: string; name: string };
  /** Percentage-point difference (b − a) of material-area share per class. */
  deltas: Record<ColourClass, number>;
  /** Largest absolute difference among clear/green/brown. */
  largestShift: { cls: ColourClass; delta: number } | null;
  anomalyCounts: [number, number];
  tiers: [string, string];
  /** Reasons the two estimates may not be directly comparable. */
  caveats: string[];
  comparable: boolean;
}

export function compareSamples(a: SampleRecord, b: SampleRecord): SampleComparison {
  const ra = a.result;
  const rb = b.result;
  const deltas = Object.fromEntries(
    COLOUR_CLASSES.map((c) => [c, rb.colour.percentages[c] - ra.colour.percentages[c]]),
  ) as Record<ColourClass, number>;

  const caveats: string[] = [];
  let comparable = true;
  if (!ra.colour.valid || !rb.colour.valid || ra.reliability.tier === "unsuitable" || rb.reliability.tier === "unsuitable") {
    caveats.push("At least one sample is unsuitable for colour estimation; differences are not meaningful.");
    comparable = false;
  }
  if (ra.algorithm.version !== rb.algorithm.version) {
    caveats.push(`Different algorithm versions (${ra.algorithm.version} vs ${rb.algorithm.version}).`);
  }
  if (JSON.stringify(ra.config.thresholds) !== JSON.stringify(rb.config.thresholds)) {
    caveats.push("Different colour thresholds were used; proportions are not on the same scale.");
  }
  if (ra.background.mode !== rb.background.mode || ra.background.detected !== rb.background.detected) {
    caveats.push("Background handling differs (one image had a separable background, the other did not).");
  }
  if (Math.abs(ra.quality.meanLightness - rb.quality.meanLightness) > 15) {
    caveats.push(
      `Overall exposure differs markedly (mean L* ${ra.quality.meanLightness.toFixed(0)} vs ${rb.quality.meanLightness.toFixed(0)}); lighting changes apparent colour.`,
    );
  }
  const maxUncertain = Math.max(ra.colour.percentages.uncertain, rb.colour.percentages.uncertain);
  if (maxUncertain >= 15) {
    caveats.push(`Up to ${maxUncertain.toFixed(1)}% of material area is uncertain; differences smaller than that may not be real.`);
  }
  caveats.push("Both values are visible image-area shares, not mass fractions; the photos may not represent their batches.");

  let largestShift: SampleComparison["largestShift"] = null;
  for (const c of ["clear", "green", "brown"] as const) {
    if (!largestShift || Math.abs(deltas[c]) > Math.abs(largestShift.delta)) largestShift = { cls: c, delta: deltas[c] };
  }

  return {
    a: { id: a.id, name: a.name },
    b: { id: b.id, name: b.name },
    deltas,
    largestShift,
    anomalyCounts: [ra.anomalies.length, rb.anomalies.length],
    tiers: [ra.reliability.tier, rb.reliability.tier],
    caveats,
    comparable,
  };
}

export interface DashboardStats {
  total: number;
  /** Samples whose colour estimate is valid and not unsuitable — the averaging set. */
  usableCount: number;
  averages: Record<ColourClass, number> | null;
  statusCounts: Record<"assessable" | "inspect" | "unsuitable", number>;
  totalAnomalies: number;
  recentFlags: { sampleId: string; sampleName: string; createdAt: string; finding: RuleFinding }[];
}

/** Unweighted mean across usable samples (each photo counts once regardless of size). */
export function computeDashboardStats(records: SampleRecord[], maxFlags = 6): DashboardStats {
  const usable = records.filter((r) => r.result.colour.valid && r.result.reliability.tier !== "unsuitable");
  const averages = usable.length
    ? (Object.fromEntries(
        COLOUR_CLASSES.map((c) => [c, usable.reduce((s, r) => s + r.result.colour.percentages[c], 0) / usable.length]),
      ) as Record<ColourClass, number>)
    : null;
  const statusCounts = { assessable: 0, inspect: 0, unsuitable: 0 };
  for (const r of records) statusCounts[r.result.assessment.status]++;
  const sorted = [...records].sort((x, y) => y.createdAt.localeCompare(x.createdAt));
  const recentFlags: DashboardStats["recentFlags"] = [];
  for (const r of sorted) {
    for (const f of r.result.assessment.findings) {
      if (f.severity === "info") continue;
      recentFlags.push({ sampleId: r.id, sampleName: r.name, createdAt: r.createdAt, finding: f });
      if (recentFlags.length >= maxFlags) break;
    }
    if (recentFlags.length >= maxFlags) break;
  }
  return {
    total: records.length,
    usableCount: usable.length,
    averages,
    statusCounts,
    totalAnomalies: records.reduce((s, r) => s + r.result.anomalies.length, 0),
    recentFlags,
  };
}
