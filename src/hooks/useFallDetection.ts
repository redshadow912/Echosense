import { useEffect, useRef, useState, useCallback } from "react";
import type { MLClassification } from "./useWifiSensing";

const LONG_LIE_THRESHOLD_MS = 60000;

export interface FallDetectionResult {
  isFallDetected: boolean;
  isLongLie: boolean;
  fallDuration: number; // in seconds
  dismiss: () => void;
}

export function useFallDetection(
  mlClassification?: MLClassification,
  confidenceScore?: number
): FallDetectionResult {
  const [isFallDetected, setIsFallDetected] = useState(false);
  const [isLongLie, setIsLongLie] = useState(false);
  const [fallDuration, setFallDuration] = useState(0);

  const fallStartTimeRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const dismissedRef = useRef(false);

  const clearFallTimers = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    fallStartTimeRef.current = null;
    setFallDuration(0);
  }, []);

  const dismiss = useCallback(() => {
    setIsFallDetected(false);
    setIsLongLie(false);
    clearFallTimers();
    dismissedRef.current = true;
    
    // Prevent immediate re-triggering for 5 seconds
    setTimeout(() => {
      dismissedRef.current = false;
    }, 5000);
  }, [clearFallTimers]);

  useEffect(() => {
    // Treat undefined confidence as 1.0 (for default states without ML payload yet)
    const confidence = confidenceScore ?? 1.0;
    
    // Ignore classifications with low confidence
    if (confidence < 0.75) {
      return;
    }

    if (dismissedRef.current) {
      return;
    }

    const isFallenState = mlClassification === "FALL" || mlClassification === "STATIC_FLOOR";

    if (isFallenState) {
      if (fallStartTimeRef.current === null) {
        // Start tracking the fall
        fallStartTimeRef.current = Date.now();
        setIsFallDetected(true);
        
        // Start a timer to update the duration and check for Long Lie
        intervalRef.current = setInterval(() => {
          if (fallStartTimeRef.current) {
            const elapsed = Date.now() - fallStartTimeRef.current;
            setFallDuration(Math.floor(elapsed / 1000));
            
            if (elapsed >= LONG_LIE_THRESHOLD_MS) {
              setIsLongLie(true);
            }
          }
        }, 1000);
      }
    } else if (mlClassification === "NORMAL" || mlClassification === "EMPTY") {
      // Person recovered or left the room
      if (isFallDetected || isLongLie) {
        setIsFallDetected(false);
        setIsLongLie(false);
        clearFallTimers();
      }
    }

    // Cleanup on unmount or dependency change
    return () => {
      if (!isFallenState && intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [mlClassification, confidenceScore, isFallDetected, isLongLie, clearFallTimers]);

  // Clean up on unmount
  useEffect(() => {
    return clearFallTimers;
  }, [clearFallTimers]);

  return {
    isFallDetected,
    isLongLie,
    fallDuration,
    dismiss,
  };
}
