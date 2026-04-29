import React from "react";
import { Area, AreaChart as ReAreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useTheme } from "../hooks/useTheme";

interface Point {
  label: string;
  value: number;
}

interface AreaChartProps {
  data: Point[];
  height?: number;
}

export function AreaChart({ data, height = 140 }: AreaChartProps) {
  const { c } = useTheme();

  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer width="100%" height={height}>
        <ReAreaChart data={data} margin={{ left: 6, right: 6, top: 10, bottom: 0 }}>
          <defs>
            <linearGradient id="hhArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={c.accent} stopOpacity={0.18} />
              <stop offset="100%" stopColor={c.accent} stopOpacity={0.01} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={c.border} vertical={false} />
          <XAxis dataKey="label" tick={{ fill: c.muted, fontSize: 10 }} axisLine={{ stroke: c.border }} tickLine={false} />
          <YAxis tick={{ fill: c.muted, fontSize: 10 }} axisLine={{ stroke: c.border }} tickLine={false} width={30} />
          <Tooltip
            contentStyle={{
              background: c.cardBg2,
              border: `1px solid ${c.border}`,
              borderRadius: "12px",
              color: c.text,
            }}
          />
          <Area type="monotone" dataKey="value" stroke={c.accent} strokeWidth={2.2} fill="url(#hhArea)" />
        </ReAreaChart>
      </ResponsiveContainer>
    </div>
  );
}
