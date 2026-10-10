/**
 * Stage 6: configurable prototype inspection rules.
 *
 * These rules are PROTOTYPE inspection prompts for a human operator. They are
 * not industrial acceptance criteria, regulatory limits or furnace-suitability
 * decisions, and their thresholds are not taken from any standard.
 */
import type {
  AnalysisResult,
  AssessmentStatus,
  FindingSeverity,
  QualityAssessment,
  RuleFinding,
} from "@/types/analysis";
import { CLASS_STYLE } from "@/lib/classes";
import { TIER_LABEL } from "@/lib/vision/reliability";

export type RuleInput = Omit<AnalysisResult, "assessment">;

export interface RuleThresholds {
  /** A single colour class at or above this % of material area is reported as visually dominant. */
  dominantMinPercent: number;
  /** If no class reaches this %, the sample is reported as visually mixed. */
  mixedMaxPercent: number;
  /** Uncertain share (% of material) that triggers manual inspection. */
  uncertainActionPercent: number;
  /** Other-colour share (% of material) worth highlighting. */
  otherColourCautionPercent: number;
  /** Glare (% of image) worth highlighting. */
  glareCautionPercent: number;
}

export const DEFAULT_RULE_THRESHOLDS: RuleThresholds = {
  dominantMinPercent: 70,
  mixedMaxPercent: 50,
  uncertainActionPercent: 25,
  otherColourCautionPercent: 5,
  glareCautionPercent: 15,
};

export interface InspectionRule {
  id: string;
  description: string;
  evaluate: (r: RuleInput, t: RuleThresholds) => RuleFinding | null;
}

const fmt = (v: number) => `${v.toFixed(1)}%`;

export const DEFAULT_RULES: InspectionRule[] = [
  {
    id: "image-unsuitable",
    description: "Block assessment when a critical image-condition indicator is poor or too little material is visible.",
    evaluate: (r) => {
      const critical = r.reliability.indicators.filter((i) => i.critical && i.status === "poor");
      if (critical.length === 0 && r.colour.valid) return null;
      return {
        ruleId: "image-unsuitable",
        title: "Image unsuitable for assessment",
        severity: "blocking",
        rationale:
          critical.length > 0
            ? `Critical indicators failed: ${critical.map((i) => `${i.label} (${i.displayValue})`).join("; ")}.`
            : "Too few material pixels remain after removing background and glare.",
        nextStep: "Retake the photo: even diffuse lighting, material filling most of the frame, in focus, at least 1000 px on the shorter side.",
        evidence: Object.fromEntries(critical.map((i) => [i.id, i.displayValue])),
      };
    },
  },
  {
    id: "uncertain-high",
    description: "Request manual inspection when a large share of material could not be categorised.",
    evaluate: (r, t) => {
      const u = r.colour.percentages.uncertain;
      if (!r.colour.valid || u < t.uncertainActionPercent) return null;
      return {
        ruleId: "uncertain-high",
        title: "Large uncertain region",
        severity: "action",
        rationale: `${fmt(u)} of material area could not be assigned to a colour class (threshold ${t.uncertainActionPercent}%). Class proportions could each be off by up to this amount.`,
        nextStep: "Review the hatched areas in the overlay; inspect those fragments manually or retake the photo under more even, brighter light.",
        evidence: { uncertainPercent: Number(u.toFixed(1)) },
      };
    },
  },
  {
    id: "anomalies-present",
    description: "Require physical verification of every possible visual anomaly.",
    evaluate: (r) => {
      if (r.anomalies.length === 0) return null;
      const byCat = new Map<string, number>();
      for (const a of r.anomalies) byCat.set(a.label, (byCat.get(a.label) ?? 0) + 1);
      const parts = [...byCat.entries()].map(([k, v]) => `${v} × ${k.toLowerCase()}`);
      return {
        ruleId: "anomalies-present",
        title: `${r.anomalies.length} possible visual anomal${r.anomalies.length === 1 ? "y" : "ies"}`,
        severity: "action",
        rationale: `Heuristic screening flagged: ${parts.join(", ")}. These are colour/texture observations, not confirmed contaminants.`,
        nextStep: "Locate each flagged region in the physical sample and verify the material by hand or with appropriate sorting/test equipment.",
        evidence: { count: r.anomalies.length },
      };
    },
  },
  {
    id: "background-similar-to-clear",
    description: "Warn when a neutral background makes clear glass hard to separate.",
    evaluate: (r) => {
      if (!r.background.detected || !r.background.similarToClearGlass) return null;
      return {
        ruleId: "background-similar-to-clear",
        title: "Clear-glass estimate is unreliable on this background",
        severity: "caution",
        rationale:
          "The detected background is neutral-coloured. Clear glass transmits the background, so clear fragments may be partly removed with the background or confused with it. The clear proportion may be under- or over-estimated.",
        nextStep: "Photograph on a strongly coloured, non-glass-like background (e.g. matte blue) with backlighting, or count clear fragments manually.",
        evidence: {},
      };
    },
  },
  {
    id: "no-background",
    description: "Note when no background could be separated in automatic mode.",
    evaluate: (r) => {
      if (r.background.mode !== "auto" || r.background.detected) return null;
      return {
        ruleId: "no-background",
        title: "No background separated",
        severity: "caution",
        rationale: `${r.background.reason} Any visible conveyor, tray or floor is counted as material.`,
        nextStep: "If the surface is visible, crop the photo to the material or retake it on a plain, uniform surface.",
        evidence: {},
      };
    },
  },
  {
    id: "glare-high",
    description: "Highlight a large glare share.",
    evaluate: (r, t) => {
      const g = r.colour.excludedPercentOfImage.glare;
      if (g < t.glareCautionPercent) return null;
      return {
        ruleId: "glare-high",
        title: "Substantial glare excluded",
        severity: "caution",
        rationale: `${fmt(g)} of the image is specular glare and was excluded. Fragments under glare are not represented.`,
        nextStep: "Use diffuse lighting or a polarising filter and retake the photo.",
        evidence: { glarePercent: Number(g.toFixed(1)) },
      };
    },
  },
  {
    id: "other-colour",
    description: "Highlight colours outside the clear/green/brown classes.",
    evaluate: (r, t) => {
      const o = r.colour.percentages.otherColour;
      if (!r.colour.valid || o < t.otherColourCautionPercent) return null;
      return {
        ruleId: "other-colour",
        title: "Colours outside the three main classes",
        severity: "caution",
        rationale: `${fmt(o)} of material area has a hue outside the green and brown ranges (e.g. blue, red, violet). This may be coloured glass, plastic, labels or caps.`,
        nextStep: "Check the purple-shaded regions in the overlay against the physical sample.",
        evidence: { otherColourPercent: Number(o.toFixed(1)) },
      };
    },
  },
  {
    id: "low-reliability",
    description: "Flag a low reliability tier.",
    evaluate: (r) => {
      if (r.reliability.tier !== "low") return null;
      return {
        ruleId: "low-reliability",
        title: "Low reliability image conditions",
        severity: "caution",
        rationale: r.reliability.summary,
        nextStep: "Treat proportions as indicative only; retake the photo if possible.",
        evidence: { tier: TIER_LABEL[r.reliability.tier] },
      };
    },
  },
  {
    id: "colour-profile",
    description: "Describe the visible colour profile when the distribution is usable.",
    evaluate: (r, t) => {
      if (!r.colour.valid || r.reliability.tier === "unsuitable") return null;
      const p = r.colour.percentages;
      const main = (["clear", "green", "brown"] as const)
        .map((c) => ({ c, v: p[c] }))
        .sort((a, b) => b.v - a.v);
      const top = main[0];
      let title: string;
      let rationale: string;
      if (top.v >= t.dominantMinPercent) {
        title = `Visible area dominated by ${CLASS_STYLE[top.c].label.toLowerCase()}`;
        rationale = `${CLASS_STYLE[top.c].label} accounts for ${fmt(top.v)} of categorised visible material area (prototype threshold ${t.dominantMinPercent}%).`;
      } else if (top.v < t.mixedMaxPercent) {
        title = "Visibly mixed colours";
        rationale = `No colour class reaches ${t.mixedMaxPercent}% of visible material area (largest: ${CLASS_STYLE[top.c].label.toLowerCase()} at ${fmt(top.v)}).`;
      } else {
        title = `Mostly ${CLASS_STYLE[top.c].label.toLowerCase()}, with other colours present`;
        rationale = `${CLASS_STYLE[top.c].label} is the largest class at ${fmt(top.v)} of visible material area.`;
      }
      return {
        ruleId: "colour-profile",
        title,
        severity: "info",
        rationale: `${rationale} This is image area, not mass.`,
        nextStep: "If a mass-based composition is needed, take a representative physical sample, hand-sort by colour and weigh each fraction.",
        evidence: { clear: Number(p.clear.toFixed(1)), green: Number(p.green.toFixed(1)), brown: Number(p.brown.toFixed(1)) },
      };
    },
  },
  {
    id: "fragments-merged",
    description: "Note when fragment segmentation merged touching pieces.",
    evaluate: (r) => {
      const s = r.segmentation;
      if (s.mode !== "fragments" || s.largestComponentShare < 0.6) return null;
      return {
        ruleId: "fragments-merged",
        title: "Touching fragments merged in segmentation",
        severity: "info",
        rationale: `The largest connected region contains ${(s.largestComponentShare * 100).toFixed(0)}% of the foreground; the fragment count (${s.fragmentCount}) is an undercount.`,
        nextStep: "Spread fragments so they do not touch if per-fragment counts are needed.",
        evidence: { largestComponentShare: Number(s.largestComponentShare.toFixed(2)) },
      };
    },
  },
];

const SEVERITY_RANK: Record<FindingSeverity, number> = { info: 0, caution: 1, action: 2, blocking: 3 };

export function runRules(
  input: RuleInput,
  rules: InspectionRule[] = DEFAULT_RULES,
  thresholds: RuleThresholds = DEFAULT_RULE_THRESHOLDS,
): QualityAssessment {
  const findings: RuleFinding[] = [];
  for (const rule of rules) {
    const f = rule.evaluate(input, thresholds);
    if (f) findings.push(f);
  }
  findings.sort((a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity]);
  const worst = findings.reduce((m, f) => Math.max(m, SEVERITY_RANK[f.severity]), 0);
  const status: AssessmentStatus = worst >= 3 ? "unsuitable" : worst === 2 ? "inspect" : "assessable";
  const headline =
    status === "unsuitable"
      ? "Image unsuitable — retake before drawing any conclusion"
      : status === "inspect"
        ? "Manual inspection recommended"
        : findings.some((f) => f.severity === "caution")
          ? "Colour distribution distinguishable, with caveats"
          : "Colour distribution distinguishable";
  return { status, headline, findings };
}

export const STATUS_LABEL: Record<AssessmentStatus, string> = {
  assessable: "Assessable",
  inspect: "Inspect",
  unsuitable: "Unsuitable",
};
