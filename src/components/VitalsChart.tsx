"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

export interface ChartPoint {
  t: number;   // seconds ago label
  value: number;
}

interface VitalsChartProps {
  label: string;
  unit: string;
  icon: string;
  accentColor: string;
  data: ChartPoint[];
  currentValue: number;
  normalRange: [number, number];
  domain: [number, number];
}

export default function VitalsChart({
  label,
  unit,
  icon,
  accentColor,
  data,
  currentValue,
  normalRange,
  domain,
}: VitalsChartProps) {
  const isNormal =
    currentValue >= normalRange[0] && currentValue <= normalRange[1];

  return (
    <div
      className="relative rounded-2xl overflow-hidden flex flex-col"
      style={{
        background:
          "linear-gradient(135deg, rgba(15,23,42,0.97) 0%, rgba(15,23,42,0.85) 100%)",
        border: `1px solid ${accentColor}30`,
        boxShadow: `0 0 24px ${accentColor}10, inset 0 1px 0 rgba(255,255,255,0.06)`,
      }}
    >
      {/* Glow blob */}
      <div
        className="absolute -top-8 -right-8 w-28 h-28 rounded-full blur-3xl opacity-15 pointer-events-none"
        style={{ background: accentColor }}
      />

      {/* Header row */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2 z-10">
        <div className="flex items-center gap-2">
          <span className="text-xl">{icon}</span>
          <span className="text-xs font-semibold tracking-widest text-slate-400 uppercase">
            {label}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="w-1.5 h-1.5 rounded-full animate-pulse"
            style={{ background: isNormal ? "#34d399" : "#f87171" }}
          />
          <span
            className="text-xs font-medium"
            style={{ color: isNormal ? "#34d399" : "#f87171" }}
          >
            {isNormal ? "Normal" : "Alert"}
          </span>
        </div>
      </div>

      {/* Big value */}
      <div className="flex items-end gap-1.5 px-4 pb-2 z-10">
        <span
          className="text-4xl font-black tabular-nums leading-none transition-all duration-300"
          style={{
            color: accentColor,
            textShadow: `0 0 20px ${accentColor}60`,
          }}
          id={`chart-value-${label.toLowerCase().replace(/\s+/g, "-")}`}
        >
          {currentValue}
        </span>
        <span className="text-sm text-slate-400 font-medium mb-1">{unit}</span>
        <span className="ml-auto text-[10px] text-slate-600 mb-1">
          60 s window
        </span>
      </div>

      {/* Chart */}
      <div className="px-1 pb-3 z-10" style={{ height: 90 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 4, right: 8, left: -28, bottom: 0 }}>
            <defs>
              <linearGradient
                id={`grad-${label}`}
                x1="0"
                y1="0"
                x2="1"
                y2="0"
              >
                <stop offset="0%" stopColor={accentColor} stopOpacity={0.2} />
                <stop offset="100%" stopColor={accentColor} stopOpacity={1} />
              </linearGradient>
            </defs>

            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(255,255,255,0.04)"
              vertical={false}
            />

            {/* Normal range band */}
            <ReferenceLine
              y={normalRange[1]}
              stroke={`${accentColor}40`}
              strokeDasharray="4 4"
            />
            <ReferenceLine
              y={normalRange[0]}
              stroke={`${accentColor}40`}
              strokeDasharray="4 4"
            />

            <XAxis dataKey="t" hide />
            <YAxis
              domain={domain}
              tick={{ fill: "#475569", fontSize: 9 }}
              tickLine={false}
              axisLine={false}
              width={32}
            />

            <Line
              type="monotone"
              dataKey="value"
              stroke={`url(#grad-${label})`}
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Bottom range hint */}
      <div className="px-4 pb-3 flex justify-between text-[10px] text-slate-600 z-10">
        <span>Normal: {normalRange[0]}–{normalRange[1]} {unit}</span>
        <span style={{ color: accentColor }}>
          ↑{normalRange[1]} ↓{normalRange[0]}
        </span>
      </div>

      <div
        className="absolute bottom-0 left-0 right-0 h-px"
        style={{
          background: `linear-gradient(90deg, transparent, ${accentColor}50, transparent)`,
        }}
      />
    </div>
  );
}
