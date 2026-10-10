"use client";

import { useEffect, useState } from "react";
import { Camera, Shapes } from "lucide-react";
import type { DemoManifest, ManifestItem } from "@/lib/demo/manifest";
import { Badge, Button, cx } from "@/components/ui";

export function useDemoManifest() {
  const [manifest, setManifest] = useState<DemoManifest | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    fetch("/demo/manifest.json")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then(setManifest)
      .catch((e) => setError(`Demonstration images unavailable (${e.message}). Run "npm run demo:generate".`));
  }, []);
  return { manifest, error };
}

export function DemoGallery({
  onPick,
  disabled,
  activeId,
}: {
  onPick: (item: ManifestItem) => void;
  disabled?: boolean;
  activeId?: string;
}) {
  const { manifest, error } = useDemoManifest();
  if (error) return <p className="text-sm text-muted">{error}</p>;
  if (!manifest) return <p className="text-sm text-muted">Loading demonstration images…</p>;

  const groups: { title: string; icon: typeof Camera; items: ManifestItem[]; note: string }[] = [
    {
      title: "Real photographs",
      icon: Camera,
      items: manifest.items.filter((i) => !i.synthetic),
      note: "Openly licensed photos of hand-sorted cullet (CC BY-SA 3.0). No measured composition exists for them.",
    },
    {
      title: "Synthetic scenes",
      icon: Shapes,
      items: manifest.items.filter((i) => i.synthetic),
      note: "Drawn by code, not photographed. Their 'ground truth' is drawn pixel area — useful for testing, not evidence of real-world accuracy.",
    },
  ];

  return (
    <div className="space-y-6">
      {groups.map((g) => (
        <section key={g.title} aria-label={g.title}>
          <div className="mb-2 flex items-center gap-2">
            <g.icon aria-hidden className="size-4 text-muted" />
            <h3 className="text-sm font-semibold text-ink">{g.title}</h3>
          </div>
          <p className="mb-3 text-xs text-muted">{g.note}</p>
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {g.items.map((item) => (
              <li
                key={item.id}
                className={cx(
                  "flex flex-col overflow-hidden rounded-lg border bg-surface",
                  activeId === item.id ? "border-accent ring-1 ring-accent" : "border-line",
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/demo/${item.file}`} alt="" loading="lazy" className="aspect-[4/3] w-full object-cover" />
                <div className="flex flex-1 flex-col p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-ink">{item.title}</p>
                    <Badge tone={item.synthetic ? "caution" : "accent"}>{item.synthetic ? "SYNTHETIC" : "REAL PHOTO"}</Badge>
                  </div>
                  <p className="mt-1 line-clamp-3 text-xs text-muted">{item.limitations}</p>
                  {item.attribution && (
                    <p className="mt-1 text-[11px] text-muted">
                      Photo: {item.attribution.author},{" "}
                      <a className="underline" href={item.attribution.licenseUrl} target="_blank" rel="noreferrer">
                        {item.attribution.license}
                      </a>
                    </p>
                  )}
                  <Button className="mt-3 w-full" onClick={() => onPick(item)} disabled={disabled}>
                    Use this image
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
