/// <reference lib="webworker" />
import { ImageValidationError, runPipeline } from "./pipeline";
import type { AnalyseRequest, WorkerMessage } from "./protocol";

const ctx = self as unknown as DedicatedWorkerGlobalScope;

ctx.onmessage = (event: MessageEvent<AnalyseRequest>) => {
  const req = event.data;
  if (req?.type !== "analyse") return;
  const post = (m: WorkerMessage, transfer: Transferable[] = []) => ctx.postMessage(m, transfer);
  try {
    const output = runPipeline(
      { width: req.width, height: req.height, data: new Uint8ClampedArray(req.buffer) },
      req.config,
      (stage, fraction) => post({ type: "progress", id: req.id, stage, fraction }),
      req.originalSize,
    );
    post({ type: "result", id: req.id, output }, [output.labelMap.buffer, output.boundaryMask.buffer]);
  } catch (err) {
    post({
      type: "error",
      id: req.id,
      message: err instanceof Error ? err.message : String(err),
      validation: err instanceof ImageValidationError,
    });
  }
};
