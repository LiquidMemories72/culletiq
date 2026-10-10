/** Report model and JSON serialisation. Every value is copied from the saved analysis — nothing is recomputed or invented. */
import { COLOUR_CLASSES, type ColourClass, type FindingSeverity, type ReliabilityTier } from "@/types/analysis";
import type { LoadedSample } from "@/types/sample";
import { CLASS_STYLE } from "@/lib/classes";
import { roundPercentages } from "@/lib/vision/classify";
import { DISCLAIMER, METHOD_STEPS, PHYSICAL_VALIDATION, WHAT_IT_CANNOT_MEASURE } from "./methodology";

export const REPORT_SCHEMA_VERSION = "culletiq.report/1";

export interface SampleReport {
  schema: string;
  generatedAt: string;
  sample: {
    id: string;
    name: string;
    analysedAt: string;
    source: LoadedSample["record"]["source"];
    notes?: string;
  };
  algorithm: { name: string; version: string };
  assessment: {
    status: string;
    headline: string;
    findings: { title: string; severity: FindingSeverity; rationale: string; nextStep: string }[];
  };
  colourDistribution: {
    basis: string;
    valid: boolean;
    rows: { cls: ColourClass; label: string; percent: number; pixels: number }[];
    materialPixels: number;
    totalPixels: number;
    excluded: { backgroundPercentOfImage: number; glarePercentOfImage: number };
  };
  background: { detected: boolean; reason: string };
  segmentation: { mode: string; fragmentCount: number; regionCount: number; note: string };
  anomalies: {
    id: number;
    label: string;
    location: string;
    box: { x: number; y: number; w: number; h: number };
    areaPercentOfImage: number;
    rule: string;
    possibleExplanations: string;
    verification: string;
  }[];
  screeningNote: string;
  reliability: {
    tier: ReliabilityTier;
    summary: string;
    indicators: { label: string; value: string; status: string; explanation: string }[];
  };
  methodology: { title: string; algorithm: string; limitations: string }[];
  limitations: string[];
  recommendedChecks: string[];
  config: LoadedSample["record"]["result"]["config"];
  images?: { thumbnail: string | null; overlay: string | null };
  disclaimer: string;
}

/** Describe a normalised position in words (e.g. "upper left"). */
export function describeLocation(cx: number, cy: number): string {
  const v = cy < 1 / 3 ? "upper" : cy < 2 / 3 ? "middle" : "lower";
  const h = cx < 1 / 3 ? "left" : cx < 2 / 3 ? "centre" : "right";
  if (v === "middle" && h === "centre") return "centre";
  return `${v} ${h}`;
}

export function buildReport(sample: LoadedSample, opts: { includeImages?: boolean; now?: Date } = {}): SampleReport {
  const { record } = sample;
  const r = record.result;
  const rounded = roundPercentages(r.colour.percentages, 1);
  const checks = new Set<string>();
  for (const f of r.assessment.findings) checks.add(f.nextStep);
  for (const a of r.anomalies) checks.add(a.verification);
  checks.add("Confirm colour composition by hand-sorting and weighing a representative physical sample.");

  return {
    schema: REPORT_SCHEMA_VERSION,
    generatedAt: (opts.now ?? new Date()).toISOString(),
    sample: {
      id: record.id,
      name: record.name,
      analysedAt: record.createdAt,
      source: record.source,
      notes: record.notes,
    },
    algorithm: r.algorithm,
    assessment: {
      status: r.assessment.status,
      headline: r.assessment.headline,
      findings: r.assessment.findings.map((f) => ({
        title: f.title,
        severity: f.severity,
        rationale: f.rationale,
        nextStep: f.nextStep,
      })),
    },
    colourDistribution: {
      basis: "Percentage of visible, categorised material pixels (image area). Not mass, not purity.",
      valid: r.colour.valid,
      rows: COLOUR_CLASSES.map((c) => ({
        cls: c,
        label: CLASS_STYLE[c].label,
        percent: rounded[c],
        pixels: r.colour.pixelCounts[c],
      })),
      materialPixels: r.colour.materialPixels,
      totalPixels: r.colour.totalPixels,
      excluded: {
        backgroundPercentOfImage: round1(r.colour.excludedPercentOfImage.background),
        glarePercentOfImage: round1(r.colour.excludedPercentOfImage.glare),
      },
    },
    background: { detected: r.background.detected, reason: r.background.reason },
    segmentation: {
      mode: r.segmentation.mode,
      fragmentCount: r.segmentation.fragmentCount,
      regionCount: r.segmentation.regionCount,
      note: r.segmentation.note,
    },
    anomalies: r.anomalies.map((a) => ({
      id: a.id,
      label: a.label,
      location: describeLocation(a.centroid.x, a.centroid.y),
      box: a.box,
      areaPercentOfImage: round1(a.areaPercent, 2),
      rule: a.rule,
      possibleExplanations: a.possibleExplanations,
      verification: a.verification,
    })),
    screeningNote: r.screening.note,
    reliability: {
      tier: r.reliability.tier,
      summary: r.reliability.summary,
      indicators: r.reliability.indicators.map((i) => ({
        label: i.label,
        value: i.displayValue,
        status: i.status,
        explanation: i.explanation,
      })),
    },
    methodology: METHOD_STEPS.map((s) => ({ title: s.title, algorithm: s.algorithm(r.config), limitations: s.limitations })),
    limitations: WHAT_IT_CANNOT_MEASURE,
    recommendedChecks: [...checks, ...PHYSICAL_VALIDATION.slice(0, 2)],
    config: r.config,
    images: opts.includeImages ? { thumbnail: sample.thumbnailUrl, overlay: sample.overlayUrl } : undefined,
    disclaimer: DISCLAIMER,
  };
}

export function reportToJson(report: SampleReport): string {
  return JSON.stringify(report, null, 2);
}

export function reportFileName(report: SampleReport, ext: string): string {
  const safe = report.sample.name.replace(/[^a-z0-9-_]+/gi, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "sample";
  return `culletiq-${report.sample.id}-${safe}.${ext}`;
}

function round1(v: number, d = 1) {
  const s = 10 ** d;
  return Math.round(v * s) / s;
}
