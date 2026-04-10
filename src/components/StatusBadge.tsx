"use client";

import type { ConnectionStatus } from "@/hooks/useWifiSensing";

interface StatusBadgeProps {
  status: ConnectionStatus;
  url: string;
}

const STATUS_CONFIG: Record<
  ConnectionStatus,
  { label: string; color: string; bg: string; pulse: boolean }
> = {
  connected: {
    label: "Live",
    color: "#34d399",
    bg: "rgba(52,211,153,0.12)",
    pulse: true,
  },
  connecting: {
    label: "Connecting…",
    color: "#fbbf24",
    bg: "rgba(251,191,36,0.10)",
    pulse: true,
  },
  disconnected: {
    label: "Demo Mode",
    color: "#94a3b8",
    bg: "rgba(148,163,184,0.08)",
    pulse: false,
  },
  error: {
    label: "Error",
    color: "#f87171",
    bg: "rgba(248,113,113,0.12)",
    pulse: false,
  },
};

export default function StatusBadge({ status, url }: StatusBadgeProps) {
  const cfg = STATUS_CONFIG[status];
  return (
    <div
      className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold"
      style={{ background: cfg.bg, border: `1px solid ${cfg.color}30` }}
      title={`WebSocket: ${url}`}
      id="ws-status-badge"
    >
      <span
        className={`w-2 h-2 rounded-full ${cfg.pulse ? "animate-pulse" : ""}`}
        style={{ background: cfg.color, boxShadow: `0 0 6px ${cfg.color}` }}
      />
      <span style={{ color: cfg.color }}>{cfg.label}</span>
    </div>
  );
}
