"use client";

import Link from "next/link";
import { ArrowRight, Database, ScanSearch, ShieldAlert } from "lucide-react";
import { computeDashboardStats } from "@/lib/analysis/compare";
import { useSampleRecords } from "@/lib/hooks";
import { AveragesChart } from "@/components/charts/AveragesChart";
import { SampleTrendChart } from "@/components/charts/SampleTrendChart";
import { ProportionBar } from "@/components/charts/ProportionBar";
import {
  Card,
  CardHeader,
  EmptyState,
  LinkButton,
  Notice,
  PageHeader,
  SeverityBadge,
  Stat,
  StatusBadge,
  formatDateTime,
} from "@/components/ui";

export function Dashboard() {
  const { records, loading, error } = useSampleRecords();
  const stats = records ? computeDashboardStats(records) : null;
  const usable = records?.filter((r) => r.result.colour.valid && r.result.reliability.tier !== "unsuitable") ?? [];

  return (
    <div>
      <PageHeader
        eyebrow="Dashboard"
        title="Cullet sample overview"
        description="Statistics derived from samples saved in this browser. All colour figures are estimated visible image area — not mass."
        actions={
          <LinkButton href="/analyse" variant="primary">
            <ScanSearch aria-hidden className="size-4" />
            Analyse new sample
          </LinkButton>
        }
      />

      {error && (
        <Notice tone="blocking" className="mb-6" title="Could not read saved samples">
          {error}
        </Notice>
      )}

      {loading ? (
        <Card className="p-10 text-center text-sm text-muted">Loading saved samples…</Card>
      ) : !stats || stats.total === 0 ? (
        <Card>
          <EmptyState
            icon={Database}
            title="No samples analysed yet"
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <LinkButton href="/analyse" variant="primary">
                  Analyse a sample
                </LinkButton>
                <LinkButton href="/methodology">How it works</LinkButton>
              </div>
            }
          >
            Upload a photo of crushed glass, or try one of the labelled demonstration images on the analysis page. Saved results
            appear here — nothing is pre-filled or invented.
          </EmptyState>
        </Card>
      ) : (
        <div className="space-y-6">
          <Card className="grid grid-cols-2 gap-6 p-5 md:grid-cols-4">
            <Stat label="Samples analysed" value={stats.total} hint="saved in this browser" />
            <Stat label="Usable for colour averages" value={stats.usableCount} hint="valid, not unsuitable" />
            <Stat
              label="Needing inspection"
              value={stats.statusCounts.inspect}
              hint={`${stats.statusCounts.unsuitable} unsuitable image${stats.statusCounts.unsuitable === 1 ? "" : "s"}`}
            />
            <Stat label="Possible anomalies flagged" value={stats.totalAnomalies} hint="heuristic, unverified" />
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader
                title="Average estimated colour share"
                subtitle={`Unweighted mean of ${stats.usableCount} usable sample${stats.usableCount === 1 ? "" : "s"} · % of visible material area`}
              />
              <div className="p-5">
                {stats.averages ? (
                  <AveragesChart averages={stats.averages} />
                ) : (
                  <p className="text-sm text-muted">No usable samples yet — every saved image was unsuitable for colour estimation.</p>
                )}
                <p className="mt-2 text-xs text-muted">
                  Sample-derived statistic. Each photo counts once regardless of batch size; photos may not represent their batches.
                </p>
              </div>
            </Card>
            <Card>
              <CardHeader title="Recent samples" subtitle="Estimated colour share per sample, oldest → newest (last 12 usable)" />
              <div className="p-5">
                {usable.length ? (
                  <SampleTrendChart records={usable.slice(0, 12)} />
                ) : (
                  <p className="text-sm text-muted">No usable samples to chart.</p>
                )}
              </div>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-5">
            <Card className="lg:col-span-3">
              <CardHeader
                title="Recent analyses"
                action={
                  <Link href="/samples" className="flex items-center gap-1 text-sm text-accent hover:underline">
                    All samples <ArrowRight aria-hidden className="size-3.5" />
                  </Link>
                }
              />
              <ul className="divide-y divide-line">
                {records!.slice(0, 6).map((r) => (
                  <li key={r.id}>
                    <Link href={`/samples/${r.id}`} className="block px-5 py-3.5 hover:bg-surface-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate font-medium text-ink">{r.name}</p>
                          <p className="text-xs text-muted">
                            {r.id} · {formatDateTime(r.createdAt)}
                            {r.source.kind === "demo" && " · demo image"}
                          </p>
                        </div>
                        <StatusBadge status={r.result.assessment.status} />
                      </div>
                      <div className="mt-2.5">
                        <ProportionBar
                          percentages={r.result.colour.percentages}
                          label={`${r.name} colour distribution`}
                          height={8}
                          showLegend={false}
                          compact
                        />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
            <Card className="lg:col-span-2">
              <CardHeader
                title={
                  <span className="flex items-center gap-2">
                    <ShieldAlert aria-hidden className="size-4 text-action" /> Recent inspection flags
                  </span>
                }
                subtitle="Caution, action and blocking findings"
              />
              {stats.recentFlags.length === 0 ? (
                <p className="px-5 py-6 text-sm text-muted">No flags raised on saved samples.</p>
              ) : (
                <ul className="divide-y divide-line">
                  {stats.recentFlags.map((f, i) => (
                    <li key={`${f.sampleId}-${f.finding.ruleId}-${i}`}>
                      <Link href={`/samples/${f.sampleId}`} className="block px-5 py-3 hover:bg-surface-2">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium text-ink">{f.finding.title}</p>
                          <SeverityBadge severity={f.finding.severity} />
                        </div>
                        <p className="mt-0.5 truncate text-xs text-muted">{f.sampleName}</p>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
