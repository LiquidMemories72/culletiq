"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { COLOUR_CLASSES } from "@/types/analysis";
import type { SampleRecord } from "@/types/sample";
import { CLASS_STYLE } from "@/lib/classes";

/** 100%-stacked columns of material-area shares for recent usable samples, oldest → newest. */
export function SampleTrendChart({ records }: { records: SampleRecord[] }) {
  const data = [...records]
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .map((r) => ({
      id: r.id,
      name: r.name.length > 14 ? `${r.name.slice(0, 13)}…` : r.name,
      fullName: r.name,
      ...Object.fromEntries(COLOUR_CLASSES.map((c) => [c, Number(r.result.colour.percentages[c].toFixed(1))])),
    }));

  return (
    <div className="h-[260px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 4, left: -8 }} barCategoryGap="28%">
          <CartesianGrid vertical={false} stroke="#e6e4dc" />
          <XAxis dataKey="name" tick={{ fill: "#6b716c", fontSize: 11 }} axisLine={false} tickLine={false} interval={0} />
          <YAxis
            domain={[0, 100]}
            ticks={[0, 50, 100]}
            tickFormatter={(v) => `${v}%`}
            tick={{ fill: "#6b716c", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            cursor={{ fill: "rgba(0,0,0,0.04)" }}
            labelFormatter={(_, p) => (p?.[0]?.payload as { fullName?: string })?.fullName ?? ""}
            formatter={(v, n) => [`${Number(v).toFixed(1)}%`, CLASS_STYLE[n as keyof typeof CLASS_STYLE]?.shortLabel ?? n]}
            contentStyle={{ borderRadius: 8, border: "1px solid #dedcd3", fontSize: 13 }}
          />
          <Legend
            formatter={(v) => <span style={{ color: "#454c47", fontSize: 12 }}>{CLASS_STYLE[v as keyof typeof CLASS_STYLE]?.shortLabel}</span>}
            iconType="square"
            iconSize={10}
            itemSorter={(item) => COLOUR_CLASSES.indexOf(String(item.dataKey) as (typeof COLOUR_CLASSES)[number])}
          />
          {COLOUR_CLASSES.map((c, i) => (
            <Bar
              key={c}
              dataKey={c}
              stackId="a"
              fill={CLASS_STYLE[c].hex}
              stroke="#fcfcfb"
              strokeWidth={2}
              maxBarSize={24}
              radius={i === COLOUR_CLASSES.length - 1 ? [4, 4, 0, 0] : 0}
              isAnimationActive={false}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
