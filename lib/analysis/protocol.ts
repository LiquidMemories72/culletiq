/** Messages exchanged with the analysis Web Worker. */
import type { AnalysisConfig, PipelineOutput } from "@/types/analysis";
import type { DeepPartial } from "@/lib/vision/config";

export interface AnalyseRequest {
  type: "analyse";
  id: number;
  width: number;
  height: number;
  buffer: ArrayBuffer;
  config?: DeepPartial<AnalysisConfig>;
  originalSize?: { width: number; height: number };
}

export type WorkerMessage =
  | { type: "progress"; id: number; stage: string; fraction: number }
  | { type: "result"; id: number; output: PipelineOutput }
  | { type: "error"; id: number; message: string; validation: boolean };
