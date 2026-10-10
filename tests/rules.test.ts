import { describe, expect, it } from "vitest";
import { DEFAULT_RULE_THRESHOLDS, DEFAULT_RULES, runRules, type RuleInput } from "@/lib/analysis/rules";
import { resultFor } from "./helpers";

function input(mutate: (r: RuleInput) => void = () => undefined): RuleInput {
  const { assessment: _a, ...rest } = resultFor("synthetic-mixed-dark");
  void _a;
  mutate(rest);
  return rest;
}

describe("rule engine", () => {
  it("reports the colour profile for a usable image", () => {
    const a = runRules(input());
    expect(a.findings.some((f) => f.ruleId === "colour-profile")).toBe(true);
    expect(a.status).not.toBe("unsuitable");
  });

  it("blocks when a critical indicator is poor", () => {
    const a = runRules(
      input((r) => {
        r.reliability.indicators[0] = { ...r.reliability.indicators[0], status: "poor", critical: true };
        r.reliability.tier = "unsuitable";
      }),
    );
    expect(a.status).toBe("unsuitable");
    expect(a.findings[0].severity).toBe("blocking");
    expect(a.findings.some((f) => f.ruleId === "colour-profile")).toBe(false);
  });

  it("requests inspection when uncertain area is large", () => {
    const a = runRules(input((r) => (r.colour.percentages.uncertain = DEFAULT_RULE_THRESHOLDS.uncertainActionPercent + 1)));
    expect(a.status).toBe("inspect");
    expect(a.findings.find((f) => f.ruleId === "uncertain-high")?.severity).toBe("action");
  });

  it("requires physical verification for anomalies", () => {
    const anomalous = resultFor("synthetic-with-foreign-objects");
    const { assessment: _a, ...rest } = anomalous;
    void _a;
    const a = runRules(rest);
    const f = a.findings.find((x) => x.ruleId === "anomalies-present");
    expect(f).toBeDefined();
    expect(f!.rationale).toMatch(/not confirmed contaminants/);
    expect(a.status).toBe("inspect");
  });

  it("describes dominance with prototype thresholds and never claims mass", () => {
    const a = runRules(
      input((r) => {
        r.colour.percentages = { clear: 5, green: 85, brown: 5, otherColour: 0, uncertain: 5 };
      }),
    );
    const f = a.findings.find((x) => x.ruleId === "colour-profile")!;
    expect(f.title).toMatch(/dominated by green/);
    expect(f.rationale).toMatch(/not mass/);
  });

  it("supports custom rule lists and thresholds", () => {
    const a = runRules(input(), [DEFAULT_RULES.find((r) => r.id === "colour-profile")!], {
      ...DEFAULT_RULE_THRESHOLDS,
      mixedMaxPercent: 99,
      dominantMinPercent: 100,
    });
    expect(a.findings).toHaveLength(1);
    expect(a.findings[0].title).toBe("Visibly mixed colours");
    expect(a.status).toBe("assessable");
  });

  it("sorts findings by severity", () => {
    const a = runRules(input((r) => (r.colour.percentages.uncertain = 40)));
    const rank = { blocking: 3, action: 2, caution: 1, info: 0 } as const;
    for (let i = 1; i < a.findings.length; i++) {
      expect(rank[a.findings[i - 1].severity]).toBeGreaterThanOrEqual(rank[a.findings[i].severity]);
    }
  });
});
