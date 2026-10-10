"use client";

import { useRef, useState, type DragEvent } from "react";
import { ImageUp, RefreshCw } from "lucide-react";
import { MAX_FILE_BYTES } from "@/lib/vision/preprocess";
import { Button, cx } from "@/components/ui";

export function Dropzone({
  onFile,
  previewUrl,
  fileLabel,
  disabled,
}: {
  onFile: (file: File) => void;
  previewUrl: string | null;
  fileLabel?: string;
  disabled?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  const pick = () => input.current?.click();
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setOver(false);
    if (disabled) return;
    const f = e.dataTransfer.files?.[0];
    if (f) onFile(f);
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={onDrop}
      className={cx(
        "relative rounded-xl border-2 border-dashed transition-colors",
        over ? "border-accent bg-accent-soft" : "border-line-strong bg-surface",
      )}
    >
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = "";
        }}
      />
      {previewUrl ? (
        <div className="p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={previewUrl} alt="Selected sample preview" className="mx-auto max-h-[420px] w-auto rounded-lg object-contain" />
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 px-1">
            <p className="min-w-0 truncate text-sm text-ink-2" title={fileLabel}>
              {fileLabel}
            </p>
            <Button onClick={pick} disabled={disabled} variant="ghost">
              <RefreshCw aria-hidden className="size-4" />
              Replace image
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center px-6 py-14 text-center">
          <div className="mb-4 rounded-full bg-accent-soft p-3.5 text-accent">
            <ImageUp aria-hidden className="size-6" />
          </div>
          <p className="text-base font-medium text-ink">Drop a photo of crushed glass here</p>
          <p className="mt-1 text-sm text-muted">
            JPEG, PNG or WebP, up to {MAX_FILE_BYTES / 1024 / 1024} MB. Even, diffuse light and a plain background work best.
          </p>
          <Button variant="primary" className="mt-5" onClick={pick} disabled={disabled}>
            Choose file
          </Button>
        </div>
      )}
    </div>
  );
}
