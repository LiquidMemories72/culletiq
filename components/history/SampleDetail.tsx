"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, Download, FileQuestion, FileText, GitCompareArrows, Trash2 } from "lucide-react";
import { useLoadedSample } from "@/lib/hooks";
import { getSampleService } from "@/lib/storage";
import { buildReport, reportFileName, reportToJson } from "@/lib/reports/report";
import { downloadText } from "@/lib/browser/image";
import { ResultsView } from "@/components/results/ResultsView";
import { Button, Card, EmptyState, LinkButton, Notice, PageHeader, formatDateTime } from "@/components/ui";

export function SampleDetail() {
  const { id } = useParams<{ id: string }>();
  const { sample, loading, error } = useLoadedSample(id);
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);

  if (loading) return <Card className="p-10 text-center text-sm text-muted">Loading sample…</Card>;
  if (!sample) {
    return (
      <Card>
        <EmptyState
          icon={FileQuestion}
          title="Sample not found"
          action={<LinkButton href="/samples">Back to history</LinkButton>}
        >
          {error ?? `No saved sample with ID ${id} exists in this browser. It may have been deleted.`}
        </EmptyState>
      </Card>
    );
  }

  const { record } = sample;
  const exportJson = () => {
    const report = buildReport(sample, { includeImages: true });
    downloadText(reportToJson(report), reportFileName(report, "json"));
  };

  return (
    <div>
      <LinkButton href="/samples" variant="ghost" className="-ml-3 mb-2">
        <ArrowLeft aria-hidden className="size-4" />
        Sample history
      </LinkButton>
      <PageHeader
        eyebrow={record.id}
        title={record.name}
        description={
          <>
            Analysed {formatDateTime(record.createdAt)} · {record.source.fileName} · {record.result.algorithm.name} v
            {record.result.algorithm.version}
          </>
        }
        actions={
          <>
            <LinkButton href={`/samples/${record.id}/report`} variant="primary">
              <FileText aria-hidden className="size-4" />
              Printable report
            </LinkButton>
            <Button onClick={exportJson}>
              <Download aria-hidden className="size-4" />
              Export JSON
            </Button>
            <LinkButton href={`/compare?a=${record.id}`}>
              <GitCompareArrows aria-hidden className="size-4" />
              Compare
            </LinkButton>
            {confirm ? (
              <Button
                variant="danger"
                onClick={async () => {
                  await getSampleService().remove(record.id);
                  router.push("/samples");
                }}
              >
                Confirm delete
              </Button>
            ) : (
              <Button variant="ghost" onClick={() => setConfirm(true)} aria-label="Delete sample">
                <Trash2 aria-hidden className="size-4" />
              </Button>
            )}
          </>
        }
      />
      {record.source.demoNote && (
        <Notice tone="caution" className="mb-6" title="Demonstration image">
          {record.source.demoNote}
        </Notice>
      )}
      <ResultsView result={record.result} imageUrl={sample.thumbnailUrl} overlayUrl={sample.overlayUrl} />
    </div>
  );
}
