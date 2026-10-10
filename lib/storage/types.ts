/**
 * Persistence interfaces. Local implementations use IndexedDB (browser) or
 * memory (tests). A cloud deployment would implement the same interfaces, e.g.
 * SampleRepository → DynamoDB via an API, ImageStore → S3 via pre-signed URLs.
 */
import type { SampleRecord } from "@/types/sample";

export interface SampleRepository {
  list(): Promise<SampleRecord[]>;
  get(id: string): Promise<SampleRecord | null>;
  put(record: SampleRecord): Promise<void>;
  delete(id: string): Promise<void>;
}

/** Stores image payloads (data URLs locally; object keys in a cloud store). */
export interface ImageStore {
  put(key: string, dataUrl: string): Promise<void>;
  get(key: string): Promise<string | null>;
  delete(key: string): Promise<void>;
}
