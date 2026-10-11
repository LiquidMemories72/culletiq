# CulletIQ — glass recycling intelligence (prototype)

CulletIQ estimates the **visible colour make-up** of a photo of crushed glass (cullet), flags **possible visual anomalies**, rates the **photo's suitability**, and produces an explainable, printable report.

> **Decision-support prototype — not certified quality control.**
> This report is an image-based preliminary assessment. Colour proportions represent estimated visible image area, not mass fractions or certified material purity. Visual screening cannot reliably establish chemical composition or guarantee industrial suitability. Verify results using appropriate physical sampling and material-testing methods.

Everything runs locally in the browser. No accounts, API keys, paid services, cloud resources or language models are used, and the app works offline once dependencies are installed.

## Quick start

Requirements: Node.js 22.12+ or 24 (tested with Node 24.13, npm 11).

```bash
npm install
npm run dev          # http://localhost:3000
```

Production build:

```bash
npm run build
npm start            # http://localhost:3000
```

Other commands:

| Command | What it does |
| --- | --- |
| `npm test` | Vitest unit and pipeline tests (76 tests) |
| `npm run typecheck` | TypeScript check |
| `npm run demo:generate` | Regenerate the synthetic demo images and `public/demo/manifest.json` |
| `npm run evaluate` | Run the pipeline on a manifest with ground truth and report error (default: the synthetic demo set) |

## What it does

| View | Purpose |
| --- | --- |
| **Dashboard** (`/`) | Sample count, average estimated colour shares, recent analyses and recent inspection flags — all derived from samples saved in this browser. Shows an empty state on a fresh install. |
| **Analyse** (`/analyse`) | Drag-and-drop or pick a JPEG/PNG/WebP (≤ 15 MB), preview, replace, adjust settings, analyse, save. Includes labelled demonstration images. |
| **Results** | Colour distribution, classification overlay, fragments/regions, possible anomalies with locations, reliability indicators, prototype inspection findings, and a "How was this calculated?" panel on every section. |
| **History** (`/samples`) | Open, delete, export (JSON), select two to compare. |
| **Report** (`/samples/[id]/report`) | Printable report; **Print / Save as PDF** uses the browser's print dialog. JSON export includes images as data URLs. |
| **Compare** (`/compare`) | Side-by-side shares, B − A differences in percentage points, and comparability caveats. |
| **Methodology** (`/methodology`) | Algorithm, limitations, what cannot be measured, required physical validation, data sources, deployment path. |

## How the analysis works

The pipeline is deterministic TypeScript (`lib/vision`, `lib/analysis`) running in a Web Worker. OpenCV was not used — the equivalent classic algorithms (area resampling, CIELAB conversion, Sobel, Laplacian, flood fill, morphology, connected components, SLIC) are implemented directly so the app needs no native or Python dependencies.

1. **Preprocess** — decode with EXIF orientation, cap at 2048 px, area-average downsample to ≤ 720 px, convert to CIELAB (D65).
2. **Image quality** — exposure (mean L\*), clipped/crushed pixels, Laplacian-variance focus, lighting variation.
3. **Background** — model a uniform border colour, flood-fill inward through similar, low-gradient pixels; reject if the border is inconsistent/textured or the candidate covers > 90 % of the frame. Neutral backgrounds are flagged because clear glass transmits them.
4. **White balance** — if the background is near-neutral, use it as a white reference (von Kries gains, capped, recorded in the result; switchable).
5. **Colour categorisation** — per pixel by L\*, chroma C\*, hue h: glare (excluded), clear, green, brown/amber, other colour, uncertain (too dark, weak tint, dark-neutral, or near a hue boundary). A relative-chroma rule (C\*/L\*) lets dark glass qualify. Proportions = class pixels ÷ material pixels, so the five classes sum to 100 %.
6. **Regions / fragments** — SLIC superpixels; when a background was separated, morphology + 8-connected components give approximate fragments (touching pieces merge — reported).
7. **Screening** — four transparent heuristics (unusual colour, uniform light low-texture, high-contrast neutral, dark featureless). Output is "possible visual anomaly" with location, measured features, the rule that fired and a verification step. Very large matching areas are treated as a probable surface.
8. **Reliability** — 11–12 indicators graded good / caution / poor → tier (Higher / Moderate / Low / Unsuitable). Not a probability.
9. **Rules** — configurable prototype inspection rules (`lib/analysis/rules.ts`) → Assessable / Inspect / Unsuitable, each finding with rationale and next step.

All thresholds live in `lib/vision/config.ts` and `lib/analysis/rules.ts`. They are uncalibrated starting values; the brown/green hue boundary was sanity-checked on two hand-sorted real photos only.

## Demonstration images

`public/demo/manifest.json` lists every demo image with its description and known limitations.

- **Synthetic scenes** (`public/demo/synthetic-*.jpg`) are drawn by `lib/demo/synthetic.ts`: they are not photographs. Their ground truth is the drawn pixel area per class, which is exact for the drawing and says nothing about real-world accuracy.
- **Real photographs** (`public/demo/real/`) are five photos of hand-sorted cullet by *Alter Fritz* (Wikimedia Commons, **CC BY-SA 3.0**; see `public/demo/real/ATTRIBUTION.md`). They have **no measured composition**; the uploader's labels are shown as illustrative expectations only. Two of them informed the hue boundary, so they are not held out.

## Evaluating on held-out images

No measured ground truth ships with this repository, so **no accuracy claim is made**. To evaluate properly:

1. **Collect data.** For each photo, take the photographed material (or a documented representative split of it), hand-sort by colour (clear / green / brown), weigh each fraction, and record mass percentages. Photograph under a fixed rig (camera, lighting, background, ideally a grey card). Keep a held-out set that is never used to tune thresholds.
2. **Write a manifest** (schema: `lib/demo/manifest.ts`), e.g. `data/heldout.json`:

   ```json
   {
     "description": "Plant A, batch photos May 2026, hand-sorted and weighed",
     "items": [
       {
         "id": "batch-001",
         "title": "Batch 001",
         "file": "images/batch-001.jpg",
         "synthetic": false,
         "description": "Top view, 2 kg split, blue tray",
         "limitations": "",
         "groundTruth": { "kind": "physical-mass", "percent": { "clear": 52.1, "green": 30.4, "brown": 17.5 } }
       }
     ]
   }
   ```

   `file` is relative to the manifest. Use `"kind": "annotated-area"` if you instead hand-annotated pixel areas.
3. **Run** `npm run evaluate -- --manifest data/heldout.json`. The script decodes each PNG/JPEG, runs the same pipeline as the app, renormalises the estimate over clear/green/brown (other and uncertain are dropped), and prints per-image estimates, per-class **MAE** and **bias** in percentage points and the maximum absolute error. Images whose estimate is unusable (unsuitable photo) are counted separately, not silently dropped. Results are saved to `evaluation-results.json`.
4. **Interpret carefully.** With mass ground truth, the error mixes algorithm error with the area-vs-mass gap (thickness, density, overlap, hidden layers). Report the spread, not just the mean, and the share of images rated unsuitable. A small held-out set gives wide uncertainty.

Current output on the synthetic demo set (drawings only, not evidence of real-world performance): MAE ≈ 6.0 / 3.9 / 2.1 pp for clear / green / brown, one of five images correctly rated unsuitable.

## Project structure

```
app/                     Next.js App Router pages (dashboard, analyse, samples, report, compare, methodology)
components/              UI: shell, primitives, charts, analyse workflow, results, history, report
lib/vision/              colour spaces, preprocessing, quality, background, white balance,
                         classification, SLIC regions, fragments, anomaly screening, reliability, overlay
lib/analysis/            pipeline orchestration, rules engine, worker + executor, comparison, evaluation metrics
lib/storage/             SampleRepository / ImageStore interfaces, IndexedDB + in-memory implementations, service
lib/reports/             report model, JSON export, methodology text and disclaimer
lib/demo/                synthetic scene generator, real-photo metadata, manifest schema
types/                   analysis and sample schemas
scripts/                 generate-demo.ts, evaluate.ts
tests/                   Vitest suites
public/demo/             demo images + manifest (+ real/ATTRIBUTION.md)
```

## Architecture and a future AWS path

Three interfaces separate the app from infrastructure:

- `ImageStore` and `SampleRepository` (`lib/storage/types.ts`) — implemented today with IndexedDB (browser) and memory (tests).
- `AnalysisExecutor` (`lib/analysis/executor.ts`) — implemented today with a Web Worker (falls back to the main thread).

A cloud deployment could add, without changing the UI or pipeline:

- **Amazon S3** for images (an `ImageStore` that uploads via pre-signed URLs and stores object keys).
- **AWS Lambda** (Node.js runtime) or a container service running `runPipeline` from `lib/analysis/pipeline.ts` (a remote `AnalysisExecutor`).
- **Amazon DynamoDB** for `SampleRecord` metadata and history (a `SampleRepository` behind an authenticated API).
- Frontend hosting on any Next.js-capable host (e.g. AWS Amplify Hosting) or as a static export.

None of these integrations exist in the code; nothing AWS-related is required or stubbed. No `.env` configuration is needed.

## Limitations

- Area, not mass; top layer only; no scale reference.
- Clear glass on neutral backgrounds is unreliable (flagged). Thick dark glass under top lighting is often near-black and becomes "uncertain".
- Anomaly screening is heuristic: expect false positives (glints, overlapping clear glass) and false negatives (the €1 coin in the real demo photos is not flagged; clear plastic and white ceramic on white are not detectable).
- Thresholds are uncalibrated; reliability tiers are rule-based, not probabilities.
- Data stays in one browser's IndexedDB; clearing site data deletes history.
