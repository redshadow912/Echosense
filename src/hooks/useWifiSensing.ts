import { useEffect, useRef, useState, useCallback } from "react";

export type MLClassification = "EMPTY" | "NORMAL" | "FALL" | "STATIC_FLOOR";

export interface Keypoint {
  x: number;
  y: number;
  z: number;
  confidence: number;
}

export interface Vitals {
  heartRate: number;
  breathingRate: number;
}

export interface SensingData {
  vitals: Vitals;
  keypoints: Keypoint[];
  mlClassification?: MLClassification;
  confidenceScore?: number;
}

export type ConnectionStatus =
  | "connecting"
  | "connected"
  | "disconnected"
  | "error";

export const DEFAULT_KEYPOINTS: Keypoint[] = Array.from(
  { length: 17 },
  () => ({
    x: 0,
    y: 0,
    z: 0,
    confidence: 0,
  })
);

const MOCK_KEYPOINTS: Keypoint[] = [
  // 0 - nose
  { x: 0, y: 1.7, z: 0, confidence: 0.9 },
  // 1 - left_eye
  { x: -0.06, y: 1.72, z: 0.05, confidence: 0.9 },
  // 2 - right_eye
  { x: 0.06, y: 1.72, z: 0.05, confidence: 0.9 },
  // 3 - left_ear
  { x: -0.12, y: 1.7, z: 0, confidence: 0.8 },
  // 4 - right_ear
  { x: 0.12, y: 1.7, z: 0, confidence: 0.8 },
  // 5 - left_shoulder
  { x: -0.22, y: 1.45, z: 0, confidence: 0.9 },
  // 6 - right_shoulder
  { x: 0.22, y: 1.45, z: 0, confidence: 0.9 },
  // 7 - left_elbow
  { x: -0.38, y: 1.15, z: 0, confidence: 0.85 },
  // 8 - right_elbow
  { x: 0.38, y: 1.15, z: 0, confidence: 0.85 },
  // 9 - left_wrist
  { x: -0.42, y: 0.85, z: 0, confidence: 0.8 },
  // 10 - right_wrist
  { x: 0.42, y: 0.85, z: 0, confidence: 0.8 },
  // 11 - left_hip
  { x: -0.14, y: 0.95, z: 0, confidence: 0.9 },
  // 12 - right_hip
  { x: 0.14, y: 0.95, z: 0, confidence: 0.9 },
  // 13 - left_knee
  { x: -0.16, y: 0.5, z: 0, confidence: 0.85 },
  // 14 - right_knee
  { x: 0.16, y: 0.5, z: 0, confidence: 0.85 },
  // 15 - left_ankle
  { x: -0.16, y: 0.04, z: 0, confidence: 0.8 },
  // 16 - right_ankle
  { x: 0.16, y: 0.04, z: 0, confidence: 0.8 },
];

function generateMockData(t: number): SensingData {
  const wave = Math.sin(t * 0.002);
  const slowWave = Math.sin(t * 0.0005);

  // Cycle through states to test the Long Lie state machine (120s cycle)
  // 0-20s: NORMAL
  // 20-30s: FALL
  // 30-100s: STATIC_FLOOR (70s duration, triggers Long Lie at 90s total)
  // 100-120s: EMPTY
  const cycleTime = t % 120000;
  let mlClassification: MLClassification = "NORMAL";
  let confidenceScore = 0.95;
  let yOffset = 0;

  if (cycleTime < 20000) {
    mlClassification = "NORMAL";
    yOffset = 0;
  } else if (cycleTime < 30000) {
    mlClassification = "FALL";
    // Simulate dropping down
    const dropProgress = (cycleTime - 20000) / 10000;
    yOffset = -1.4 * dropProgress; // Drop down by up to 1.4m
  } else if (cycleTime < 100000) {
    mlClassification = "STATIC_FLOOR";
    yOffset = -1.4; // On the floor
  } else {
    mlClassification = "EMPTY";
    yOffset = 0;
    confidenceScore = 0.8;
  }

  const keypoints: Keypoint[] = mlClassification === "EMPTY" 
    ? DEFAULT_KEYPOINTS 
    : MOCK_KEYPOINTS.map((kp, i) => ({
        x: kp.x + Math.sin(t * 0.001 + i * 0.5) * 0.015,
        y: kp.y + yOffset + Math.cos(t * 0.0008 + i * 0.3) * 0.01,
        z: kp.z + Math.sin(t * 0.0012 + i * 0.7) * 0.008,
        confidence: kp.confidence,
      }));

  return {
    vitals: {
      heartRate: mlClassification === "EMPTY" ? 0 : Math.round(72 + wave * 8),
      breathingRate: mlClassification === "EMPTY" ? 0 : Math.round(15 + slowWave * 3),
    },
    keypoints,
    mlClassification,
    confidenceScore,
  };
}

const INITIAL_DATA: SensingData = {
  vitals: { heartRate: 72, breathingRate: 15 },
  keypoints: DEFAULT_KEYPOINTS,
  mlClassification: "NORMAL",
  confidenceScore: 1.0,
};

export function useWifiSensing(url: string = "ws://localhost:3000/ws/sensing") {
  const [data, setData] = useState<SensingData>(INITIAL_DATA);
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mockTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isMockModeRef = useRef(false);
  const mountedRef = useRef(false);

  const startMockMode = useCallback(() => {
    if (!mountedRef.current || mockTimerRef.current) return;
    isMockModeRef.current = true;
    setStatus("disconnected");

    const startTime = Date.now();
    mockTimerRef.current = setInterval(() => {
      setData(generateMockData(Date.now() - startTime));
    }, 100);
  }, []);

  const stopMockMode = useCallback(() => {
    if (mockTimerRef.current) {
      clearInterval(mockTimerRef.current);
      mockTimerRef.current = null;
    }
    isMockModeRef.current = false;
  }, []);

  const connect = useCallback(() => {
    if (!mountedRef.current) return;
    try {
      setStatus("connecting");
      const ws = new WebSocket(url);
      wsRef.current = ws;

      const connectionTimeout = setTimeout(() => {
        if (ws.readyState !== WebSocket.OPEN) {
          ws.close();
          startMockMode();
        }
      }, 3000);

      ws.onopen = () => {
        clearTimeout(connectionTimeout);
        stopMockMode();
        setStatus("connected");
      };

      ws.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data as string);
          
          if (parsed?.vitals && Array.isArray(parsed?.keypoints)) {
            const validData: SensingData = {
              vitals: parsed.vitals,
              keypoints: parsed.keypoints,
            };
            
            // Safely extract ML payload if it exists
            if (typeof parsed.mlClassification === "string") {
              validData.mlClassification = parsed.mlClassification as MLClassification;
            }
            if (typeof parsed.confidenceScore === "number") {
              validData.confidenceScore = parsed.confidenceScore;
            }

            setData(validData);
          }
        } catch {
          // ignore malformed messages
        }
      };

      ws.onerror = () => {
        clearTimeout(connectionTimeout);
        startMockMode();
      };

      ws.onclose = () => {
        if (!isMockModeRef.current) {
          startMockMode();
        }
        if (mountedRef.current) {
          reconnectTimerRef.current = setTimeout(() => {
            connect();
          }, 5000);
        }
      };
    } catch {
      startMockMode();
    }
  }, [url, startMockMode, stopMockMode]);

  useEffect(() => {
    mountedRef.current = true;
    connect();
    return () => {
      mountedRef.current = false;
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      if (mockTimerRef.current) clearInterval(mockTimerRef.current);
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
      }
    };
  }, [connect]);

  return { data, status };
}
