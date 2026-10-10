import type { AnalysisResult, RgbaImage } from "@/types/analysis";
import type { SampleRecord } from "@/types/sample";
import { runPipeline } from "@/lib/analysis/pipeline";
import { DEMO_SCENES, generateScene, type SceneSpec } from "@/lib/demo/synthetic";

/** Solid-colour image, optionally with a differently coloured centred rectangle. */
export function solidImage(
  w: number,
  h: number,
  rgb: [number, number, number],
  rect?: { rgb: [number, number, number]; x: number; y: number; w: number; h: number },
): RgbaImage {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const inRect = rect && x >= rect.x && x < rect.x + rect.w && y >= rect.y && y < rect.y + rect.h;
      const c = inRect ? rect!.rgb : rgb;
      const p = (y * w + x) * 4;
      data[p] = c[0];
      data[p + 1] = c[1];
      data[p + 2] = c[2];
      data[p + 3] = 255;
    }
  }
  return { width: w, height: h, data };
}

export function smallScene(id: string, overrides: Partial<SceneSpec> = {}) {
  const base = DEMO_SCENES.find((s) => s.id === id);
  if (!base) throw new Error(`unknown scene ${id}`);
  return generateScene({ ...base, width: 480, height: 360, ...overrides });
}

const cache = new Map<string, AnalysisResult>();
export function resultFor(id: string): AnalysisResult {
  if (!cache.has(id)) cache.set(id, runPipeline(smallScene(id).image).result);
  return structuredClone(cache.get(id)!);
}

export function makeRecord(id: string, sceneId: string, createdAt: string, name = id): SampleRecord {
  return {
    id,
    name,
    createdAt,
    source: { kind: "demo", fileName: `${sceneId}.jpg`, fileType: "image/jpeg", fileSizeBytes: 1000, demoId: sceneId },
    images: { thumbnailKey: `${id}/thumbnail`, overlayKey: `${id}/overlay` },
    result: resultFor(sceneId),
  };
}
