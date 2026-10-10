"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AlertOctagon, CheckCircle2, FileText, Loader2, Save, ScanSearch } from "lucide-react";
import type { AnalysisResult } from "@/types/analysis";
import type { SampleRecord } from "@/types/sample";
import type { ManifestItem } from "@/lib/demo/manifest";
import { getAnalysisExecutor } from "@/lib/analysis/executor";
import { mainClassShares, MAIN_CLASSES } from "@/lib/analysis/evaluation";
import {
  decodeImageFile,
  fetchDemoFile,
  imageToDataUrl,
  overlayToDataUrl,
  type DecodedImage,
} from "@/lib/browser/image";
import { getSampleService, isPersistent } from "@/lib/storage";
import { CLASS_STYLE } from "@/lib/classes";
import { Badge, Button, Card, CardHeader, LinkButton, Notice, PageHeader, ProgressBar } from "@/components/ui";
import { ResultsView } from "@/components/results/ResultsView";
import { Dropzone } from "./Dropzone";
import { DemoGallery } from "./DemoGallery";
import { DEFAULT_SETTINGS, SettingsPanel, settingsToConfig, type AnalysisSettings } from "./SettingsPanel";

type Phase = "empty" | "decoding" | "ready" | "analysing" | "done" | "error";

const STAGE_LABEL: Record<string, string> = {
  preprocess: "Preprocessing and measuring image quality",
  background: "Separating background and balancing white",
  colour: "Categorising pixel colours",
  regions: "Building SLIC regions",
  segmentation: "Segmenting fragments",
  screening: "Screening for possible anomalies",
  assessment: "Applying inspection rules",
};

interface Output {
  result: AnalysisResult;
  overlayUrl: string;
  thumbnailUrl: string;
  settings: AnalysisSettings;
}

export function AnalyseWorkspace() {
  const [phase, setPhase] = useState<Phase>("empty");
  const [error, setError] = useState<string | null>(null);
  const [decoded, setDecoded] = useState<DecodedImage | null>(null);
  const [fileInfo, setFileInfo] = useState<{ name: string; type: string; size: number } | null>(null);
  const [demo, setDemo] = useState<ManifestItem | null>(null);
  const [settings, setSettings] = useState<AnalysisSettings>(DEFAULT_SETTINGS);
  const [progress, setProgress] = useState<{ stage: string; fraction: number }>({ stage: "preprocess", fraction: 0 });
  const [output, setOutput] = useState<Output | null>(null);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState<SampleRecord | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<string | null>(null);

  useEffect(
    () => () => {
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    },
    [],
  );

  const busy = phase === "decoding" || phase === "analysing";

  async function loadFile(file: File, demoItem: ManifestItem | null = null) {
    setPhase("decoding");
    setError(null);
    setOutput(null);
    setSaved(null);
    setSaveError(null);
    try {
      const d = await decodeImageFile(file);
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
      previewRef.current = d.previewUrl;
      setDecoded(d);
      setFileInfo({ name: file.name, type: file.type, size: file.size });
      setDemo(demoItem);
      setName(demoItem ? demoItem.title : file.name.replace(/\.[^.]+$/, ""));
      setPhase("ready");
    } catch (e) {
      setError(e instanceof Error ? e.message : "The image could not be read.");
      setPhase(decoded ? "ready" : "error");
    }
  }

  async function pickDemo(item: ManifestItem) {
    try {
      const file = await fetchDemoFile(`/demo/${item.file}`, item.file.split("/").pop() ?? item.file);
      await loadFile(file, item);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load the demonstration image.");
    }
  }

  async function analyse() {
    if (!decoded) return;
    setPhase("analysing");
    setError(null);
    setSaved(null);
    setProgress({ stage: "preprocess", fraction: 0 });
    try {
      const out = await getAnalysisExecutor().analyse({
        image: decoded.image,
        config: settingsToConfig(settings),
        originalSize: decoded.originalSize,
        onProgress: (stage, fraction) => setProgress({ stage, fraction }),
      });
      const overlayUrl = overlayToDataUrl(out.labelMap, out.boundaryMask, out.width, out.height);
      const thumbnailUrl = imageToDataUrl(decoded.image, 960);
      setOutput({ result: out.result, overlayUrl, thumbnailUrl, settings });
      setPhase("done");
      requestAnimationFrame(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analysis failed.");
      setPhase("ready");
    }
  }

  async function save() {
    if (!output || !fileInfo) return;
    setSaving(true);
    setSaveError(null);
    try {
      const record = await getSampleService().save({
        name: name.trim() || "Untitled sample",
        source: {
          kind: demo ? "demo" : "upload",
          fileName: fileInfo.name,
          fileType: fileInfo.type,
          fileSizeBytes: fileInfo.size,
          demoId: demo?.id,
          demoNote: demo
            ? `${demo.synthetic ? "SYNTHETIC image (drawn by code, not a photograph)." : "Real photograph."} ${demo.description}${demo.attribution ? ` Photo: ${demo.attribution.author}, ${demo.attribution.license} (${demo.attribution.source}).` : ""}`
            : undefined,
        },
        result: output.result,
        thumbnailDataUrl: output.thumbnailUrl,
        overlayDataUrl: output.overlayUrl,
      });
      setSaved(record);
    } catch (e) {
      setSaveError(
        e instanceof Error ? `Could not save: ${e.message}` : "Could not save the sample (browser storage may be full or blocked).",
      );
    } finally {
      setSaving(false);
    }
  }

  const settingsStale = output && JSON.stringify(output.settings) !== JSON.stringify(settings);

  return (
    <div>
      <PageHeader
        eyebrow="Sample analysis"
        title="Analyse a cullet sample"
        description="Upload a photo of crushed or broken glass. The image is processed entirely in your browser — nothing is uploaded to a server."
      />

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-4 lg:col-span-3">
          <Dropzone
            onFile={(f) => loadFile(f)}
            previewUrl={decoded?.previewUrl ?? null}
            fileLabel={
              fileInfo
                ? `${fileInfo.name} · ${decoded?.originalSize.width}×${decoded?.originalSize.height} px · ${(fileInfo.size / 1024).toFixed(0)} KB`
                : undefined
            }
            disabled={busy}
          />
          {demo && (
            <Notice tone={demo.synthetic ? "caution" : "accent"} title={demo.synthetic ? "Synthetic demonstration image" : "Real demonstration photograph"}>
              {demo.description} <span className="text-muted">Known limitations: {demo.limitations}</span>
            </Notice>
          )}
          {error && (
            <Notice tone="blocking" icon={AlertOctagon} title="Problem with this image">
              {error}
            </Notice>
          )}
        </div>

        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader title="Run analysis" />
            <div className="space-y-4 p-5">
              {phase === "analysing" ? (
                <div aria-live="polite">
                  <ProgressBar value={progress.fraction} label={STAGE_LABEL[progress.stage] ?? "Analysing"} />
                </div>
              ) : (
                <p className="text-sm text-muted">
                  {decoded
                    ? settingsStale
                      ? "Settings changed since the last run — analyse again to apply them."
                      : phase === "done"
                        ? "Analysis complete. Results are below."
                        : "Ready. Review the settings if needed, then analyse."
                    : "Choose an image or a demonstration image to begin."}
                </p>
              )}
              <Button variant="primary" className="w-full" onClick={analyse} disabled={!decoded || busy}>
                {phase === "analysing" || phase === "decoding" ? (
                  <Loader2 aria-hidden className="size-4 animate-spin" />
                ) : (
                  <ScanSearch aria-hidden className="size-4" />
                )}
                {phase === "decoding" ? "Reading image…" : phase === "analysing" ? "Analysing…" : phase === "done" ? "Analyse again" : "Analyse sample"}
              </Button>
              <SettingsPanel value={settings} onChange={setSettings} />
            </div>
          </Card>
          <Card>
            <CardHeader title="For a more useful photo" />
            <ul className="list-disc space-y-1.5 py-4 pl-9 pr-5 text-sm text-ink-2">
              <li>Diffuse, even light; avoid direct flash and strong shadows.</li>
              <li>A plain, matte background that is not white, grey or glass-coloured (e.g. blue) helps separate clear glass.</li>
              <li>Spread fragments in one layer so they do not overlap.</li>
              <li>Shoot from directly above, in focus, ≥1000 px on the shorter side.</li>
              <li>Backlighting helps dark glass show its colour.</li>
            </ul>
          </Card>
        </div>
      </div>

      {output && (
        <div ref={resultsRef} className="mt-10 scroll-mt-20">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4 border-t border-line pt-8">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-accent">Analysis results</p>
              <h2 className="text-xl font-semibold text-ink">{name || "Untitled sample"}</h2>
              <p className="text-xs text-muted">
                {output.result.algorithm.name} · v{output.result.algorithm.version} · {output.result.timingsMs.total} ms
              </p>
            </div>
            <Card className="w-full p-4 sm:w-auto">
              {saved ? (
                <div className="flex flex-wrap items-center gap-3">
                  <Badge tone="good" icon={CheckCircle2}>
                    Saved as {saved.id}
                  </Badge>
                  <LinkButton href={`/samples/${saved.id}`}>Open saved record</LinkButton>
                  <LinkButton href={`/samples/${saved.id}/report`} variant="primary">
                    <FileText aria-hidden className="size-4" />
                    Report
                  </LinkButton>
                </div>
              ) : (
                <form
                  className="flex flex-wrap items-end gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void save();
                  }}
                >
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-muted">Sample name</span>
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      maxLength={120}
                      required
                      className="w-60 rounded-lg border border-line-strong bg-surface px-3 py-2 text-sm"
                    />
                  </label>
                  <Button type="submit" variant="primary" disabled={saving || !name.trim()}>
                    {saving ? <Loader2 aria-hidden className="size-4 animate-spin" /> : <Save aria-hidden className="size-4" />}
                    Save to history
                  </Button>
                </form>
              )}
              {saveError && <p className="mt-2 text-sm text-blocking">{saveError}</p>}
              {!isPersistent() && <p className="mt-2 text-xs text-caution">Browser storage unavailable: saved samples last only until reload.</p>}
            </Card>
          </div>

          {demo && <DemoTruthPanel demo={demo} result={output.result} />}

          <ResultsView result={output.result} imageUrl={output.thumbnailUrl} overlayUrl={output.overlayUrl} />
        </div>
      )}

      <Card className="mt-10">
        <CardHeader
          title="No sample image? Use a demonstration image"
          subtitle="Clearly labelled real photographs and synthetic scenes. The analysis runs on them exactly as on your own photo."
        />
        <div className="p-5">
          <DemoGallery onPick={pickDemo} disabled={busy} activeId={demo?.id} />
        </div>
      </Card>
      <p className="mt-4 text-xs text-muted">
        Real demonstration photos: Alter Fritz, Wikimedia Commons, CC BY-SA 3.0 — see <Link className="underline" href="/methodology#data">Methodology → Data</Link>.
      </p>
    </div>
  );
}

/** Shows illustrative ground truth for demo images, clearly separated from the analysis. */
function DemoTruthPanel({ demo, result }: { demo: ManifestItem; result: AnalysisResult }) {
  const est = mainClassShares(result.colour);
  if (demo.groundTruth) {
    return (
      <Card className="mb-6 border-caution/40">
        <CardHeader
          title="Illustrative comparison with drawn ground truth"
          subtitle="Synthetic image: ground truth is the drawn pixel area per class (clear/green/brown only). Estimate renormalised over the same three classes, ignoring other/uncertain."
          action={<Badge tone="caution">SYNTHETIC — not evidence of real-world accuracy</Badge>}
        />
        <div className="overflow-x-auto p-5">
          <table className="w-full max-w-lg text-sm">
            <thead>
              <tr className="text-left text-xs text-muted">
                <th className="pb-2 font-medium">Class</th>
                <th className="pb-2 text-right font-medium">Drawn area</th>
                <th className="pb-2 text-right font-medium">Estimate</th>
                <th className="pb-2 text-right font-medium">Difference</th>
              </tr>
            </thead>
            <tbody>
              {MAIN_CLASSES.map((c) => (
                <tr key={c} className="border-t border-line/70">
                  <td className="py-1.5">{CLASS_STYLE[c].label}</td>
                  <td className="tabular py-1.5 text-right">{demo.groundTruth!.percent[c].toFixed(1)}%</td>
                  <td className="tabular py-1.5 text-right">{est ? `${est[c].toFixed(1)}%` : "—"}</td>
                  <td className="tabular py-1.5 text-right">
                    {est ? `${est[c] - demo.groundTruth!.percent[c] >= 0 ? "+" : ""}${(est[c] - demo.groundTruth!.percent[c]).toFixed(1)} pp` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    );
  }
  if (demo.expectation) {
    return (
      <Notice className="mb-6" tone="accent" title="Illustrative expectation (not measured)">
        {demo.expectation} The photo has no measured composition, so no error can be computed.
      </Notice>
    );
  }
  return null;
}
