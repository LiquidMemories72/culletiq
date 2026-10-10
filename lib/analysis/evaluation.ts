/** Validation metrics comparing estimates with ground truth. Pure functions. */
import type { ColourDistribution } from "@/types/analysis";

export type MainClass = "clear" | "green" | "brown";
export const MAIN_CLASSES: MainClass[] = ["clear", "green", "brown"];

/**
 * Renormalise clear/green/brown to sum to 100, dropping other/uncertain.
 * This is what ground truth for the three main classes can be compared against.
 * Returns null if none of the three classes was observed.
 */
export function mainClassShares(colour: ColourDistribution): Record<MainClass, number> | null {
  const total = MAIN_CLASSES.reduce((s, c) => s + colour.percentages[c], 0);
  if (total <= 0) return null;
  return {
    clear: (colour.percentages.clear / total) * 100,
    green: (colour.percentages.green / total) * 100,
    brown: (colour.percentages.brown / total) * 100,
  };
}

export interface ItemError {
  id: string;
  estimate: Record<MainClass, number> | null;
  truth: Record<MainClass, number>;
  /** Signed error estimate − truth (percentage points). */
  error: Record<MainClass, number> | null;
  uncertainPercent: number;
}

export interface EvaluationSummary {
  n: number;
  /** Items without a usable estimate (excluded from MAE). */
  failed: number;
  mae: Record<MainClass, number> | null;
  /** Mean signed error (bias), percentage points. */
  bias: Record<MainClass, number> | null;
  maxAbsError: number | null;
}

export function itemError(
  id: string,
  colour: ColourDistribution,
  truth: Record<MainClass, number>,
  usable: boolean,
): ItemError {
  const estimate = usable ? mainClassShares(colour) : null;
  return {
    id,
    estimate,
    truth,
    error: estimate
      ? { clear: estimate.clear - truth.clear, green: estimate.green - truth.green, brown: estimate.brown - truth.brown }
      : null,
    uncertainPercent: colour.percentages.uncertain,
  };
}

export function summariseErrors(items: ItemError[]): EvaluationSummary {
  const ok = items.filter((i) => i.error);
  if (ok.length === 0) return { n: items.length, failed: items.length, mae: null, bias: null, maxAbsError: null };
  const mae = {} as Record<MainClass, number>;
  const bias = {} as Record<MainClass, number>;
  let maxAbs = 0;
  for (const c of MAIN_CLASSES) {
    const errs = ok.map((i) => i.error![c]);
    mae[c] = errs.reduce((s, e) => s + Math.abs(e), 0) / errs.length;
    bias[c] = errs.reduce((s, e) => s + e, 0) / errs.length;
    maxAbs = Math.max(maxAbs, ...errs.map(Math.abs));
  }
  return { n: items.length, failed: items.length - ok.length, mae, bias, maxAbsError: maxAbs };
}
