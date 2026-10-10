"use client";

import { useState } from "react";
import { FlaskConical, Layers, ScanEye, ShieldAlert } from "lucide-react";
import { COLOUR_CLASSES, type AnalysisResult } from "@/types/analysis";
import { CLASS_STYLE } from "@/lib/classes";
import { roundPercentages } from "@/lib/vision/classify";
import { describeLocation } from "@/lib/reports/report";
import { ProportionBar, ClassSwatch } from "@/components/charts/ProportionBar";
import {
  Badge,
  Card,
  CardHeader,
  Disclosure,
  INDICATOR_META,
  Notice,
  SEVERITY_META,
  SeverityBadge,
  StatusBadge,
  TierBadge,
  cx,
  pct,
} from "@/components/ui";
import { MethodNote } from "./MethodNote";
import { OverlayViewer } from "./OverlayViewer";

export function ResultsView({
  result,
  imageUrl,
  overlayUrl,
}: {
  result: AnalysisResult;
  imageUrl: string | null;
  overlayUrl: string | null;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  return (
    <div className="space-y-6">
      <Notice tone="accent" icon={FlaskConical} title="Image-derived estimates, not physical measurements">
        Every value below is computed from the pixels of this photo. Colour shares are <strong>visible image area</strong>, not
        mass. Nothing on this page has been physically measured or verified.
      </Notice>

      <AssessmentCard result={result} />

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader
            title="Visual overlay"
            subtitle="Which pixels contributed to each class. Hatched = uncertain; numbered boxes = possible anomalies."
          />
          <div className="p-5">
            <OverlayViewer
              imageUrl={imageUrl}
              overlayUrl={overlayUrl}
              anomalies={result.anomalies}
              fragments={result.segmentation.fragments}
              selectedAnomaly={selected}
              onSelectAnomaly={setSelected}
            />
          </div>
        </Card>
        <ColourCard result={result} className="lg:col-span-2" />
      </div>

      <AnomaliesCard result={result} selected={selected} onSelect={setSelected} />

      <div className="grid gap-6 lg:grid-cols-2">
        <ReliabilityCard result={result} />
        <SegmentationCard result={result} />
      </div>
    </div>
  );
}

function AssessmentCard({ result }: { result: AnalysisResult }) {
  const a = result.assessment;
  return (
    <Card>
      <CardHeader
        title={
          <span className="flex flex-wrap items-center gap-2">
            {a.headline}
            <StatusBadge status={a.status} />
          </span>
        }
        subtitle="Prototype inspection rules — prompts for an operator, not industrial acceptance criteria."
        action={<TierBadge tier={result.reliability.tier} />}
      />
      <ul className="divide-y divide-line">
        {a.findings.map((f) => {
          const Icon = SEVERITY_META[f.severity].icon;
          return (
            <li key={f.ruleId} className="flex gap-3 px-5 py-4">
              <Icon
                aria-hidden
                className={cx(
                  "mt-0.5 size-4 shrink-0",
                  f.severity === "blocking" && "text-blocking",
                  f.severity === "action" && "text-action",
                  f.severity === "caution" && "text-caution",
                  f.severity === "info" && "text-muted",
                )}
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-ink">{f.title}</p>
                  <SeverityBadge severity={f.severity} />
                </div>
                <p className="mt-1 text-sm text-ink-2">{f.rationale}</p>
                <p className="mt-1.5 text-sm text-ink-2">
                  <span className="font-medium text-ink">Next step: </span>
                  {f.nextStep}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
      <div className="px-5 pb-5">
        <MethodNote keys={["rules"]} config={result.config} />
      </div>
    </Card>
  );
}

function ColourCard({ result, className }: { result: AnalysisResult; className?: string }) {
  const c = result.colour;
  const rounded = roundPercentages(c.percentages, 1);
  return (
    <Card className={className}>
      <CardHeader title="Estimated colour distribution" subtitle="Share of visible, categorised material area" />
      <div className="p-5">
        {!c.valid && (
          <Notice tone="blocking" className="mb-4" title="Not a valid distribution">
            Too little material remains after removing background and glare for proportions to mean anything.
          </Notice>
        )}
        <ProportionBar percentages={c.percentages} label="Estimated colour distribution" showLegend={false} height={24} />
        <table className="mt-4 w-full text-sm">
          <caption className="sr-only">Colour classes with area share and pixel count</caption>
          <thead>
            <tr className="border-b border-line text-left text-xs text-muted">
              <th scope="col" className="pb-2 font-medium">
                Class
              </th>
              <th scope="col" className="pb-2 text-right font-medium">
                Area share
              </th>
              <th scope="col" className="pb-2 text-right font-medium">
                Pixels
              </th>
            </tr>
          </thead>
          <tbody>
            {COLOUR_CLASSES.map((k) => (
              <tr key={k} className="border-b border-line/70 last:border-0">
                <th scope="row" className="py-2 text-left font-normal">
                  <span className="flex items-center gap-2 text-ink">
                    <ClassSwatch cls={k} />
                    {CLASS_STYLE[k].label}
                  </span>
                </th>
                <td className="tabular py-2 text-right font-semibold text-ink">{rounded[k].toFixed(1)}%</td>
                <td className="tabular py-2 text-right text-muted">{c.pixelCounts[k].toLocaleString("en-GB")}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-3 text-xs text-muted">
          Excluded from the denominator: background {pct(c.excludedPercentOfImage.background)} and glare{" "}
          {pct(c.excludedPercentOfImage.glare)} of the image. {c.materialPixels.toLocaleString("en-GB")} material pixels
          analysed at {result.quality.analysedWidth}×{result.quality.analysedHeight}.
        </p>
        <p className="mt-2 text-xs text-muted">
          {result.whiteBalance.applied ? "White balance: " : "White balance not applied: "}
          {result.whiteBalance.reason}
        </p>
        <MethodNote keys={["preprocess", "whiteBalance", "colour"]} config={result.config} />
      </div>
    </Card>
  );
}

function AnomaliesCard({
  result,
  selected,
  onSelect,
}: {
  result: AnalysisResult;
  selected: number | null;
  onSelect: (id: number | null) => void;
}) {
  const list = result.anomalies;
  return (
    <Card>
      <CardHeader
        title={
          <span className="flex items-center gap-2">
            <ShieldAlert aria-hidden className="size-4 text-action" />
            Possible visual anomalies
            <Badge tone={list.length ? "action" : "neutral"}>{list.length}</Badge>
          </span>
        }
        subtitle="Heuristic colour/texture screening. These are not confirmed contaminants."
      />
      <div className="p-5">
        {!result.screening.performed ? (
          <Notice tone="blocking">{result.screening.note}</Notice>
        ) : list.length === 0 ? (
          <Notice>
            No region matched the screening rules. This does <strong>not</strong> mean the sample is free of ceramic, stone,
            metal, plastic or other contaminants — many are visually indistinguishable from glass in an RGB photo.
          </Notice>
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {list.map((a) => (
              <li key={a.id}>
                <button
                  type="button"
                  onClick={() => onSelect(selected === a.id ? null : a.id)}
                  aria-pressed={selected === a.id}
                  className={cx(
                    "w-full rounded-lg border p-4 text-left transition-colors",
                    selected === a.id ? "border-[#c9a400] bg-[#fffbe6]" : "border-line hover:bg-surface-2",
                  )}
                >
                  <div className="flex items-start gap-3">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#ffd60a] text-[11px] font-bold text-charcoal">
                      {a.id}
                    </span>
                    <div className="min-w-0">
                      <p className="font-medium text-ink">{a.label}</p>
                      <p className="text-xs text-muted">
                        {describeLocation(a.centroid.x, a.centroid.y)} · {a.areaPercent.toFixed(2)}% of image ·{" "}
                        {a.features.superpixels} region{a.features.superpixels === 1 ? "" : "s"}
                      </p>
                      <p className="mt-2 text-sm text-ink-2">
                        <span className="font-medium text-ink">Could be: </span>
                        {a.possibleExplanations}
                      </p>
                      <p className="mt-1 text-sm text-ink-2">
                        <span className="font-medium text-ink">Verify: </span>
                        {a.verification}
                      </p>
                      <p className="tabular mt-2 text-xs text-muted">
                        L* {a.features.meanLightness} · C* {a.features.meanChroma} · h {a.features.hueAngle}° · σL*{" "}
                        {a.features.lightnessStd}
                      </p>
                      <p className="mt-1 text-xs text-muted">Rule: {a.rule}</p>
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-xs text-muted">{result.screening.note}</p>
        <MethodNote keys={["screening"]} config={result.config} />
      </div>
    </Card>
  );
}

function ReliabilityCard({ result }: { result: AnalysisResult }) {
  const r = result.reliability;
  return (
    <Card>
      <CardHeader
        title={
          <span className="flex items-center gap-2">
            <ScanEye aria-hidden className="size-4 text-accent" />
            Image-quality &amp; reliability indicators
          </span>
        }
        subtitle="Rule-based summary of photo conditions — not a calibrated probability or an accuracy figure."
        action={<TierBadge tier={r.tier} prefix="Tier" />}
      />
      <div className="p-5">
        <p className="text-sm text-ink-2">{r.summary}</p>
        <p className="mt-1 text-xs text-muted">
          Reliable colour estimation conditions do not establish that materials have been identified correctly.
        </p>
        <ul className="mt-4 divide-y divide-line rounded-lg border border-line">
          {r.indicators.map((i) => {
            const m = INDICATOR_META[i.status];
            const Icon = m.icon;
            return (
              <li key={i.id}>
                <details className="group">
                  <summary className="flex cursor-pointer list-none items-center gap-3 px-3 py-2.5 text-sm [&::-webkit-details-marker]:hidden">
                    <Icon
                      aria-hidden
                      className={cx(
                        "size-4 shrink-0",
                        i.status === "good" && "text-good",
                        i.status === "caution" && "text-caution",
                        i.status === "poor" && "text-blocking",
                      )}
                    />
                    <span className="flex-1 text-ink">
                      {i.label}
                      {i.critical && <span className="ml-1 text-xs text-muted">(critical)</span>}
                    </span>
                    <span className="tabular hidden text-xs text-muted sm:inline">{i.displayValue}</span>
                    <span className="sr-only">Status: {m.label}</span>
                  </summary>
                  <div className="px-10 pb-3 text-xs text-ink-2">
                    <p className="tabular mb-1 text-muted sm:hidden">{i.displayValue}</p>
                    {i.explanation}
                  </div>
                </details>
              </li>
            );
          })}
        </ul>
        <MethodNote keys={["quality", "reliability"]} config={result.config} />
      </div>
    </Card>
  );
}

function SegmentationCard({ result }: { result: AnalysisResult }) {
  const s = result.segmentation;
  const b = result.background;
  return (
    <Card>
      <CardHeader
        title={
          <span className="flex items-center gap-2">
            <Layers aria-hidden className="size-4 text-accent" />
            Regions &amp; fragments
          </span>
        }
        subtitle={s.mode === "fragments" ? "Fragment-level segmentation (background separated)" : "Region-level analysis only"}
      />
      <div className="space-y-4 p-5 text-sm">
        <dl className="grid grid-cols-2 gap-4">
          <div>
            <dt className="text-xs text-muted">Separated components</dt>
            <dd className="tabular text-xl font-semibold text-ink">{s.mode === "fragments" ? s.fragmentCount : "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">SLIC regions</dt>
            <dd className="tabular text-xl font-semibold text-ink">{s.regionCount}</dd>
          </div>
        </dl>
        <p className="text-ink-2">{s.note}</p>
        <Notice tone={b.detected ? (b.similarToClearGlass ? "caution" : "good") : "caution"} title="Background">
          {b.reason}
        </Notice>
        {s.fragments.length > 0 && (
          <Disclosure summary={`Largest components (${Math.min(10, s.fragments.length)} of ${s.fragmentCount})`}>
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-muted">
                  <th className="pb-1 font-medium">#</th>
                  <th className="pb-1 font-medium">Dominant class</th>
                  <th className="pb-1 text-right font-medium">Purity</th>
                  <th className="pb-1 text-right font-medium">Area</th>
                </tr>
              </thead>
              <tbody>
                {s.fragments.slice(0, 10).map((f) => (
                  <tr key={f.id} className="border-t border-line/70">
                    <td className="tabular py-1">{f.id}</td>
                    <td className="py-1">
                      {f.dominantClass ? (
                        <span className="flex items-center gap-1.5">
                          <ClassSwatch cls={f.dominantClass} />
                          {CLASS_STYLE[f.dominantClass].shortLabel}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="tabular py-1 text-right">{(f.purity * 100).toFixed(0)}%</td>
                    <td className="tabular py-1 text-right">{f.areaPercent.toFixed(2)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Disclosure>
        )}
        <MethodNote keys={["background", "segmentation"]} config={result.config} />
      </div>
    </Card>
  );
}
