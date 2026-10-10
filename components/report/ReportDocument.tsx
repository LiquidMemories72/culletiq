import type { ReactNode } from "react";
import type { SampleReport } from "@/lib/reports/report";
import { CLASS_STYLE } from "@/lib/classes";
import { STATUS_LABEL } from "@/lib/analysis/rules";
import { TIER_LABEL } from "@/lib/vision/reliability";
import { cx, formatDateTime } from "@/components/ui";

function Section({ title, children, className }: { title: string; children: ReactNode; className?: string }) {
  return (
    <section className={cx("avoid-break mt-8", className)}>
      <h2 className="mb-3 border-b border-ink/80 pb-1 text-sm font-semibold uppercase tracking-wider text-ink">{title}</h2>
      {children}
    </section>
  );
}

/** Printable report. Renders only values from the SampleReport model. */
export function ReportDocument({
  report,
  thumbnailUrl,
  overlayUrl,
}: {
  report: SampleReport;
  thumbnailUrl: string | null;
  overlayUrl: string | null;
}) {
  const cd = report.colourDistribution;
  return (
    <article className="rounded-xl border border-line bg-white p-6 text-[13px] leading-relaxed text-ink shadow-sm sm:p-10 print:rounded-none print:border-0 print:p-0 print:shadow-none">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-ink pb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-accent">CulletIQ · Preliminary image-based assessment</p>
          <h1 className="mt-1 text-2xl font-semibold">{report.sample.name}</h1>
          <p className="mt-1 text-xs text-muted">
            Sample ID {report.sample.id} · analysed {formatDateTime(report.sample.analysedAt)} · report generated{" "}
            {formatDateTime(report.generatedAt)}
          </p>
        </div>
        <div className="text-right text-xs">
          <p className="font-semibold">Status: {STATUS_LABEL[report.assessment.status as keyof typeof STATUS_LABEL]}</p>
          <p>Image reliability tier: {TIER_LABEL[report.reliability.tier]}</p>
          <p className="text-muted">
            {report.algorithm.name}, v{report.algorithm.version}
          </p>
        </div>
      </header>

      <p className="mt-4 rounded-md border border-caution/40 bg-caution-soft px-3 py-2 text-xs text-ink">
        <strong>Disclaimer.</strong> {report.disclaimer}
      </p>

      <Section title="Images">
        <div className="grid grid-cols-2 gap-4">
          <figure>
            {thumbnailUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={thumbnailUrl} alt="Uploaded sample" className="w-full rounded border border-line" />
            ) : (
              <div className="aspect-[4/3] rounded bg-surface-2" />
            )}
            <figcaption className="mt-1 text-xs text-muted">
              Uploaded image ({report.sample.source.fileName}
              {report.sample.source.kind === "demo" ? ", demonstration image" : ""})
            </figcaption>
          </figure>
          <figure>
            <div className="relative">
              {thumbnailUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={thumbnailUrl} alt="" className="w-full rounded border border-line" />
              )}
              {overlayUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={overlayUrl} alt="Classification overlay" className="absolute inset-0 h-full w-full rounded opacity-80" />
              )}
              <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
                {report.anomalies.map((a) => (
                  <g key={a.id}>
                    <rect
                      x={a.box.x * 100}
                      y={a.box.y * 100}
                      width={a.box.w * 100}
                      height={a.box.h * 100}
                      fill="none"
                      stroke="#ffd60a"
                      strokeWidth={2}
                      vectorEffect="non-scaling-stroke"
                    />
                  </g>
                ))}
              </svg>
              {report.anomalies.map((a) => (
                <span
                  key={a.id}
                  className="absolute flex size-5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-ink bg-[#ffd60a] text-[10px] font-bold"
                  style={{ left: `${(a.box.x + a.box.w / 2) * 100}%`, top: `${a.box.y * 100}%` }}
                >
                  {a.id}
                </span>
              ))}
            </div>
            <figcaption className="mt-1 text-xs text-muted">
              Overlay: blue clear, dark green green, amber brown, violet other, hatched magenta uncertain, white glare;
              background transparent; numbered boxes = possible anomalies.
            </figcaption>
          </figure>
        </div>
        {report.sample.source.demoNote && <p className="mt-2 text-xs text-muted">{report.sample.source.demoNote}</p>}
      </Section>

      <Section title="Assessment (prototype inspection rules)">
        <p className="font-semibold">{report.assessment.headline}</p>
        <ul className="mt-2 space-y-2">
          {report.assessment.findings.map((f, i) => (
            <li key={i} className="avoid-break">
              <p>
                <span className="mr-2 inline-block rounded border border-line-strong px-1.5 text-[10px] font-semibold uppercase">
                  {f.severity}
                </span>
                <strong>{f.title}.</strong> {f.rationale}
              </p>
              <p className="pl-1 text-muted">Next step: {f.nextStep}</p>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-muted">These are prototype prompts for an operator, not acceptance criteria or regulatory limits.</p>
      </Section>

      <Section title="Estimated colour distribution (visible image area)">
        {!cd.valid && <p className="mb-2 font-semibold text-blocking">Not a valid distribution: too little material visible.</p>}
        <table className="w-full">
          <thead>
            <tr className="border-b border-line text-left text-xs text-muted">
              <th className="py-1 font-medium">Class</th>
              <th className="py-1 text-right font-medium">Share of material area</th>
              <th className="py-1 text-right font-medium">Pixels</th>
            </tr>
          </thead>
          <tbody>
            {cd.rows.map((r) => (
              <tr key={r.cls} className="border-b border-line/60">
                <td className="py-1">
                  <span
                    className="mr-2 inline-block size-2.5 rounded-sm align-middle"
                    style={{ backgroundColor: CLASS_STYLE[r.cls].hex, printColorAdjust: "exact", WebkitPrintColorAdjust: "exact" }}
                  />
                  {r.label}
                </td>
                <td className="tabular py-1 text-right font-semibold">{r.percent.toFixed(1)}%</td>
                <td className="tabular py-1 text-right text-muted">{r.pixels.toLocaleString("en-GB")}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-2 text-xs text-muted">
          {cd.basis} Excluded: background {cd.excluded.backgroundPercentOfImage}% and glare {cd.excluded.glarePercentOfImage}% of
          the image. {cd.materialPixels.toLocaleString("en-GB")} of {cd.totalPixels.toLocaleString("en-GB")} analysed pixels were
          material.
        </p>
        <p className="mt-1 text-xs text-muted">Background: {report.background.reason}</p>
        <p className="mt-1 text-xs text-muted">
          Segmentation ({report.segmentation.mode}):{" "}
          {report.segmentation.mode === "fragments" ? `${report.segmentation.fragmentCount} separated components. ` : ""}
          {report.segmentation.note}
        </p>
      </Section>

      <Section title="Possible visual anomalies">
        {report.anomalies.length === 0 ? (
          <p>None flagged. This does not establish the absence of contaminants. {report.screeningNote}</p>
        ) : (
          <>
            <table className="w-full">
              <thead>
                <tr className="border-b border-line text-left text-xs text-muted">
                  <th className="py-1 font-medium">#</th>
                  <th className="py-1 font-medium">Observation</th>
                  <th className="py-1 font-medium">Location</th>
                  <th className="py-1 text-right font-medium">Area</th>
                </tr>
              </thead>
              <tbody>
                {report.anomalies.map((a) => (
                  <tr key={a.id} className="border-b border-line/60 align-top">
                    <td className="py-1">{a.id}</td>
                    <td className="py-1">
                      <strong>{a.label}.</strong> Could be: {a.possibleExplanations} <span className="text-muted">Verify: {a.verification}</span>
                    </td>
                    <td className="py-1 whitespace-nowrap">{a.location}</td>
                    <td className="tabular py-1 text-right">{a.areaPercentOfImage}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-2 text-xs text-muted">{report.screeningNote} These are not confirmed contaminants.</p>
          </>
        )}
      </Section>

      <Section title="Image quality and reliability indicators">
        <p>{report.reliability.summary}</p>
        <table className="mt-2 w-full">
          <tbody>
            {report.reliability.indicators.map((i) => (
              <tr key={i.label} className="border-b border-line/60 align-top">
                <td className="py-1 pr-2 font-medium">{i.label}</td>
                <td className="py-1 pr-2 uppercase text-[10px] font-semibold">{i.status}</td>
                <td className="tabular py-1 pr-2">{i.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-2 text-xs text-muted">
          The tier is a rule-based summary of photo conditions. It is not a calibrated probability or an accuracy figure.
        </p>
      </Section>

      <Section title="Methodology" className="print-break">
        <ol className="list-decimal space-y-2 pl-5">
          {report.methodology.map((m) => (
            <li key={m.title}>
              <strong>{m.title}.</strong> {m.algorithm} <span className="text-muted">Limitations: {m.limitations}</span>
            </li>
          ))}
        </ol>
      </Section>

      <Section title="Limitations — what this analysis cannot establish">
        <ul className="list-disc space-y-1 pl-5">
          {report.limitations.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
      </Section>

      <Section title="Recommended manual checks">
        <ul className="list-disc space-y-1 pl-5">
          {report.recommendedChecks.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
      </Section>

      <footer className="mt-10 border-t border-line pt-3 text-[11px] text-muted">
        {report.disclaimer} · Report schema {report.schema}
      </footer>
    </article>
  );
}
