"use client";

import type { Keypoint } from "@/hooks/useWifiSensing";

const COCO_NAMES = [
  "Nose", "Left Eye", "Right Eye", "Left Ear", "Right Ear",
  "L Shoulder", "R Shoulder", "L Elbow", "R Elbow",
  "L Wrist", "R Wrist", "L Hip", "R Hip",
  "L Knee", "R Knee", "L Ankle", "R Ankle",
];

interface KeypointsTableProps {
  keypoints: Keypoint[];
}

export default function KeypointsTable({ keypoints }: KeypointsTableProps) {
  const avgConfidence =
    keypoints.length > 0
      ? keypoints.reduce((sum, kp) => sum + kp.confidence, 0) / keypoints.length
      : 0;

  return (
    <div
      className="rounded-2xl overflow-hidden flex flex-col"
      style={{
        background: "rgba(15,23,42,0.95)",
        border: "1px solid rgba(56,189,248,0.12)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05)",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/5">
        <span className="text-sm font-semibold text-slate-300 tracking-wide">
          🦴 Keypoint Confidence
        </span>
        <span className="text-xs font-medium text-sky-400">
          Avg: {(avgConfidence * 100).toFixed(0)}%
        </span>
      </div>

      {/* Scrollable list */}
      <div className="overflow-y-auto flex-1 px-3 py-2 max-h-64">
        {keypoints.map((kp, i) => (
          <div
            key={i}
            className="flex items-center gap-2 py-1.5 border-b border-white/[0.04] last:border-0"
          >
            <span className="text-xs text-slate-500 w-5 text-right shrink-0">{i}</span>
            <span className="text-xs text-slate-300 w-20 shrink-0">{COCO_NAMES[i]}</span>
            <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${kp.confidence * 100}%`,
                  background: kp.confidence > 0.7
                    ? "linear-gradient(90deg,#1d4ed8,#38bdf8)"
                    : kp.confidence > 0.4
                    ? "linear-gradient(90deg,#78350f,#fbbf24)"
                    : "linear-gradient(90deg,#7f1d1d,#f87171)",
                }}
              />
            </div>
            <span className="text-xs text-slate-400 w-8 text-right shrink-0">
              {(kp.confidence * 100).toFixed(0)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
