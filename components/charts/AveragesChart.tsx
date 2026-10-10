"use client";

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { COLOUR_CLASSES, type ColourClass } from "@/types/analysis";
import { CLASS_STYLE } from "@/lib/classes";

/** Mean material-area share per class across saved samples (one bar per class). */
export function AveragesChart({ averages }: { averages: Record<ColourClass, number> }) {
  const data = COLOUR_CLASSES.map((c) => ({ cls: c, name: CLASS_STYLE[c].shortLabel, value: averages[c] }));
  return (
    <div className="h-[220px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 48, bottom: 4, left: 8 }} barCategoryGap={10}>
          <CartesianGrid horizontal={false} stroke="#e6e4dc" />
          <XAxis
            type="number"
            domain={[0, 100]}
            ticks={[0, 25, 50, 75, 100]}
            tickFormatter={(v) => `${v}%`}
            tick={{ fill: "#6b716c", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={78}
            tick={{ fill: "#454c47", fontSize: 13 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            cursor={{ fill: "rgba(0,0,0,0.04)" }}
            formatter={(v) => [`${Number(v).toFixed(1)}% of material area`, "Average"]}
            contentStyle={{ borderRadius: 8, border: "1px solid #dedcd3", fontSize: 13 }}
          />
          <Bar
            dataKey="value"
            maxBarSize={22}
            radius={[0, 4, 4, 0]}
            isAnimationActive={false}
            label={{
              position: "right",
              formatter: (v: unknown) => `${Number(v).toFixed(1)}%`,
              fill: "#1c201e",
              fontSize: 12,
            }}
          >
            {data.map((d) => (
              <Cell key={d.cls} fill={CLASS_STYLE[d.cls].hex} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
