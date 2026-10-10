/**
 * Analysis execution interface. Locally the pipeline runs in a Web Worker
 * (or inline as a fallback). A cloud deployment could implement the same
 * interface by uploading the image and invoking a Lambda/container endpoint.
 */
import type { AnalysisConfig, PipelineOutput, ProgressCallback, RgbaImage } from "@/types/analysis";
import type { DeepPartial } from "@/lib/vision/config";
import { ImageValidationError, runPipeline } from "./pipeline";
import type { AnalyseRequest, WorkerMessage } from "./protocol";

export interface AnalysisRequest {
  image: RgbaImage;
  config?: DeepPartial<AnalysisConfig>;
  originalSize?: { width: number; height: number };
  onProgress?: ProgressCallback;
}

export interface AnalysisExecutor {
  analyse(req: AnalysisRequest): Promise<PipelineOutput>;
}

/** Runs on the calling thread. Used in tests and when Workers are unavailable. */
export class InlineAnalysisExecutor implements AnalysisExecutor {
  async analyse(req: AnalysisRequest): Promise<PipelineOutput> {
    // Yield once so the UI can paint the loading state.
    await new Promise((r) => setTimeout(r, 0));
    return runPipeline(req.image, req.config, req.onProgress, req.originalSize);
  }
}

export class WorkerAnalysisExecutor implements AnalysisExecutor {
  private worker: Worker | null = null;
  private nextId = 1;

  private getWorker(): Worker {
    if (!this.worker) {
      this.worker = new Worker(new URL("./analysis.worker.ts", import.meta.url), { type: "module" });
    }
    return this.worker;
  }

  analyse(req: AnalysisRequest): Promise<PipelineOutput> {
    const worker = this.getWorker();
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      const onMessage = (e: MessageEvent<WorkerMessage>) => {
        const m = e.data;
        if (m.id !== id) return;
        if (m.type === "progress") {
          req.onProgress?.(m.stage, m.fraction);
          return;
        }
        worker.removeEventListener("message", onMessage);
        worker.removeEventListener("error", onError);
        if (m.type === "result") resolve(m.output);
        else reject(m.validation ? new ImageValidationError(m.message) : new Error(m.message));
      };
      const onError = (e: ErrorEvent) => {
        worker.removeEventListener("message", onMessage);
        worker.removeEventListener("error", onError);
        this.worker?.terminate();
        this.worker = null;
        reject(new Error(e.message || "The analysis worker failed."));
      };
      worker.addEventListener("message", onMessage);
      worker.addEventListener("error", onError);
      // Copy so the caller keeps its pixels; transfer the copy.
      const copy = new Uint8ClampedArray(req.image.data);
      const msg: AnalyseRequest = {
        type: "analyse",
        id,
        width: req.image.width,
        height: req.image.height,
        buffer: copy.buffer,
        config: req.config,
        originalSize: req.originalSize,
      };
      worker.postMessage(msg, [copy.buffer]);
    });
  }
}

let shared: AnalysisExecutor | null = null;

/** Prefer the worker; fall back to inline if the worker cannot start. */
export function getAnalysisExecutor(): AnalysisExecutor {
  if (shared) return shared;
  const inline = new InlineAnalysisExecutor();
  if (typeof Worker === "undefined") {
    shared = inline;
    return shared;
  }
  const worker = new WorkerAnalysisExecutor();
  shared = {
    async analyse(req) {
      try {
        return await worker.analyse(req);
      } catch (err) {
        if (err instanceof ImageValidationError) throw err;
        console.warn("Worker analysis failed; retrying on main thread.", err);
        return inline.analyse(req);
      }
    },
  };
  return shared;
}
