"use client";

import { useId, useState } from "react";
import type { Anomaly, Fragment } from "@/types/analysis";
import { CLASS_STYLE } from "@/lib/classes";
import { cx } from "@/components/ui";

type Mode = "overlay" | "original";

/**
 * Shows the analysed image with the per-pixel classification overlay,
 * fragment outlines and numbered anomaly boxes. Boxes are SVG in normalised coordinates.
 */
export function OverlayViewer({
  imageUrl,
  overlayUrl,
  anomalies,
  fragments,
  selectedAnomaly,
  onSelectAnomaly,
}: {
  imageUrl: string | null;
  overlayUrl: string | null;
  anomalies: Anomaly[];
  fragments: Fragment[];
  selectedAnomaly: number | null;
  onSelectAnomaly: (id: number | null) => void;
}) {
  const [mode, setMode] = useState<Mode>("overlay");
  const [opacity, setOpacity] = useState(0.75);
  const [showAnomalies, setShowAnomalies] = useState(true);
  const [showFragments, setShowFragments] = useState(false);
  const opacityId = useId();

  if (!imageUrl) {
    return <div className="flex aspect-[4/3] items-center justify-center rounded-lg bg-surface-2 text-sm text-muted">Image unavailable</div>;
  }

  return (
    <div>
      <div className="no-print mb-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
        <div role="radiogroup" aria-label="View" className="inline-flex rounded-lg border border-line bg-surface-2 p-0.5">
          {(["overlay", "original"] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={mode === m}
              onClick={() => setMode(m)}
              className={cx(
                "rounded-md px-3 py-1 text-xs font-medium capitalize",
                mode === m ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink",
              )}
            >
              {m === "overlay" ? "Classification overlay" : "Original"}
            </button>
          ))}
        </div>
        {mode === "overlay" && overlayUrl && (
          <label htmlFor={opacityId} className="flex items-center gap-2 text-xs text-muted">
            Overlay opacity
            <input
              id={opacityId}
              type="range"
              min={0.1}
              max={1}
              step={0.05}
              value={opacity}
              onChange={(e) => setOpacity(Number(e.target.value))}
              className="w-24 accent-[var(--color-accent)]"
            />
          </label>
        )}
        <label className="flex items-center gap-1.5 text-xs text-ink-2">
          <input type="checkbox" checked={showAnomalies} onChange={(e) => setShowAnomalies(e.target.checked)} />
          Anomaly boxes ({anomalies.length})
        </label>
        {fragments.length > 0 && (
          <label className="flex items-center gap-1.5 text-xs text-ink-2">
            <input type="checkbox" checked={showFragments} onChange={(e) => setShowFragments(e.target.checked)} />
            Fragment boxes ({fragments.length})
          </label>
        )}
      </div>

      <div className="relative overflow-hidden rounded-lg bg-charcoal">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageUrl} alt="Analysed sample" className="block h-auto w-full" />
        {mode === "overlay" && overlayUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={overlayUrl}
            alt=""
            aria-hidden
            className="pointer-events-none absolute inset-0 h-full w-full"
            style={{ opacity, imageRendering: "pixelated" }}
          />
        )}
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
          {showFragments &&
            fragments.map((f) => (
              <rect
                key={`f${f.id}`}
                x={f.box.x * 100}
                y={f.box.y * 100}
                width={f.box.w * 100}
                height={f.box.h * 100}
                fill="none"
                stroke="#ffffff"
                strokeOpacity={0.8}
                strokeDasharray="1.2 0.8"
                vectorEffect="non-scaling-stroke"
                strokeWidth={1}
              />
            ))}
          {showAnomalies &&
            anomalies.map((a) => (
              <rect
                key={`a${a.id}`}
                x={a.box.x * 100}
                y={a.box.y * 100}
                width={a.box.w * 100}
                height={a.box.h * 100}
                fill={selectedAnomaly === a.id ? "rgba(255,214,10,0.18)" : "none"}
                stroke="#ffd60a"
                vectorEffect="non-scaling-stroke"
                strokeWidth={selectedAnomaly === a.id ? 3 : 2}
              />
            ))}
        </svg>
        {showAnomalies &&
          anomalies.map((a) => (
            <button
              key={`b${a.id}`}
              type="button"
              onClick={() => onSelectAnomaly(selectedAnomaly === a.id ? null : a.id)}
              className={cx(
                "absolute flex size-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-charcoal text-[11px] font-bold shadow",
                selectedAnomaly === a.id ? "bg-white text-charcoal" : "bg-[#ffd60a] text-charcoal",
              )}
              style={{ left: `${(a.box.x + a.box.w / 2) * 100}%`, top: `${a.box.y * 100}%` }}
              aria-label={`Anomaly ${a.id}: ${a.label}`}
              aria-pressed={selectedAnomaly === a.id}
            >
              {a.id}
            </button>
          ))}
      </div>

      {mode === "overlay" && (
        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-2" aria-label="Overlay legend">
          {(["clear", "green", "brown", "otherColour", "uncertain", "glare"] as const).map((c) => (
            <li key={c} className="flex items-center gap-1.5">
              <span
                aria-hidden
                className="inline-block size-3 rounded-sm border border-black/10"
                style={{
                  backgroundColor: `rgb(${CLASS_STYLE[c].rgb.join(",")})`,
                  backgroundImage:
                    c === "uncertain"
                      ? "repeating-linear-gradient(135deg, rgba(255,255,255,.7) 0 2px, transparent 2px 4px)"
                      : undefined,
                }}
              />
              {CLASS_STYLE[c].shortLabel}
            </li>
          ))}
          <li className="flex items-center gap-1.5">
            <span aria-hidden className="inline-block size-3 rounded-sm border border-line-strong bg-transparent" />
            Background (transparent)
          </li>
          <li className="flex items-center gap-1.5">
            <span aria-hidden className="inline-block size-3 rounded-sm border-2 border-[#ffd60a]" />
            Possible anomaly
          </li>
        </ul>
      )}
    </div>
  );
}
