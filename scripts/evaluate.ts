/**
 * Evaluate the pipeline against a manifest with ground truth.
 *
 *   npm run evaluate                               # synthetic demo set
 *   npm run evaluate -- --manifest data/my.json    # your own held-out photos
 *
 * Ground truth for the three main classes (clear/green/brown, summing to 100)
 * is compared with the estimate renormalised over the same three classes.
 * Results are written to evaluation-results.json. On the synthetic demo set the
 * numbers only describe behaviour on drawings — they are not an accuracy claim.
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import jpeg from "jpeg-js";
import { PNG } from "pngjs";
import type { RgbaImage } from "../types/analysis";
import type { DemoManifest } from "../lib/demo/manifest";
import { runPipeline } from "../lib/analysis/pipeline";
import { itemError, summariseErrors, MAIN_CLASSES, type ItemError } from "../lib/analysis/evaluation";

function decode(file: string): RgbaImage {
  const buf = readFileSync(file);
  if (buf[0] === 0x89 && buf[1] === 0x50) {
    const png = PNG.sync.read(buf);
    return { width: png.width, height: png.height, data: new Uint8ClampedArray(png.data) };
  }
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    const img = jpeg.decode(buf, { useTArray: true, formatAsRGBA: true, maxMemoryUsageInMB: 1024 });
    return { width: img.width, height: img.height, data: new Uint8ClampedArray(img.data) };
  }
  throw new Error(`Unsupported image format (PNG/JPEG only in this script): ${file}`);
}

const args = process.argv.slice(2);
const mIdx = args.indexOf("--manifest");
const manifestPath = path.resolve(mIdx >= 0 ? args[mIdx + 1] : path.join(__dirname, "..", "public", "demo", "manifest.json"));
const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as DemoManifest;
const baseDir = path.dirname(manifestPath);

const rows: (ItemError & { title: string; kind: string; tier: string; status: string; anomalies: number })[] = [];
for (const item of manifest.items) {
  if (!item.groundTruth) {
    console.log(`skip ${item.id}: no ground truth`);
    continue;
  }
  const out = runPipeline(decode(path.join(baseDir, item.file)));
  const r = out.result;
  const usable = r.colour.valid && r.reliability.tier !== "unsuitable";
  rows.push({
    ...itemError(item.id, r.colour, item.groundTruth.percent, usable),
    title: item.title,
    kind: item.groundTruth.kind,
    tier: r.reliability.tier,
    status: r.assessment.status,
    anomalies: r.anomalies.length,
  });
}

const f = (v: number | undefined | null) => (v === undefined || v === null ? "  —  " : v.toFixed(1).padStart(5));
console.log(`\nManifest: ${manifestPath}`);
console.log(manifest.description);
console.log("\nid".padEnd(36) + "tier        GT clr/grn/brn        EST clr/grn/brn       uncertain");
for (const r of rows) {
  console.log(
    r.id.padEnd(35) +
      r.tier.padEnd(12) +
      MAIN_CLASSES.map((c) => f(r.truth[c])).join(" ") +
      "   " +
      MAIN_CLASSES.map((c) => f(r.estimate?.[c])).join(" ") +
      "   " +
      f(r.uncertainPercent),
  );
}
const summary = summariseErrors(rows);
console.log(`\nItems: ${summary.n}, without usable estimate: ${summary.failed}`);
if (summary.mae && summary.bias) {
  console.log(`MAE (pp)  clear ${f(summary.mae.clear)}  green ${f(summary.mae.green)}  brown ${f(summary.mae.brown)}`);
  console.log(`Bias (pp) clear ${f(summary.bias.clear)}  green ${f(summary.bias.green)}  brown ${f(summary.bias.brown)}`);
  console.log(`Max |error| ${f(summary.maxAbsError)} pp`);
}
const kinds = new Set(rows.map((r) => r.kind));
if (kinds.has("synthetic-drawn-area")) {
  console.log("\nNOTE: synthetic ground truth — these errors describe behaviour on procedurally drawn images only.");
}
if (kinds.has("physical-mass")) {
  console.log("\nNOTE: ground truth is mass; estimates are image area. Errors combine algorithm error and the area-vs-mass gap.");
}

const outFile = path.resolve("evaluation-results.json");
writeFileSync(outFile, JSON.stringify({ manifest: manifestPath, evaluatedAt: new Date().toISOString(), summary, rows }, null, 2));
console.log(`\nWrote ${outFile}`);
