"use client";

import { useEffect, useRef } from "react";

interface VitalsCardProps {
  label: string;
  value: number;
  unit: string;
  icon: string;
  accentColor: string;
  normalRange: [number, number];
  description: string;
}

export default function VitalsCard({
  label,
  value,
  unit,
  icon,
  accentColor,
  normalRange,
  description,
}: VitalsCardProps) {
  const prevValueRef = useRef(value);
  const displayRef = useRef<HTMLSpanElement>(null);

  // Check if value is in normal range
  const isNormal = value >= normalRange[0] && value <= normalRange[1];
  const rangePercent = Math.min(
    100,
    Math.max(
      0,
      ((value - normalRange[0]) / (normalRange[1] - normalRange[0])) * 100
    )
  );

  useEffect(() => {
    prevValueRef.current = value;
  }, [value]);

  return (
    <div
      className="relative rounded-2xl overflow-hidden flex flex-col gap-3 p-5"
      style={{
        background: "linear-gradient(135deg, rgba(15,23,42,0.95) 0%, rgba(15,23,42,0.8) 100%)",
        border: `1px solid ${accentColor}30`,
        boxShadow: `0 0 24px ${accentColor}12, inset 0 1px 0 rgba(255,255,255,0.06)`,
      }}
    >
      {/* Glow blob */}
      <div
        className="absolute -top-6 -right-6 w-24 h-24 rounded-full blur-2xl opacity-20"
        style={{ background: accentColor }}
      />

      {/* Header */}
      <div className="flex items-center justify-between z-10">
        <div className="flex items-center gap-2">
          <span className="text-xl">{icon}</span>
          <span className="text-sm font-semibold tracking-wide text-slate-400 uppercase">
            {label}
          </span>
        </div>
        {/* Status dot */}
        <div className="flex items-center gap-1.5">
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

      {/* Value */}
      <div className="flex items-end gap-1.5 z-10">
        <span
          ref={displayRef}
          className="text-5xl font-black tabular-nums transition-all duration-300"
          style={{ color: accentColor, textShadow: `0 0 20px ${accentColor}60` }}
          id={`vital-${label.toLowerCase().replace(/\s+/g, "-")}`}
        >
          {value}
        </span>
        <span className="text-lg text-slate-400 font-medium mb-1.5">{unit}</span>
      </div>

      {/* Range bar */}
      <div className="z-10">
        <div className="flex justify-between text-xs text-slate-500 mb-1.5">
          <span>{normalRange[0]}</span>
          <span className="text-slate-400">{description}</span>
          <span>{normalRange[1]}</span>
        </div>
        <div className="relative h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.07)" }}>
          <div
            className="absolute inset-0 rounded-full transition-all duration-700"
            style={{
              width: `${rangePercent}%`,
              background: `linear-gradient(90deg, ${accentColor}60, ${accentColor})`,
            }}
          />
        </div>
      </div>

      {/* Heartbeat line decoration */}
      <div className="absolute bottom-0 left-0 right-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${accentColor}40, transparent)` }} />
    </div>
  );
}
