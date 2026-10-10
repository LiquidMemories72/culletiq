"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useId } from "react";
import { AlertTriangle, GitCompareArrows } from "lucide-react";
import { COLOUR_CLASSES } from "@/types/analysis";
import type { SampleRecord } from "@/types/sample";
import { compareSamples } from "@/lib/analysis/compare";
import { CLASS_STYLE } from "@/lib/classes";
import { useSampleRecords, useThumbnails } from "@/lib/hooks";
import { ProportionBar, ClassSwatch } from "@/components/charts/ProportionBar";
import {
  Card,
  CardHeader,
  EmptyState,
  LinkButton,
  Notice,
  PageHeader,
  StatusBadge,
  TierBadge,
  formatDateTime,
} from "@/components/ui";

function SamplePicker({
  label,
  value,
  records,
  onChange,
}: {
  label: string;
  value: string;
  records: SampleRecord[];
  onChange: (id: string) => void;
}) {
  const id = useId();
  return (
    <div className="min-w-0 flex-1">
      <label htmlFor={id} className="mb-1 block text-xs font-medium text-muted">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-line-strong bg-surface px-3 py-2 text-sm"
      >
        <option value="">Select a sample…</option>
        {records.map((r) => (
          <option key={r.id} value={r.id}>
            {r.name} — {formatDateTime(r.createdAt)}
          </option>
        ))}
      </select>
    </div>
  );
}

export function CompareView() {
  const params = useSearchParams();
  const router = useRouter();
  const { records, loading } = useSampleRecords();
  const thumbs = useThumbnails(records);
  const aId = params.get("a") ?? "";
  const bId = params.get("b") ?? "";

  const setParam = (key: "a" | "b", v: string) => {
    const next = new URLSearchParams(params.toString());
    if (v) next.set(key, v);
    else next.delete(key);
    router.replace(`/compare?${next.toString()}`);
  };

  const a = records?.find((r) => r.id === aId);
  const b = records?.find((r) => r.id === bId);
  const cmp = a && b ? compareSamples(a, b) : null;

  return (
    <div>
      <PageHeader
        eyebrow="Compare"
        title="Compare two samples"
        description="Side-by-side estimated colour shares. Differences are in percentage points of visible material area."
      />
      {loading ? (
        <Card className="p-10 text-center text-sm text-muted">Loading…</Card>
      ) : !records || records.length < 2 ? (
        <Card>
          <EmptyState
            icon={GitCompareArrows}
            title="At least two saved samples are needed"
            action={<LinkButton href="/analyse" variant="primary">Analyse a sample</LinkButton>}
          >
            You have {records?.length ?? 0} saved sample{records?.length === 1 ? "" : "s"}.
          </EmptyState>
        </Card>
      ) : (
        <div className="space-y-6">
          <Card className="flex flex-col gap-4 p-5 sm:flex-row">
            <SamplePicker label="Sample A" value={aId} records={records} onChange={(v) => setParam("a", v)} />
            <SamplePicker label="Sample B" value={bId} records={records} onChange={(v) => setParam("b", v)} />
          </Card>

          {a && b && cmp ? (
            <>
              {aId === bId && <Notice tone="caution">Both selections are the same sample.</Notice>}
              <div className="grid gap-6 md:grid-cols-2">
                {[a, b].map((r, i) => (
                  <Card key={`${r.id}-${i}`}>
                    <CardHeader
                      title={
                        <Link href={`/samples/${r.id}`} className="hover:underline">
                          {i === 0 ? "A" : "B"} · {r.name}
                        </Link>
                      }
                      subtitle={`${r.id} · ${formatDateTime(r.createdAt)}`}
                    />
                    <div className="space-y-4 p-5">
                      {thumbs[r.id] && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={thumbs[r.id]} alt={`Sample ${r.name}`} className="aspect-[4/3] w-full rounded-lg object-cover" />
                      )}
                      <div className="flex flex-wrap gap-2">
                        <StatusBadge status={r.result.assessment.status} />
                        <TierBadge tier={r.result.reliability.tier} />
                      </div>
                      <ProportionBar percentages={r.result.colour.percentages} label={`Sample ${r.name}`} compact />
                    </div>
                  </Card>
                ))}
              </div>

              <Card>
                <CardHeader title="Differences (B − A)" subtitle="Percentage points of visible material area" />
                <div className="overflow-x-auto p-5">
                  <table className="w-full min-w-[520px] text-sm">
                    <thead>
                      <tr className="border-b border-line text-left text-xs text-muted">
                        <th scope="col" className="pb-2 font-medium">Class</th>
                        <th scope="col" className="pb-2 text-right font-medium">A</th>
                        <th scope="col" className="pb-2 text-right font-medium">B</th>
                        <th scope="col" className="pb-2 text-right font-medium">B − A</th>
                        <th scope="col" className="w-[38%] pb-2 pl-4 font-medium">
                          <span className="sr-only">Difference bar</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {COLOUR_CLASSES.map((c) => {
                        const d = cmp.deltas[c];
                        const w = Math.min(50, Math.abs(d) / 2);
                        return (
                          <tr key={c} className="border-b border-line/70">
                            <th scope="row" className="py-2 text-left font-normal">
                              <span className="flex items-center gap-2">
                                <ClassSwatch cls={c} />
                                {CLASS_STYLE[c].label}
                              </span>
                            </th>
                            <td className="tabular py-2 text-right">{a.result.colour.percentages[c].toFixed(1)}%</td>
                            <td className="tabular py-2 text-right">{b.result.colour.percentages[c].toFixed(1)}%</td>
                            <td className="tabular py-2 text-right font-semibold">
                              {d >= 0 ? "+" : ""}
                              {d.toFixed(1)}
                            </td>
                            <td className="py-2 pl-4" aria-hidden>
                              <div className="relative h-3">
                                <div className="absolute inset-y-0 left-1/2 w-px bg-line-strong" />
                                <div
                                  className="absolute inset-y-0 rounded-sm"
                                  style={{
                                    backgroundColor: CLASS_STYLE[c].hex,
                                    left: d >= 0 ? "50%" : `${50 - w}%`,
                                    width: `${w}%`,
                                  }}
                                />
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      <tr>
                        <th scope="row" className="py-2 text-left font-normal text-ink-2">
                          Possible anomalies
                        </th>
                        <td className="tabular py-2 text-right">{cmp.anomalyCounts[0]}</td>
                        <td className="tabular py-2 text-right">{cmp.anomalyCounts[1]}</td>
                        <td className="tabular py-2 text-right font-semibold">{cmp.anomalyCounts[1] - cmp.anomalyCounts[0]}</td>
                        <td />
                      </tr>
                    </tbody>
                  </table>
                  {cmp.largestShift && cmp.comparable && (
                    <p className="mt-3 text-sm text-ink-2">
                      Largest shift among the main classes: <strong>{CLASS_STYLE[cmp.largestShift.cls].label.toLowerCase()}</strong>{" "}
                      ({cmp.largestShift.delta >= 0 ? "+" : ""}
                      {cmp.largestShift.delta.toFixed(1)} pp).
                    </p>
                  )}
                </div>
              </Card>

              <Notice tone={cmp.comparable ? "caution" : "blocking"} icon={AlertTriangle} title={cmp.comparable ? "Comparability caveats" : "Not comparable"}>
                <ul className="mt-1 list-disc space-y-1 pl-4">
                  {cmp.caveats.map((c) => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>
              </Notice>
            </>
          ) : (
            <Card className="p-8 text-center text-sm text-muted">Select two samples to compare.</Card>
          )}
        </div>
      )}
    </div>
  );
}
