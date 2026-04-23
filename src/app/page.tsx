"use client";

import dynamic from "next/dynamic";
import { useState, useEffect, useRef } from "react";
import { useWifiSensing } from "@/hooks/useWifiSensing";
import { useFallDetection } from "@/hooks/useFallDetection";
import StatusBadge from "@/components/StatusBadge";
import KeypointsTable from "@/components/KeypointsTable";
import VitalsChart, { type ChartPoint } from "@/components/VitalsChart";
import CriticalFallAlert from "@/components/CriticalFallAlert";

// 3D and alert only on client
const SkeletonViewer = dynamic(() => import("@/components/SkeletonViewer"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center">
      <div className="text-slate-500 text-sm animate-pulse">
        Initialising 3D renderer…
      </div>
    </div>
  ),
});

const WS_URL = "ws://localhost:3000/ws/sensing";
const MAX_CHART_POINTS = 60;

// ── Helper: append a point and keep max 60 ────────────────────────
function appendPoint(prev: ChartPoint[], value: number): ChartPoint[] {
  const next = [...prev, { t: prev.length, value }];
  return next.length > MAX_CHART_POINTS ? next.slice(-MAX_CHART_POINTS) : next;
}

export default function DashboardPage() {
  const { data, status } = useWifiSensing(WS_URL);
  
  // Edge AI ML Fall Detection hook
  const { isFallDetected, isLongLie, fallDuration, dismiss } = useFallDetection(
    data?.mlClassification,
    data?.confidenceScore
  );

  // Chart history state
  const [hrHistory, setHrHistory] = useState<ChartPoint[]>([]);
  const [brHistory, setBrHistory] = useState<ChartPoint[]>([]);

  // Date — client only to avoid hydration mismatch
  const [dateStr, setDateStr] = useState("");
  useEffect(() => {
    setDateStr(
      new Date().toLocaleDateString("en-GB", {
        weekday: "short",
        day: "2-digit",
        month: "short",
      })
    );
  }, []);

  // Append incoming vitals to chart history
  const heartRate = data?.vitals?.heartRate ?? 72;
  const breathingRate = data?.vitals?.breathingRate ?? 15;
  const keypoints = data?.keypoints ?? [];
  const mlState = data?.mlClassification ?? "NORMAL";
  const confidence = data?.confidenceScore ?? 1.0;

  // Use a ref to avoid stale closure issues in the fast-update loop
  const hrRef = useRef(heartRate);
  const brRef = useRef(breathingRate);
  hrRef.current = heartRate;
  brRef.current = breathingRate;

  useEffect(() => {
    setHrHistory((prev) => appendPoint(prev, hrRef.current));
    setBrHistory((prev) => appendPoint(prev, brRef.current));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [heartRate, breathingRate]);

  // Stats
  const detectedCount = keypoints.filter((k) => k.confidence > 0.5).length;
  const avgConf =
    keypoints.length > 0
      ? Math.round(
          (keypoints.reduce((s, k) => s + k.confidence, 0) / keypoints.length) *
            100
        )
      : 0;

  return (
    <>
      {/* ── Fall Alert Overlay ─────────────────────────────────── */}
      {isFallDetected && <CriticalFallAlert isLongLie={isLongLie} onDismiss={dismiss} />}

      <div
        className="min-h-screen flex flex-col"
        style={{
          background:
            "linear-gradient(135deg, #020817 0%, #0a1628 50%, #050d1a 100%)",
        }}
      >
        {/* ── HEADER ─────────────────────────────────────────────── */}
        <header
          className="flex items-center justify-between px-6 py-3.5 border-b border-white/[0.06] shrink-0"
          style={{
            background: "rgba(2,8,23,0.92)",
            backdropFilter: "blur(12px)",
          }}
        >
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0"
              style={{
                background: "linear-gradient(135deg, #38bdf8, #818cf8)",
                boxShadow: "0 0 20px rgba(56,189,248,0.4)",
              }}
            >
              📡
            </div>
            <div>
              <h1 className="text-base font-bold text-white tracking-tight leading-none">
                EchoSense<span className="text-sky-400"> UI</span>
              </h1>
              <p className="text-[10px] text-slate-500 mt-0.5">
                Edge AI CSI Monitoring
              </p>
            </div>
          </div>

          {/* Centre — fall indicator strip */}
          {isFallDetected && (
            <div
              className="hidden md:flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold animate-pulse"
              style={{
                background: "rgba(239,68,68,0.15)",
                border: "1px solid rgba(239,68,68,0.5)",
                color: "#f87171",
              }}
            >
              ⚠️ {isLongLie ? "LONG LIE DETECTED" : "FALL DETECTED"}
            </div>
          )}

          {/* Right */}
          <div className="flex items-center gap-4">
            <div className="hidden lg:flex items-center gap-3 text-xs text-slate-600">
              <span>
                Edge AI:{" "}
                <span className="text-slate-400 font-bold tracking-widest">
                  {mlState}
                </span>
              </span>
              <span>
                Conf:{" "}
                <span
                  className="tabular-nums font-bold"
                  style={{
                    color: confidence < 0.75 ? "#f87171" : "#34d399",
                  }}
                >
                  {(confidence * 100).toFixed(0)}%
                </span>
              </span>
            </div>
            <StatusBadge status={status} url={WS_URL} />
            <div className="text-xs text-slate-600 hidden sm:block">
              {dateStr}
            </div>
          </div>
        </header>

        {/* ── MAIN GRID ──────────────────────────────────────────── */}
        <main
          className="flex-1 grid gap-3 p-3 min-h-0"
          style={{
            gridTemplateColumns: "1fr 340px",
            gridTemplateRows: "1fr auto",
          }}
        >
          {/* ── 3D Skeleton Viewer ── */}
          <div
            className="row-span-2 rounded-2xl overflow-hidden relative flex flex-col"
            style={{
              background: "rgba(8,15,30,0.97)",
              border: "1px solid rgba(56,189,248,0.12)",
              boxShadow:
                "0 0 40px rgba(56,189,248,0.05), inset 0 1px 0 rgba(255,255,255,0.05)",
              minHeight: "520px",
            }}
          >
            {/* Panel header */}
            <div
              className="flex items-center justify-between px-5 py-3 border-b border-white/5 shrink-0"
              style={{
                background: "rgba(8,15,30,0.9)",
                backdropFilter: "blur(8px)",
              }}
            >
              <div className="flex items-center gap-2">
                <span className="text-sky-400">🫀</span>
                <span className="text-sm font-semibold text-slate-200">
                  Live Skeleton
                </span>
                {detectedCount > 0 && (
                  <span
                    className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                    style={{
                      background: "rgba(56,189,248,0.15)",
                      color: "#38bdf8",
                    }}
                  >
                    {detectedCount}/17 kp
                  </span>
                )}
              </div>
              <span className="text-xs text-slate-500">
                Drag to rotate · Scroll to zoom
              </span>
            </div>

            {/* Canvas */}
            <div className="flex-1 min-h-0" id="skeleton-canvas-container">
              <SkeletonViewer keypoints={keypoints} />
            </div>

            {/* Axis legend */}
            <div className="absolute bottom-4 left-5 z-10 flex gap-4 text-xs text-slate-400 pointer-events-none">
              {[
                { label: "Left", color: "#38bdf8" },
                { label: "Right", color: "#a78bfa" },
                { label: "Centre", color: "#34d399" },
              ].map(({ label, color }) => (
                <span key={label} className="flex items-center gap-1">
                  <span
                    className="w-3 h-0.5 rounded"
                    style={{ background: color }}
                  />
                  {label}
                </span>
              ))}
            </div>
          </div>

          {/* ── Right column: charts + table ── */}
          <div className="flex flex-col gap-3">
            {/* Section label */}
            <div
              className="px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-widest text-slate-500"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.05)",
              }}
            >
              Vital Signs
            </div>

            <VitalsChart
              label="Heart Rate"
              unit="bpm"
              icon="❤️"
              accentColor="#f43f5e"
              data={hrHistory}
              currentValue={heartRate}
              normalRange={[60, 100]}
              domain={[40, 130]}
            />

            <VitalsChart
              label="Breathing Rate"
              unit="br/min"
              icon="🫁"
              accentColor="#38bdf8"
              data={brHistory}
              currentValue={breathingRate}
              normalRange={[12, 20]}
              domain={[6, 30]}
            />

            <KeypointsTable keypoints={keypoints} />
          </div>

          {/* ── Footer stats strip ── */}
          <div className="col-span-2 grid grid-cols-5 gap-2">
            {[
              {
                label: "Edge State",
                value: mlState,
                icon: "🧠",
                color: mlState === "NORMAL" || mlState === "EMPTY" ? "#38bdf8" : "#f87171",
              },
              {
                label: "AI Confidence",
                value: `${(confidence * 100).toFixed(0)}%`,
                icon: "🎯",
                color: confidence >= 0.75 ? "#34d399" : "#f87171",
              },
              {
                label: "HR Trend",
                value:
                  heartRate > 100
                    ? "↑ High"
                    : heartRate < 60
                    ? "↓ Low"
                    : "→ Stable",
                icon: "📈",
                color:
                  heartRate > 100 || heartRate < 60 ? "#f87171" : "#94a3b8",
              },
              {
                label: "Fall Time",
                value: isFallDetected ? `${fallDuration}s` : "0s",
                icon: "⏱️",
                color: fallDuration > 60 ? "#ef4444" : fallDuration > 0 ? "#f59e0b" : "#94a3b8",
              },
              {
                label: "Fall Status",
                value: isLongLie ? "🚨 LONG LIE" : isFallDetected ? "⚠️ Detected" : "✓ Safe",
                icon: "🛡️",
                color: isLongLie || isFallDetected ? "#f87171" : "#34d399",
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl px-3 py-2.5 flex items-center gap-2.5"
                style={{
                  background: "rgba(15,23,42,0.85)",
                  border: "1px solid rgba(255,255,255,0.05)",
                }}
              >
                <span className="text-lg shrink-0">{stat.icon}</span>
                <div className="min-w-0">
                  <p className="text-[10px] text-slate-500 truncate">
                    {stat.label}
                  </p>
                  <p
                    className="text-sm font-bold truncate"
                    style={{ color: stat.color }}
                  >
                    {stat.value}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    </>
  );
}
