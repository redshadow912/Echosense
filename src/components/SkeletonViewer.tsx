"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Grid } from "@react-three/drei";
import * as THREE from "three";
import type { Keypoint } from "@/hooks/useWifiSensing";

// COCO 17-keypoint skeleton connections
const COCO_CONNECTIONS: [number, number][] = [
  // Head
  [0, 1], [0, 2], [1, 3], [2, 4],
  // Neck / shoulders
  [5, 6],
  // Torso
  [5, 11], [6, 12], [11, 12],
  // Left arm
  [5, 7], [7, 9],
  // Right arm
  [6, 8], [8, 10],
  // Left leg
  [11, 13], [13, 15],
  // Right leg
  [12, 14], [14, 16],
];

// Left (blue), right (violet), center (emerald)
const LEFT = new THREE.Color("#38bdf8");
const RIGHT = new THREE.Color("#a78bfa");
const CENTER = new THREE.Color("#34d399");

const LEFT_SET = new Set([1, 3, 5, 7, 9, 11, 13, 15]);
const RIGHT_SET = new Set([2, 4, 6, 8, 10, 12, 14, 16]);

function boneColor(a: number, b: number): THREE.Color {
  if (LEFT_SET.has(a) || LEFT_SET.has(b)) return LEFT;
  if (RIGHT_SET.has(a) || RIGHT_SET.has(b)) return RIGHT;
  return CENTER;
}

// ── Single bone rendered as a glowing tube ──────────────────────
interface BoneProps {
  from: Keypoint;
  to: Keypoint;
  color: THREE.Color;
}

function Bone({ from, to, color }: BoneProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  const { direction, length, midpoint, quaternion } = useMemo(() => {
    const a = new THREE.Vector3(from.x, from.y, from.z);
    const b = new THREE.Vector3(to.x, to.y, to.z);
    const dir = b.clone().sub(a);
    const len = dir.length();
    const mid = a.clone().add(b).multiplyScalar(0.5);

    // Quaternion to rotate a cylinder (default axis: Y) to the bone direction
    const q = new THREE.Quaternion();
    q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());

    return { direction: dir, length: len, midpoint: mid, quaternion: q };
  }, [from.x, from.y, from.z, to.x, to.y, to.z]);

  const opacity = Math.min(from.confidence, to.confidence);

  if (length < 0.001) return null;

  return (
    <mesh
      ref={meshRef}
      position={[midpoint.x, midpoint.y, midpoint.z]}
      quaternion={quaternion}
    >
      <cylinderGeometry args={[0.008, 0.008, length, 6]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={1.2}
        transparent
        opacity={0.4 + opacity * 0.6}
        roughness={0.3}
        metalness={0.1}
      />
    </mesh>
  );
}

// ── Joint sphere ─────────────────────────────────────────────────
function Joint({ kp, index }: { kp: Keypoint; index: number }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const isHead = index <= 4;

  useFrame((state) => {
    if (meshRef.current) {
      const t = state.clock.elapsedTime;
      const pulse = 1 + Math.sin(t * 3 + index) * 0.15;
      meshRef.current.scale.setScalar(pulse);
    }
  });

  return (
    <mesh ref={meshRef} position={[kp.x, kp.y, kp.z]}>
      <sphereGeometry args={[isHead ? 0.025 : 0.016, 10, 10]} />
      <meshStandardMaterial
        color="#ffffff"
        emissive="#a5f3fc"
        emissiveIntensity={0.8}
        transparent
        opacity={0.5 + kp.confidence * 0.5}
        roughness={0.1}
      />
    </mesh>
  );
}

// ── Glow halo (sprite-based) ─────────────────────────────────────
function GlowHalo({ position }: { position: [number, number, number] }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ camera }) => {
    if (ref.current) ref.current.quaternion.copy(camera.quaternion);
  });
  return (
    <mesh ref={ref} position={position}>
      <planeGeometry args={[0.12, 0.12]} />
      <meshBasicMaterial
        color="#38bdf8"
        transparent
        opacity={0.08}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}

// ── Main skeleton group ──────────────────────────────────────────
interface SkeletonProps {
  keypoints: Keypoint[];
}

function SkeletonMesh({ keypoints }: SkeletonProps) {
  const groupRef = useRef<THREE.Group>(null);

  // Slow auto-rotate when no orbit interaction
  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.12;
    }
  });

  const hasData = keypoints.some((k) => k.confidence > 0.3);

  return (
    <group ref={groupRef}>
      {/* Bones */}
      {COCO_CONNECTIONS.map(([a, b], i) => {
        const kpA = keypoints[a];
        const kpB = keypoints[b];
        if (!kpA || !kpB) return null;
        return (
          <Bone
            key={`bone-${i}`}
            from={kpA}
            to={kpB}
            color={boneColor(a, b)}
          />
        );
      })}

      {/* Joints */}
      {keypoints.map((kp, i) =>
        kp.confidence > 0.1 ? (
          <Joint key={`joint-${i}`} kp={kp} index={i} />
        ) : null
      )}

      {/* Glow halos on major joints */}
      {hasData &&
        [0, 5, 6, 11, 12].map((i) =>
          keypoints[i]?.confidence > 0.3 ? (
            <GlowHalo
              key={`halo-${i}`}
              position={[keypoints[i].x, keypoints[i].y, keypoints[i].z]}
            />
          ) : null
        )}
    </group>
  );
}

// ── Canvas wrapper ───────────────────────────────────────────────
interface SkeletonViewerProps {
  keypoints: Keypoint[];
  className?: string;
}

export default function SkeletonViewer({
  keypoints,
  className = "",
}: SkeletonViewerProps) {
  return (
    <div className={`w-full h-full ${className}`}>
      <Canvas
        camera={{ position: [0, 1.0, 2.8], fov: 52 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: "transparent" }}
      >
        {/* Lighting */}
        <ambientLight intensity={0.25} />
        <pointLight position={[2, 3, 2]} intensity={2} color="#38bdf8" />
        <pointLight position={[-2, 1, -1]} intensity={1} color="#a78bfa" />
        <pointLight position={[0, 0, 2]} intensity={0.6} color="#34d399" />

        <SkeletonMesh keypoints={keypoints} />

        <Grid
          args={[4, 4]}
          position={[0, 0, 0]}
          cellColor="#1e3a5f"
          sectionColor="#0f2d4a"
          fadeDistance={5}
          fadeStrength={1}
          infiniteGrid={false}
        />

        <OrbitControls
          enableZoom
          enablePan={false}
          minDistance={1.2}
          maxDistance={6}
          autoRotate={false}
        />
      </Canvas>
    </div>
  );
}
