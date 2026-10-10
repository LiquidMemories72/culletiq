"use client";

import { COLOUR_CLASSES, type ColourClass } from "@/types/analysis";
import { CLASS_STYLE } from "@/lib/classes";
import { roundPercentages } from "@/lib/vision/classify";
import { cx } from "@/components/ui";

/**
 * 100% stacked bar of material-area shares. 2px surface gaps separate segments;
 * "uncertain" is hatched so it is never identified by colour alone. Each segment
 * has a hover/focus tooltip; the legend carries every value as text.
 */
export function ProportionBar({
  percentages,
  height = 20,
  showLegend = true,
  label,
  compact = false,
}: {
  percentages: Record<ColourClass, number>;
  height?: number;
  showLegend?: boolean;
  label: string;
  compact?: boolean;
}) {
  const rounded = roundPercentages(percentages, 1);
  const segments = COLOUR_CLASSES.filter((c) => percentages[c] > 0);
  const summary = COLOUR_CLASSES.map((c) => `${CLASS_STYLE[c].shortLabel} ${rounded[c].toFixed(1)}%`).join(", ");

  return (
    <div>
      <div
        role="img"
        aria-label={`${label}: ${summary}`}
        className="flex w-full gap-[2px] overflow-visible rounded-[4px]"
        style={{ height }}
      >
        {segments.length === 0 && <div className="h-full w-full rounded-[4px] bg-surface-2" />}
        {segments.map((c, i) => (
          <div
            key={c}
            tabIndex={compact ? -1 : 0}
            className={cx(
              "group relative h-full min-w-[2px] outline-offset-1",
              c === "uncertain" && "hatch",
              i === 0 && "rounded-l-[4px]",
              i === segments.length - 1 && "rounded-r-[4px]",
            )}
            style={{ width: `${percentages[c]}%`, backgroundColor: CLASS_STYLE[c].hex }}
            aria-label={`${CLASS_STYLE[c].label}: ${rounded[c].toFixed(1)}%`}
          >
            {!compact && (
              <span
                role="tooltip"
                className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-charcoal px-2 py-1 text-xs text-white shadow group-hover:block group-focus:block"
              >
                {CLASS_STYLE[c].label}: <span className="tabular font-semibold">{rounded[c].toFixed(1)}%</span>
              </span>
            )}
          </div>
        ))}
      </div>
      {showLegend && (
        <ul className={cx("mt-3 flex flex-wrap gap-x-4 gap-y-1.5", compact ? "text-xs" : "text-sm")}>
          {COLOUR_CLASSES.map((c) => (
            <li key={c} className="flex items-center gap-1.5 text-ink-2">
              <span
                aria-hidden
                className={cx("inline-block size-2.5 rounded-sm", c === "uncertain" && "hatch")}
                style={{ backgroundColor: CLASS_STYLE[c].hex }}
              />
              {CLASS_STYLE[c].shortLabel}
              <span className="tabular font-medium text-ink">{rounded[c].toFixed(1)}%</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function ClassSwatch({ cls }: { cls: ColourClass }) {
  return (
    <span
      aria-hidden
      className={cx("inline-block size-3 shrink-0 rounded-sm", cls === "uncertain" && "hatch")}
      style={{ backgroundColor: CLASS_STYLE[cls].hex }}
    />
  );
}
