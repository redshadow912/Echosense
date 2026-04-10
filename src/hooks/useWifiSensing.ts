
import { useEffect, useRef, useState, useCallback } from "react";

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

  const keypoints: Keypoint[] = MOCK_KEYPOINTS.map((kp, i) => ({
    x: kp.x + Math.sin(t * 0.001 + i * 0.5) * 0.015,
    y: kp.y + Math.cos(t * 0.0008 + i * 0.3) * 0.01,
    z: kp.z + Math.sin(t * 0.0012 + i * 0.7) * 0.008,
    confidence: kp.confidence,
  }));

  return {
    vitals: {
      heartRate: Math.round(72 + wave * 8),
      breathingRate: Math.round(15 + slowWave * 3),
    },
    keypoints,
  };
}

const INITIAL_DATA: SensingData = {
  vitals: { heartRate: 72, breathingRate: 15 },
  keypoints: DEFAULT_KEYPOINTS,
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
          const parsed: SensingData = JSON.parse(event.data as string);
          if (parsed?.vitals && Array.isArray(parsed?.keypoints)) {
            setData(parsed);
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
