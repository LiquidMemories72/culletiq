import type { Metadata } from "next";
import { Ban, CheckSquare, Cloud, Database, FlaskConical, Workflow } from "lucide-react";
import { DEFAULT_CONFIG } from "@/lib/vision/config";
import { DISCLAIMER, METHOD_STEPS, PHYSICAL_VALIDATION, WHAT_IT_CANNOT_MEASURE } from "@/lib/reports/methodology";
import { DEFAULT_RULE_THRESHOLDS } from "@/lib/analysis/rules";
import { REAL_DEMOS } from "@/lib/demo/real";
import { Card, CardHeader, Notice, PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Methodology & limitations" };

export default function MethodologyPage() {
  return (
    <div>
      <PageHeader
        eyebrow="Methodology"
        title="How CulletIQ works — and what it cannot do"
        description="A transparent, deterministic computer-vision baseline. No machine-learning model, no cloud service and no language model produces any number in this application."
      />
      <Notice tone="caution" className="mb-6" title="Decision-support prototype">
        {DISCLAIMER}
      </Notice>

      <Card className="mb-6">
        <CardHeader
          title={
            <span className="flex items-center gap-2">
              <Workflow aria-hidden className="size-4 text-accent" /> Pipeline (default settings)
            </span>
          }
          subtitle="Runs in a Web Worker in your browser. Implemented in TypeScript (lib/vision, lib/analysis)."
        />
        <ol className="divide-y divide-line">
          {METHOD_STEPS.map((s, i) => (
            <li key={s.key} className="grid gap-3 px-5 py-5 md:grid-cols-[2rem_1fr]">
              <span className="flex size-7 items-center justify-center rounded-full bg-accent-soft text-sm font-semibold text-accent-strong">
                {i + 1}
              </span>
              <div className="min-w-0">
                <h3 className="font-semibold text-ink">{s.title}</h3>
                <p className="mt-0.5 text-sm text-muted">{s.measures}</p>
                <dl className="mt-3 grid gap-3 text-sm lg:grid-cols-3">
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-muted">Algorithm</dt>
                    <dd className="mt-0.5 text-ink-2">{s.algorithm(DEFAULT_CONFIG)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-muted">Limitations</dt>
                    <dd className="mt-0.5 text-ink-2">{s.limitations}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-muted">Verify by</dt>
                    <dd className="mt-0.5 text-ink-2">{s.verification}</dd>
                  </div>
                </dl>
              </div>
            </li>
          ))}
        </ol>
      </Card>

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader
            title={
              <span className="flex items-center gap-2">
                <Ban aria-hidden className="size-4 text-blocking" /> What it cannot measure
              </span>
            }
          />
          <ul className="list-disc space-y-1.5 py-4 pl-9 pr-5 text-sm text-ink-2">
            {WHAT_IT_CANNOT_MEASURE.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </Card>
        <Card>
          <CardHeader
            title={
              <span className="flex items-center gap-2">
                <CheckSquare aria-hidden className="size-4 text-good" /> Physical validation required before industrial use
              </span>
            }
          />
          <ul className="list-disc space-y-1.5 py-4 pl-9 pr-5 text-sm text-ink-2">
            {PHYSICAL_VALIDATION.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </Card>
      </div>

      <Card className="mb-6">
        <CardHeader
          title={
            <span className="flex items-center gap-2">
              <FlaskConical aria-hidden className="size-4 text-accent" /> Inspection rule thresholds (prototype)
            </span>
          }
          subtitle="Configurable in lib/analysis/rules.ts. Not derived from any standard, regulation or plant specification."
        />
        <dl className="grid gap-4 p-5 text-sm sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <dt className="text-muted">Visually dominant colour</dt>
            <dd className="font-medium text-ink">≥ {DEFAULT_RULE_THRESHOLDS.dominantMinPercent}% of material area</dd>
          </div>
          <div>
            <dt className="text-muted">Visibly mixed</dt>
            <dd className="font-medium text-ink">no class ≥ {DEFAULT_RULE_THRESHOLDS.mixedMaxPercent}%</dd>
          </div>
          <div>
            <dt className="text-muted">Manual inspection (uncertain)</dt>
            <dd className="font-medium text-ink">≥ {DEFAULT_RULE_THRESHOLDS.uncertainActionPercent}% uncertain</dd>
          </div>
          <div>
            <dt className="text-muted">Other-colour caution</dt>
            <dd className="font-medium text-ink">≥ {DEFAULT_RULE_THRESHOLDS.otherColourCautionPercent}% other colour</dd>
          </div>
          <div>
            <dt className="text-muted">Glare caution</dt>
            <dd className="font-medium text-ink">≥ {DEFAULT_RULE_THRESHOLDS.glareCautionPercent}% of image</dd>
          </div>
          <div>
            <dt className="text-muted">Any possible anomaly</dt>
            <dd className="font-medium text-ink">physical verification required</dd>
          </div>
        </dl>
      </Card>

      <Card className="mb-6" id="data">
        <CardHeader
          title={
            <span className="flex items-center gap-2">
              <Database aria-hidden className="size-4 text-accent" /> Data, validation and demonstration images
            </span>
          }
        />
        <div className="space-y-3 p-5 text-sm text-ink-2">
          <p>
            <strong className="text-ink">No measured ground truth is included.</strong> The repository contains no photographs with
            physically sorted and weighed compositions, so no real-world accuracy can be claimed.
          </p>
          <p>
            <strong className="text-ink">Synthetic scenes</strong> are drawn by code (lib/demo/synthetic.ts). Their ground truth is the
            drawn pixel area per class. Running <code className="rounded bg-surface-2 px-1">npm run evaluate</code> reports error on these
            drawings only — it tests that the pipeline behaves sensibly, not that it is accurate on real cullet.
          </p>
          <p>
            <strong className="text-ink">Real photographs</strong> are {REAL_DEMOS.length} images of hand-sorted cullet by{" "}
            {REAL_DEMOS[0].attribution?.author}, licensed{" "}
            <a className="underline" href={REAL_DEMOS[0].attribution?.licenseUrl} target="_blank" rel="noreferrer">
              {REAL_DEMOS[0].attribution?.license}
            </a>
            . Two of them (green, amber) were used to sanity-check the green/brown hue boundary, so they are not a held-out test set.
          </p>
          <ul className="list-disc space-y-1 pl-5 text-xs">
            {REAL_DEMOS.map((d) => (
              <li key={d.id}>
                <a className="underline" href={d.attribution?.source} target="_blank" rel="noreferrer">
                  {d.title}
                </a>{" "}
                — {d.attribution?.changes}
              </li>
            ))}
          </ul>
          <p>
            To evaluate on your own held-out photos, see the README section “Evaluating on held-out images”.
          </p>
        </div>
      </Card>

      <Card>
        <CardHeader
          title={
            <span className="flex items-center gap-2">
              <Cloud aria-hidden className="size-4 text-accent" /> Architecture and deployment path
            </span>
          }
        />
        <div className="space-y-2 p-5 text-sm text-ink-2">
          <p>
            Everything runs locally today. Three interfaces separate the app from its infrastructure:{" "}
            <code className="rounded bg-surface-2 px-1">ImageStore</code>, <code className="rounded bg-surface-2 px-1">SampleRepository</code>{" "}
            (lib/storage/types.ts) and <code className="rounded bg-surface-2 px-1">AnalysisExecutor</code> (lib/analysis/executor.ts).
          </p>
          <p>
            A future cloud deployment could implement them with Amazon S3 (images), AWS Lambda or a container service running the same
            pipeline module (analysis), and Amazon DynamoDB (records), with the frontend on a static/Next.js host. None of this is
            implemented or required.
          </p>
        </div>
      </Card>
    </div>
  );
}
