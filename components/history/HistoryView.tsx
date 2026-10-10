"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Download, FileText, GitCompareArrows, History, Trash2 } from "lucide-react";
import { getSampleService } from "@/lib/storage";
import { useSampleRecords, useThumbnails } from "@/lib/hooks";
import { buildReport } from "@/lib/reports/report";
import { downloadText } from "@/lib/browser/image";
import { ProportionBar } from "@/components/charts/ProportionBar";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  LinkButton,
  Notice,
  PageHeader,
  StatusBadge,
  TierBadge,
  formatDateTime,
} from "@/components/ui";

export function HistoryView() {
  const { records, loading, error, refresh } = useSampleRecords();
  const thumbs = useThumbnails(records);
  const [selected, setSelected] = useState<string[]>([]);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const router = useRouter();

  function toggle(id: string) {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s.slice(-1), id]));
  }

  async function remove(id: string) {
    try {
      await getSampleService().remove(id);
      setSelected((s) => s.filter((x) => x !== id));
      setConfirming(null);
      await refresh();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Delete failed.");
    }
  }

  async function exportAll() {
    if (!records) return;
    const service = getSampleService();
    const reports = [];
    for (const r of records) {
      const s = await service.load(r.id);
      if (s) reports.push(buildReport(s));
    }
    downloadText(JSON.stringify(reports, null, 2), `culletiq-all-samples-${new Date().toISOString().slice(0, 10)}.json`);
  }

  return (
    <div>
      <PageHeader
        eyebrow="History"
        title="Sample history"
        description="Analyses saved in this browser (IndexedDB). Select two samples to compare them."
        actions={
          records?.length ? (
            <>
              <Button
                variant="primary"
                disabled={selected.length !== 2}
                onClick={() => router.push(`/compare?a=${selected[0]}&b=${selected[1]}`)}
              >
                <GitCompareArrows aria-hidden className="size-4" />
                Compare selected ({selected.length}/2)
              </Button>
              <Button onClick={exportAll}>
                <Download aria-hidden className="size-4" />
                Export all (JSON)
              </Button>
            </>
          ) : undefined
        }
      />
      {(error || actionError) && (
        <Notice tone="blocking" className="mb-4">
          {error ?? actionError}
        </Notice>
      )}
      {loading ? (
        <Card className="p-10 text-center text-sm text-muted">Loading…</Card>
      ) : !records?.length ? (
        <Card>
          <EmptyState icon={History} title="No saved samples" action={<LinkButton href="/analyse" variant="primary">Analyse a sample</LinkButton>}>
            After analysing an image, choose “Save to history” to keep the result here.
          </EmptyState>
        </Card>
      ) : (
        <ul className="space-y-3">
          {records.map((r) => {
            const isSel = selected.includes(r.id);
            return (
              <li key={r.id}>
                <Card className={isSel ? "border-accent ring-1 ring-accent" : undefined}>
                  <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
                    <label className="flex items-center gap-3 sm:w-auto">
                      <input
                        type="checkbox"
                        checked={isSel}
                        onChange={() => toggle(r.id)}
                        aria-label={`Select ${r.name} for comparison`}
                        className="size-4"
                      />
                      {thumbs[r.id] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={thumbs[r.id]} alt="" className="h-16 w-20 rounded-md object-cover" />
                      ) : (
                        <div className="h-16 w-20 rounded-md bg-surface-2" />
                      )}
                    </label>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link href={`/samples/${r.id}`} className="truncate font-medium text-ink hover:underline">
                          {r.name}
                        </Link>
                        <StatusBadge status={r.result.assessment.status} />
                        <TierBadge tier={r.result.reliability.tier} prefix="Reliability" />
                        {r.source.kind === "demo" && <Badge>Demo image</Badge>}
                        {r.result.anomalies.length > 0 && <Badge tone="action">{r.result.anomalies.length} possible anomalies</Badge>}
                      </div>
                      <p className="mt-0.5 text-xs text-muted">
                        {r.id} · {formatDateTime(r.createdAt)} · {r.source.fileName}
                      </p>
                      <div className="mt-2 max-w-xl">
                        <ProportionBar percentages={r.result.colour.percentages} label={`${r.name} colour distribution`} height={8} compact />
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 sm:justify-end">
                      <LinkButton href={`/samples/${r.id}`}>Open</LinkButton>
                      <LinkButton href={`/samples/${r.id}/report`} variant="ghost">
                        <FileText aria-hidden className="size-4" />
                        Report
                      </LinkButton>
                      {confirming === r.id ? (
                        <span className="flex items-center gap-2" role="group" aria-label="Confirm delete">
                          <Button variant="danger" onClick={() => remove(r.id)}>
                            Confirm delete
                          </Button>
                          <Button variant="ghost" onClick={() => setConfirming(null)}>
                            Cancel
                          </Button>
                        </span>
                      ) : (
                        <Button variant="ghost" onClick={() => setConfirming(r.id)} aria-label={`Delete ${r.name}`}>
                          <Trash2 aria-hidden className="size-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

