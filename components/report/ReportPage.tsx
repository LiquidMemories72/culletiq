"use client";

import { useParams } from "next/navigation";
import { ArrowLeft, Download, Printer } from "lucide-react";
import { useLoadedSample } from "@/lib/hooks";
import { buildReport, reportFileName, reportToJson } from "@/lib/reports/report";
import { downloadText } from "@/lib/browser/image";
import { Button, LinkButton } from "@/components/ui";
import { ReportDocument } from "./ReportDocument";

export function ReportPage() {
  const { id } = useParams<{ id: string }>();
  const { sample, loading, error } = useLoadedSample(id);

  if (loading) return <p className="p-10 text-center text-sm text-muted">Loading report…</p>;
  if (!sample) {
    return (
      <div className="p-10 text-center">
        <p className="text-sm text-muted">{error ?? `Sample ${id} not found in this browser.`}</p>
        <LinkButton href="/samples" className="mt-4">
          Back to history
        </LinkButton>
      </div>
    );
  }

  const report = buildReport(sample);

  return (
    <div className="min-h-dvh bg-canvas print:bg-white">
      <div className="no-print sticky top-0 z-10 border-b border-line bg-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-2 px-4 py-3">
          <LinkButton href={`/samples/${id}`} variant="ghost">
            <ArrowLeft aria-hidden className="size-4" />
            Back to sample
          </LinkButton>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => {
                const full = buildReport(sample, { includeImages: true });
                downloadText(reportToJson(full), reportFileName(full, "json"));
              }}
            >
              <Download aria-hidden className="size-4" />
              JSON
            </Button>
            <Button variant="primary" onClick={() => window.print()}>
              <Printer aria-hidden className="size-4" />
              Print / Save as PDF
            </Button>
          </div>
        </div>
      </div>
      <div className="mx-auto max-w-4xl px-4 py-8 print:p-0">
        <ReportDocument report={report} thumbnailUrl={sample.thumbnailUrl} overlayUrl={sample.overlayUrl} />
      </div>
    </div>
  );
}
