import type { AnalysisResult } from "./analysis";

export interface SampleSource {
  kind: "upload" | "demo";
  fileName: string;
  fileType: string;
  fileSizeBytes: number;
  /** Set for demonstration images. */
  demoId?: string;
  /** Set for demonstration images: what the image is and how it was made. */
  demoNote?: string;
}

/** Persisted analysis record. Images live in the ImageStore under the given keys. */
export interface SampleRecord {
  id: string;
  name: string;
  createdAt: string;
  source: SampleSource;
  images: {
    thumbnailKey: string;
    overlayKey: string;
  };
  result: AnalysisResult;
  notes?: string;
}

/** Lightweight listing row. */
export interface SampleSummary {
  id: string;
  name: string;
  createdAt: string;
  sourceKind: SampleSource["kind"];
  status: AnalysisResult["assessment"]["status"];
  tier: AnalysisResult["reliability"]["tier"];
  percentages: AnalysisResult["colour"]["percentages"];
  colourValid: boolean;
  anomalyCount: number;
}

/** Record plus resolved image data URLs. */
export interface LoadedSample {
  record: SampleRecord;
  thumbnailUrl: string | null;
  overlayUrl: string | null;
}
