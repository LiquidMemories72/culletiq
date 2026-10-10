import type { SampleRecord } from "@/types/sample";
import type { ImageStore, SampleRepository } from "./types";

export class InMemorySampleRepository implements SampleRepository {
  private items = new Map<string, SampleRecord>();
  async list() {
    return [...this.items.values()].map((r) => structuredClone(r));
  }
  async get(id: string) {
    const r = this.items.get(id);
    return r ? structuredClone(r) : null;
  }
  async put(record: SampleRecord) {
    this.items.set(record.id, structuredClone(record));
  }
  async delete(id: string) {
    this.items.delete(id);
  }
}

export class InMemoryImageStore implements ImageStore {
  private items = new Map<string, string>();
  async put(key: string, dataUrl: string) {
    this.items.set(key, dataUrl);
  }
  async get(key: string) {
    return this.items.get(key) ?? null;
  }
  async delete(key: string) {
    this.items.delete(key);
  }
  get size() {
    return this.items.size;
  }
}
