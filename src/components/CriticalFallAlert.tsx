"use client";

import { useEffect, useRef } from "react";

interface CriticalFallAlertProps {
  isLongLie: boolean;
  onDismiss: () => void;
}

export default function CriticalFallAlert({ isLongLie, onDismiss }: CriticalFallAlertProps) {
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Play a warning beep pattern
  useEffect(() => {
    let stopped = false;
    let interval: ReturnType<typeof setInterval>;

    function beep() {
      if (stopped) return;
      try {
        if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
          audioCtxRef.current = new AudioContext();
        }
        const ctx = audioCtxRef.current;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = "square";
        
        // Use a more aggressive pitch for a Long Lie
        osc.frequency.setValueAtTime(isLongLie ? 1100 : 880, ctx.currentTime);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.3);
      } catch {
        // Audio not available — silent mode
      }
    }

    beep();
    // Beep much faster if it's a Long Lie
    interval = setInterval(beep, isLongLie ? 400 : 1200);

    return () => {
      stopped = true;
      clearInterval(interval);
      audioCtxRef.current?.close();
    };
  }, [isLongLie]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center transition-colors duration-500"
      style={{
        backdropFilter: "blur(8px) saturate(0.4)",
        WebkitBackdropFilter: "blur(8px) saturate(0.4)",
        background: isLongLie ? "rgba(180,0,0,0.7)" : "rgba(127,0,0,0.55)",
      }}
      id="fall-alert-overlay"
      role="alertdialog"
      aria-modal="true"
      aria-label="Critical Fall Detected"
    >
      {/* Pulsing red ring */}
      <div className="absolute inset-0 pointer-events-none animate-ping"
        style={{
          background: "radial-gradient(circle at 50% 50%, rgba(239,68,68,0.25) 0%, transparent 70%)",
          animationDuration: isLongLie ? "0.6s" : "1.2s",
        }}
      />

      {/* Alert card */}
      <div
        className="relative flex flex-col items-center gap-6 rounded-3xl px-12 py-10 mx-4 max-w-lg w-full"
        style={{
          background: "linear-gradient(145deg, rgba(20,4,4,0.98), rgba(60,6,6,0.95))",
          border: isLongLie ? "2px solid #ff0000" : "2px solid rgba(239,68,68,0.7)",
          boxShadow: isLongLie 
            ? "0 0 100px rgba(255,0,0,0.8), 0 0 200px rgba(255,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)"
            : "0 0 80px rgba(239,68,68,0.5), 0 0 160px rgba(239,68,68,0.2), inset 0 1px 0 rgba(255,255,255,0.06)",
        }}
      >
        {/* Warning icon — pulsing */}
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center animate-pulse"
          style={{
            background: "radial-gradient(circle, rgba(239,68,68,0.3), transparent)",
            border: "2px solid rgba(239,68,68,0.8)",
            animationDuration: isLongLie ? "0.4s" : "0.8s",
          }}
        >
          <span className="text-4xl" role="img" aria-label="Warning">⚠️</span>
        </div>

        {/* Main message */}
        <div className="text-center">
          <p
            className="text-xs font-bold tracking-[0.3em] uppercase mb-2"
            style={{ color: "rgba(239,68,68,0.7)" }}
          >
            EchoSense ML Alert
          </p>
          <h2
            className="text-3xl font-black tracking-tight uppercase animate-pulse"
            style={{
              color: isLongLie ? "#ff5555" : "#fca5a5",
              textShadow: "0 0 30px rgba(239,68,68,0.8)",
              animationDuration: isLongLie ? "0.4s" : "0.9s",
            }}
          >
            {isLongLie ? "LONG LIE" : "CRITICAL FALL"}
          </h2>
          <h2
            className="text-3xl font-black tracking-tight uppercase animate-pulse"
            style={{
              color: "#ef4444",
              textShadow: "0 0 30px rgba(239,68,68,0.8)",
              animationDuration: isLongLie ? "0.4s" : "0.9s",
            }}
          >
            DETECTED
          </h2>
        </div>

        {/* Details */}
        <div
          className="w-full rounded-xl px-5 py-4 text-center"
          style={{
            background: "rgba(239,68,68,0.08)",
            border: "1px solid rgba(239,68,68,0.2)",
          }}
        >
          <p className="text-sm text-red-300 leading-relaxed">
            {isLongLie ? (
              <>
                A person has been on the floor for over <strong className="text-red-400">60 seconds</strong>. 
                This is a high-risk medical emergency. Dispatching help immediately.
              </>
            ) : (
              <>
                A person may have fallen. Awaiting ML state recovery...
              </>
            )}
          </p>
        </div>

        {/* Timestamp */}
        <p className="text-xs text-red-900">
          Detected at{" "}
          {new Date().toLocaleTimeString("en-GB", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          })}
        </p>

        {/* Dismiss button */}
        <button
          onClick={onDismiss}
          id="fall-alert-dismiss-btn"
          className="w-full rounded-xl px-6 py-3.5 font-bold text-sm uppercase tracking-widest transition-all duration-200 active:scale-95"
          style={{
            background: "linear-gradient(135deg, #ef4444, #b91c1c)",
            color: "#fff",
            boxShadow: "0 0 20px rgba(239,68,68,0.5)",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.boxShadow =
              "0 0 30px rgba(239,68,68,0.8)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.boxShadow =
              "0 0 20px rgba(239,68,68,0.5)";
          }}
        >
          ✓ Acknowledge & Clear Alert
        </button>
      </div>
    </div>
  );
}
