import { useEffect, useRef, useState, useCallback } from "react";
import type { Keypoint } from "./useWifiSensing";

const HEAD_IDX = 0;
const FALL_Y_THRESHOLD = 0.35;    // head below this height = floor-level
const VELOCITY_THRESHOLD = -0.8;  // m/s — rapid downward drop
const FALL_HOLD_MS = 3000;        // must stay low for 3 s to confirm

export interface FallDetectionResult {
  isFallDetected: boolean;
  headVelocity: number;  // m/s (negative = falling)
  headY: number;
  dismiss: () => void;
}

export function useFallDetection(keypoints: Keypoint[]): FallDetectionResult {
  const [isFallDetected, setIsFallDetected] = useState(false);
  const headYRef = useRef<number>(1.7);
  const prevHeadYRef = useRef<number>(1.7);
  const prevTimeRef = useRef<number>(Date.now());
  const velocityRef = useRef<number>(0);
  const lowStartRef = useRef<number | null>(null);  // timestamp when head went low
  const dismissedRef = useRef(false);

  const dismiss = useCallback(() => {
    setIsFallDetected(false);
    dismissedRef.current = true;
    lowStartRef.current = null;
    // Allow re-detection after 5 s
    setTimeout(() => {
      dismissedRef.current = false;
    }, 5000);
  }, []);

  useEffect(() => {
    const head = keypoints[HEAD_IDX];
    if (!head || head.confidence < 0.3) return;

    const now = Date.now();
    const dt = Math.max((now - prevTimeRef.current) / 1000, 0.016); // seconds
    const currentY = head.y;
    const velocity = (currentY - prevHeadYRef.current) / dt;

    // Smooth velocity with low-pass filter (EMA α=0.4)
    velocityRef.current = velocityRef.current * 0.6 + velocity * 0.4;

    prevHeadYRef.current = currentY;
    prevTimeRef.current = now;
    headYRef.current = currentY;

    if (dismissedRef.current || isFallDetected) return;

    const isLow = currentY < FALL_Y_THRESHOLD;
    const isRapid = velocityRef.current < VELOCITY_THRESHOLD;

    if (isLow) {
      if (lowStartRef.current === null) {
        // Start timing the low period only if there was a rapid drop recently
        if (isRapid) {
          lowStartRef.current = now;
        } else {
          // Gentle low detection (e.g. person sitting slowly)
          lowStartRef.current = now;
        }
      } else {
        const lowDuration = now - lowStartRef.current;
        if (lowDuration >= FALL_HOLD_MS) {
          setIsFallDetected(true);
        }
      }
    } else {
      // Head rose again — reset low timer
      lowStartRef.current = null;
    }
  }, [keypoints, isFallDetected]);

  return {
    isFallDetected,
    headVelocity: velocityRef.current,
    headY: headYRef.current,
    dismiss,
  };
}
