"use client";

import { IndexedDbImageStore, IndexedDbSampleRepository } from "./indexeddb";
import { InMemoryImageStore, InMemorySampleRepository } from "./memory";
import { SampleService } from "./service";

let service: SampleService | null = null;
let persistent = true;

/** Browser-wide sample service. Falls back to memory (lost on reload) if IndexedDB is unavailable. */
export function getSampleService(): SampleService {
  if (service) return service;
  if (typeof indexedDB !== "undefined") {
    service = new SampleService(new IndexedDbSampleRepository(), new IndexedDbImageStore());
  } else {
    persistent = false;
    service = new SampleService(new InMemorySampleRepository(), new InMemoryImageStore());
  }
  return service;
}

export function isPersistent(): boolean {
  return persistent;
}

export { SampleService } from "./service";
