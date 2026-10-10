"use client";

import { useCallback, useEffect, useState } from "react";
import type { LoadedSample, SampleRecord } from "@/types/sample";
import { getSampleService } from "@/lib/storage";

export function useSampleRecords() {
  const [records, setRecords] = useState<SampleRecord[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setRecords(await getSampleService().listRecords());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read saved samples.");
      setRecords([]);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { records, loading: records === null, error, refresh };
}

export function useLoadedSample(id: string | undefined) {
  const [sample, setSample] = useState<LoadedSample | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    getSampleService()
      .load(id)
      .then((s) => !cancelled && setSample(s))
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Could not load the sample.");
        setSample(null);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  return { sample, loading: sample === undefined, error };
}

/** Load thumbnails for a set of records (id → data URL). */
export function useThumbnails(records: SampleRecord[] | null) {
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  useEffect(() => {
    if (!records?.length) return;
    let cancelled = false;
    void Promise.all(
      records.map(async (r) => {
        const s = await getSampleService().load(r.id).catch(() => null);
        return [r.id, s?.thumbnailUrl ?? ""] as const;
      }),
    ).then((pairs) => {
      if (!cancelled) setThumbs(Object.fromEntries(pairs.filter(([, v]) => v)));
    });
    return () => {
      cancelled = true;
    };
  }, [records]);
  return thumbs;
}
