"use client";

import { useId } from "react";
import type { BackgroundMode } from "@/types/analysis";
import { DEFAULT_CONFIG } from "@/lib/vision/config";
import { Button, Disclosure } from "@/components/ui";

export interface AnalysisSettings {
  backgroundMode: BackgroundMode;
  whiteBalance: "background" | "none";
  clearMaxChroma: number;
  colourMinChroma: number;
}

export const DEFAULT_SETTINGS: AnalysisSettings = {
  backgroundMode: DEFAULT_CONFIG.background.mode,
  whiteBalance: DEFAULT_CONFIG.whiteBalance.mode,
  clearMaxChroma: DEFAULT_CONFIG.thresholds.clearMaxChroma,
  colourMinChroma: DEFAULT_CONFIG.thresholds.colourMinChroma,
};

export function settingsToConfig(s: AnalysisSettings) {
  return {
    background: { mode: s.backgroundMode },
    whiteBalance: { mode: s.whiteBalance },
    thresholds: { clearMaxChroma: s.clearMaxChroma, colourMinChroma: Math.max(s.colourMinChroma, s.clearMaxChroma) },
  };
}

function Radio<T extends string>({
  name,
  value,
  current,
  onChange,
  label,
  hint,
}: {
  name: string;
  value: T;
  current: T;
  onChange: (v: T) => void;
  label: string;
  hint: string;
}) {
  return (
    <label className="flex cursor-pointer gap-2.5 rounded-md p-2 hover:bg-surface-2">
      <input type="radio" name={name} checked={current === value} onChange={() => onChange(value)} className="mt-1" />
      <span>
        <span className="block text-sm text-ink">{label}</span>
        <span className="block text-xs text-muted">{hint}</span>
      </span>
    </label>
  );
}

export function SettingsPanel({
  value,
  onChange,
}: {
  value: AnalysisSettings;
  onChange: (s: AnalysisSettings) => void;
}) {
  const id = useId();
  const set = <K extends keyof AnalysisSettings>(k: K, v: AnalysisSettings[K]) => onChange({ ...value, [k]: v });
  const changed = JSON.stringify(value) !== JSON.stringify(DEFAULT_SETTINGS);

  return (
    <Disclosure summary={`Analysis settings${changed ? " (modified)" : ""}`}>
      <div className="space-y-5">
        <fieldset>
          <legend className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">Background</legend>
          <Radio
            name={`${id}-bg`}
            value="auto"
            current={value.backgroundMode}
            onChange={(v) => set("backgroundMode", v)}
            label="Auto-detect"
            hint="Remove a uniform surface connected to the image border."
          />
          <Radio
            name={`${id}-bg`}
            value="none"
            current={value.backgroundMode}
            onChange={(v) => set("backgroundMode", v)}
            label="Material fills the frame"
            hint="Treat every pixel as material (no surface visible)."
          />
        </fieldset>
        <fieldset>
          <legend className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">White balance</legend>
          <Radio
            name={`${id}-wb`}
            value="background"
            current={value.whiteBalance}
            onChange={(v) => set("whiteBalance", v)}
            label="Use background as white reference"
            hint="Only if the surface is white or grey; skipped automatically if it looks coloured."
          />
          <Radio
            name={`${id}-wb`}
            value="none"
            current={value.whiteBalance}
            onChange={(v) => set("whiteBalance", v)}
            label="Off"
            hint="Use the colours exactly as photographed."
          />
        </fieldset>
        <fieldset className="space-y-3">
          <legend className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">Colour thresholds (CIELAB chroma)</legend>
          <label className="block">
            <span className="flex justify-between text-sm text-ink">
              Clear: max chroma C* <span className="tabular text-muted">{value.clearMaxChroma}</span>
            </span>
            <input
              type="range"
              min={4}
              max={20}
              step={1}
              value={value.clearMaxChroma}
              onChange={(e) => set("clearMaxChroma", Number(e.target.value))}
              className="w-full accent-[var(--color-accent)]"
            />
          </label>
          <label className="block">
            <span className="flex justify-between text-sm text-ink">
              Coloured: min chroma C* <span className="tabular text-muted">{Math.max(value.colourMinChroma, value.clearMaxChroma)}</span>
            </span>
            <input
              type="range"
              min={4}
              max={30}
              step={1}
              value={value.colourMinChroma}
              onChange={(e) => set("colourMinChroma", Number(e.target.value))}
              className="w-full accent-[var(--color-accent)]"
            />
          </label>
          <p className="text-xs text-muted">
            Pixels between the two values are reported as uncertain. Defaults are uncalibrated starting points; changing them
            makes results incomparable with samples analysed at other settings (the comparison view warns about this).
          </p>
        </fieldset>
        {changed && (
          <Button variant="ghost" onClick={() => onChange(DEFAULT_SETTINGS)}>
            Reset to defaults
          </Button>
        )}
      </div>
    </Disclosure>
  );
}
