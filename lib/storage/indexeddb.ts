/** IndexedDB implementations (browser only). */
import type { SampleRecord } from "@/types/sample";
import type { ImageStore, SampleRepository } from "./types";

const DB_NAME = "culletiq";
const DB_VERSION = 1;
const SAMPLES = "samples";
const IMAGES = "images";

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB is not available in this browser."));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(SAMPLES)) db.createObjectStore(SAMPLES, { keyPath: "id" });
      if (!db.objectStoreNames.contains(IMAGES)) db.createObjectStore(IMAGES);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("Failed to open IndexedDB."));
    req.onblocked = () => reject(new Error("IndexedDB upgrade blocked by another open tab."));
  });
  dbPromise.catch(() => {
    dbPromise = null;
  });
  return dbPromise;
}

function run<T>(store: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(store, mode);
        const req = fn(tx.objectStore(store));
        let result: T;
        req.onsuccess = () => {
          result = req.result;
        };
        tx.oncomplete = () => resolve(result);
        tx.onerror = () => reject(tx.error ?? req.error ?? new Error("IndexedDB transaction failed."));
        tx.onabort = () => reject(tx.error ?? new Error("IndexedDB transaction aborted (storage may be full)."));
      }),
  );
}

export class IndexedDbSampleRepository implements SampleRepository {
  list() {
    return run<SampleRecord[]>(SAMPLES, "readonly", (s) => s.getAll());
  }
  async get(id: string) {
    return (await run<SampleRecord | undefined>(SAMPLES, "readonly", (s) => s.get(id))) ?? null;
  }
  async put(record: SampleRecord) {
    await run(SAMPLES, "readwrite", (s) => s.put(record));
  }
  async delete(id: string) {
    await run(SAMPLES, "readwrite", (s) => s.delete(id));
  }
}

export class IndexedDbImageStore implements ImageStore {
  async put(key: string, dataUrl: string) {
    await run(IMAGES, "readwrite", (s) => s.put(dataUrl, key));
  }
  async get(key: string) {
    return (await run<string | undefined>(IMAGES, "readonly", (s) => s.get(key))) ?? null;
  }
  async delete(key: string) {
    await run(IMAGES, "readwrite", (s) => s.delete(key));
  }
}
