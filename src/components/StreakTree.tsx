import { useEffect, useRef, useState, useMemo } from "react";
import confetti from "canvas-confetti";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, ContactShadows } from "@react-three/drei";
import * as THREE from "three";

const KEY = "streak_state_v1";
const FULL_DAYS = 20;

type StreakState = { days: number; lastDate: string; celebrated?: boolean };

const today = () => new Date().toISOString().slice(0, 10);
const yesterday = () => {
  const d = new Date(); d.setDate(d.getDate() - 1); return d.toISOString().slice(0, 10);
};

const FORCE_FULL_KEY = "streak_force_full_v1";

function useStreak() {
  const [state, setState] = useState<StreakState>(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    return { days: 0, lastDate: "", celebrated: false };
  });

  useEffect(() => {
    setState((prev) => {
      // One-time override: force streak to 100%
      if (localStorage.getItem(FORCE_FULL_KEY) !== "1") {
        const next = { days: FULL_DAYS, lastDate: today(), celebrated: false };
        localStorage.setItem(KEY, JSON.stringify(next));
        localStorage.setItem(FORCE_FULL_KEY, "1");
        return next;
      }
      const t = today();
      if (prev.lastDate === t) return prev;
      let days = 1;
      if (prev.lastDate === yesterday()) days = prev.days + 1;
      const next = { days, lastDate: t, celebrated: prev.celebrated && days >= FULL_DAYS };
      localStorage.setItem(KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const markCelebrated = () => {
    setState((p) => {
      const n = { ...p, celebrated: true };
      localStorage.setItem(KEY, JSON.stringify(n));
      return n;
    });
  };

  return { state, markCelebrated };
}

/* ----- 3D realistic tree ----- */

type Branch = {
  start: THREE.Vector3;
  end: THREE.Vector3;
  radius: number;
  depth: number;
};

function buildBranches(): Branch[] {
  const branches: Branch[] = [];
  const grow = (
    start: THREE.Vector3,
    dir: THREE.Vector3,
    length: number,
    radius: number,
    depth: number
  ) => {
    if (depth > 4 || length < 0.12) return;
    const end = start.clone().add(dir.clone().multiplyScalar(length));
    branches.push({ start, end, radius, depth });
    const splits = depth === 0 ? 1 : depth < 3 ? 2 : 2;
    for (let i = 0; i < splits; i++) {
      const tilt = (Math.PI / 5) + Math.random() * (Math.PI / 6);
      const yaw =
        depth === 0
          ? Math.random() * Math.PI * 2
          : (Math.PI * 2 * i) / splits + Math.random() * 0.8;
      const axis = new THREE.Vector3(Math.cos(yaw), 0, Math.sin(yaw)).normalize();
      const newDir = dir
        .clone()
        .applyAxisAngle(axis, tilt)
        .normalize();
      // Slight upward bias
      newDir.y = Math.max(newDir.y, 0.15);
      newDir.normalize();
      grow(end, newDir, length * (0.66 + Math.random() * 0.1), radius * 0.66, depth + 1);
    }
  };
  grow(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 1, 0), 1.6, 0.18, 0);
  return branches;
}

function BranchMesh({ branch }: { branch: Branch }) {
  const ref = useRef<THREE.Mesh>(null);
  const { position, quaternion, length } = useMemo(() => {
    const dir = new THREE.Vector3().subVectors(branch.end, branch.start);
    const length = dir.length();
    const mid = branch.start.clone().add(dir.clone().multiplyScalar(0.5));
    const up = new THREE.Vector3(0, 1, 0);
    const quat = new THREE.Quaternion().setFromUnitVectors(up, dir.clone().normalize());
    return { position: mid, quaternion: quat, length };
  }, [branch]);
  return (
    <mesh ref={ref} position={position} quaternion={quaternion} castShadow>
      <cylinderGeometry args={[branch.radius * 0.7, branch.radius, length, 10]} />
      <meshStandardMaterial color="#5b3a22" roughness={0.95} metalness={0} />
    </mesh>
  );
}

function Leaves({ positions, progress }: { positions: THREE.Vector3[]; progress: number }) {
  const group = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (!group.current) return;
    const t = state.clock.getElapsedTime();
    group.current.children.forEach((child, i) => {
      child.position.y += Math.sin(t * 1.5 + i) * 0.0008;
      child.rotation.y += 0.002;
    });
  });
  return (
    <group ref={group}>
      {positions.map((p, i) => {
        const reveal = i / positions.length;
        const visible = progress >= reveal * 0.95;
        if (!visible) return null;
        const tone = 0.42 + ((i * 37) % 100) / 600; // green variation
        const color = new THREE.Color().setHSL(0.28 + Math.random() * 0.05, 0.55, tone);
        const scale = 0.32 + ((i * 53) % 100) / 320;
        return (
          <mesh key={i} position={p} castShadow>
            <icosahedronGeometry args={[scale, 1]} />
            <meshStandardMaterial
              color={color}
              roughness={0.85}
              flatShading
            />
          </mesh>
        );
      })}
    </group>
  );
}

function TreeScene({ progress }: { progress: number }) {
  const branches = useMemo(() => {
    // Deterministic per session via Math.random seed isn't built-in; cache the result
    return buildBranches();
  }, []);

  const leafPositions = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    branches.forEach((b) => {
      if (b.depth >= 2) {
        const cluster = 6 + b.depth * 3;
        for (let i = 0; i < cluster; i++) {
          const jitter = new THREE.Vector3(
            (Math.random() - 0.5) * 0.7,
            (Math.random() - 0.2) * 0.6,
            (Math.random() - 0.5) * 0.7
          );
          pts.push(b.end.clone().add(jitter));
        }
      }
    });
    // Sort by height so leaves grow bottom→top
    return pts.sort((a, b) => a.y - b.y);
  }, [branches]);

  const visibleBranchCount = Math.ceil(branches.length * Math.max(0.15, progress));

  const groupRef = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (groupRef.current) groupRef.current.rotation.y += delta * 0.12;
  });

  // Grow scale subtly with progress
  const scale = 0.5 + progress * 0.55;

  return (
    <>
      <ambientLight intensity={0.45} />
      <directionalLight
        position={[5, 8, 4]}
        intensity={1.1}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <Environment preset="park" />

      <group ref={groupRef} position={[0, -1.2, 0]} scale={scale}>
        {/* Ground mound */}
        <mesh receiveShadow position={[0, -0.05, 0]}>
          <cylinderGeometry args={[1.4, 1.6, 0.12, 32]} />
          <meshStandardMaterial color="#3b5e2e" roughness={1} />
        </mesh>
        <mesh receiveShadow position={[0, 0.01, 0]}>
          <cylinderGeometry args={[1.1, 1.25, 0.04, 32]} />
          <meshStandardMaterial color="#4a7a3a" roughness={1} />
        </mesh>

        {/* Branches */}
        {branches.slice(0, visibleBranchCount).map((b, i) => (
          <BranchMesh key={i} branch={b} />
        ))}

        {/* Leaves */}
        <Leaves positions={leafPositions} progress={progress} />
      </group>

      <ContactShadows
        position={[0, -1.18, 0]}
        opacity={0.55}
        scale={6}
        blur={2.4}
        far={3}
      />
    </>
  );
}

const StreakTree = ({ language = "en" }: { language?: "en" | "ar" }) => {
  const { state, markCelebrated } = useStreak();
  const progress = Math.min(state.days / FULL_DAYS, 1);
  const pct = Math.round(progress * 100);

  useEffect(() => {
    if (state.days >= FULL_DAYS && !state.celebrated) {
      const end = Date.now() + 4000;
      const burst = () => {
        confetti({ particleCount: 80, spread: 80, origin: { y: 0.7 } });
        confetti({ particleCount: 60, spread: 100, angle: 60, origin: { x: 0, y: 0.8 } });
        confetti({ particleCount: 60, spread: 100, angle: 120, origin: { x: 1, y: 0.8 } });
        if (Date.now() < end) setTimeout(burst, 700);
      };
      burst();
      markCelebrated();
    }
  }, [state.days, state.celebrated, markCelebrated]);

  const T = language === "ar"
    ? { days: state.days === 1 ? "يوم" : "يوماً", label: "سلسلة المثابرة", full: "اكتملت الشجرة! 🎉" }
    : { days: state.days === 1 ? "day" : "days", label: "Your streak", full: "Tree fully grown! 🎉" };

  return (
    <section dir={language === "ar" ? "rtl" : "ltr"} className="w-full mt-12 mb-6">
      <div className="mx-auto max-w-md rounded-xl border border-border bg-card p-6">
        <div className="h-72 rounded-lg overflow-hidden bg-gradient-to-b from-sky-100 to-emerald-50 dark:from-slate-900 dark:to-slate-800">
          <Canvas
            shadows
            camera={{ position: [2.4, 1.6, 3.2], fov: 38 }}
            dpr={[1, 2]}
          >
            <TreeScene progress={progress} />
          </Canvas>
        </div>
        <div className="mt-4 text-center">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">{T.label}</p>
          <p className="text-3xl font-semibold text-foreground mt-1">
            {state.days} <span className="text-base font-normal text-muted-foreground">{T.days}</span>
          </p>
          <div className="mt-4 h-1.5 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-foreground transition-all duration-700"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {progress >= 1 ? T.full : `${pct}% · ${FULL_DAYS - state.days} ${language === "ar" ? "يوم متبقي" : "days to go"}`}
          </p>
        </div>
      </div>
    </section>
  );
};

export default StreakTree;
