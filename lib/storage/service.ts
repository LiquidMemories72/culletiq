/** Sample persistence service: combines record and image storage behind one API. */
import type { AnalysisResult } from "@/types/analysis";
import type { LoadedSample, SampleRecord, SampleSource, SampleSummary } from "@/types/sample";
import type { ImageStore, SampleRepository } from "./types";

export interface SaveSampleInput {
  name: string;
  source: SampleSource;
  result: AnalysisResult;
  thumbnailDataUrl: string;
  overlayDataUrl: string;
  notes?: string;
}

export function createSampleId(now = new Date()): string {
  const stamp = now.toISOString().slice(0, 10).replace(/-/g, "");
  const rand =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(16).slice(2, 10);
  return `S-${stamp}-${rand.toUpperCase()}`;
}

export function toSummary(r: SampleRecord): SampleSummary {
  return {
    id: r.id,
    name: r.name,
    createdAt: r.createdAt,
    sourceKind: r.source.kind,
    status: r.result.assessment.status,
    tier: r.result.reliability.tier,
    percentages: r.result.colour.percentages,
    colourValid: r.result.colour.valid && r.result.reliability.tier !== "unsuitable",
    anomalyCount: r.result.anomalies.length,
  };
}

export class SampleService {
  constructor(
    private readonly repo: SampleRepository,
    private readonly images: ImageStore,
  ) {}

  async save(input: SaveSampleInput, now = new Date()): Promise<SampleRecord> {
    if (!input.name.trim()) throw new Error("Sample name is required.");
    const id = createSampleId(now);
    const record: SampleRecord = {
      id,
      name: input.name.trim(),
      createdAt: now.toISOString(),
      source: input.source,
      images: { thumbnailKey: `${id}/thumbnail`, overlayKey: `${id}/overlay` },
      result: input.result,
      notes: input.notes,
    };
    await this.images.put(record.images.thumbnailKey, input.thumbnailDataUrl);
    await this.images.put(record.images.overlayKey, input.overlayDataUrl);
    try {
      await this.repo.put(record);
    } catch (err) {
      // Do not leave orphaned images if the record write fails.
      await this.images.delete(record.images.thumbnailKey).catch(() => undefined);
      await this.images.delete(record.images.overlayKey).catch(() => undefined);
      throw err;
    }
    return record;
  }

  /** All records, newest first. */
  async listRecords(): Promise<SampleRecord[]> {
    const all = await this.repo.list();
    return all.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async listSummaries(): Promise<SampleSummary[]> {
    return (await this.listRecords()).map(toSummary);
  }

  async load(id: string): Promise<LoadedSample | null> {
    const record = await this.repo.get(id);
    if (!record) return null;
    const [thumbnailUrl, overlayUrl] = await Promise.all([
      this.images.get(record.images.thumbnailKey),
      this.images.get(record.images.overlayKey),
    ]);
    return { record, thumbnailUrl, overlayUrl };
  }

  async rename(id: string, name: string): Promise<void> {
    const record = await this.repo.get(id);
    if (!record) throw new Error(`Sample ${id} not found.`);
    if (!name.trim()) throw new Error("Sample name is required.");
    await this.repo.put({ ...record, name: name.trim() });
  }

  async remove(id: string): Promise<void> {
    const record = await this.repo.get(id);
    if (!record) return;
    await this.repo.delete(id);
    await Promise.all([this.images.delete(record.images.thumbnailKey), this.images.delete(record.images.overlayKey)]);
  }
}
