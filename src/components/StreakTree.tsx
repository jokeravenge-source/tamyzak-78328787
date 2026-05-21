import { Canvas, useFrame } from "@react-three/fiber";
import { Float, OrbitControls } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState } from "react";
import confetti from "canvas-confetti";
import type { Group } from "three";

const KEY = "streak_state_v1";
const FULL_DAYS = 20; // 5% per day

type StreakState = { days: number; lastDate: string; celebrated?: boolean };

const today = () => new Date().toISOString().slice(0, 10);
const yesterday = () => {
  const d = new Date(); d.setDate(d.getDate() - 1); return d.toISOString().slice(0, 10);
};

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
      const t = today();
      if (prev.lastDate === t) return prev;
      let days = 1;
      if (prev.lastDate === yesterday()) days = prev.days + 1;
      const next = { ...prev, days, lastDate: t, celebrated: prev.celebrated && days >= FULL_DAYS };
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

function Tree({ progress }: { progress: number }) {
  const group = useRef<Group>(null);
  useFrame((_, dt) => {
    if (group.current) group.current.rotation.y += dt * 0.25;
  });
  // progress 0..1
  const trunkHeight = 0.4 + progress * 1.3;
  const foliageScale = 0.25 + progress * 1.1;
  const foliageY = trunkHeight + foliageScale * 0.6;

  // layered foliage cones
  const layers = useMemo(() => [
    { y: 0, s: 1.0 },
    { y: 0.55, s: 0.78 },
    { y: 1.0, s: 0.55 },
  ], []);

  return (
    <group ref={group} position={[0, -1.2, 0]}>
      {/* Ground disc */}
      <mesh position={[0, -0.05, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[1.8, 48]} />
        <meshStandardMaterial color="#3a2a1a" />
      </mesh>
      {/* Trunk */}
      <mesh position={[0, trunkHeight / 2, 0]} castShadow>
        <cylinderGeometry args={[0.12 + progress * 0.08, 0.18 + progress * 0.1, trunkHeight, 16]} />
        <meshStandardMaterial color="#6b3a1f" roughness={0.9} />
      </mesh>
      {/* Foliage layered cones */}
      {progress > 0.02 && (
        <group position={[0, foliageY, 0]} scale={foliageScale}>
          {layers.map((l, i) => (
            <mesh key={i} position={[0, l.y, 0]} castShadow>
              <coneGeometry args={[l.s, l.s * 1.3, 24]} />
              <meshStandardMaterial color={i === 2 ? "#7fd47f" : i === 1 ? "#4fae5a" : "#2f8f47"} roughness={0.7} />
            </mesh>
          ))}
        </group>
      )}
      {/* Sparkle ornaments when full */}
      {progress >= 1 && (
        <group position={[0, foliageY, 0]} scale={foliageScale}>
          {Array.from({ length: 12 }).map((_, i) => {
            const a = (i / 12) * Math.PI * 2;
            return (
              <mesh key={i} position={[Math.cos(a) * 0.7, 0.4 + Math.sin(a * 2) * 0.2, Math.sin(a) * 0.7]}>
                <sphereGeometry args={[0.07, 16, 16]} />
                <meshStandardMaterial color="#ffd24a" emissive="#ffa800" emissiveIntensity={0.8} />
              </mesh>
            );
          })}
        </group>
      )}
    </group>
  );
}

const StreakTree = ({ language = "en" }: { language?: "en" | "ar" }) => {
  const { state, markCelebrated } = useStreak();
  const progress = Math.min(state.days / FULL_DAYS, 1);
  const pct = Math.round(progress * 100);

  // Fire celebration once when full reached
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
      <div className="mx-auto max-w-3xl rounded-3xl border border-primary/30 bg-gradient-to-b from-secondary/40 to-secondary/10 backdrop-blur p-4 md:p-6">
        <div className="h-64 md:h-80 rounded-2xl overflow-hidden bg-gradient-to-b from-sky-900/30 to-emerald-900/20">
          <Canvas shadows camera={{ position: [2.6, 1.6, 3.2], fov: 45 }}>
            <ambientLight intensity={0.6} />
            <directionalLight position={[4, 6, 3]} intensity={1.1} castShadow />
            <Float speed={1.2} rotationIntensity={0.2} floatIntensity={0.4}>
              <Tree progress={progress} />
            </Float>
            <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={0.6} />
          </Canvas>
        </div>
        <div className="mt-4 text-center">
          <p className="text-sm uppercase tracking-widest text-muted-foreground">{T.label}</p>
          <p className="text-3xl md:text-4xl font-bold gradient-text mt-1">{state.days} {T.days}</p>
          <div className="mt-3 h-2 w-full max-w-md mx-auto rounded-full bg-muted overflow-hidden">
            <div className="h-full bg-primary transition-all duration-700" style={{ width: `${pct}%` }} />
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {progress >= 1 ? T.full : `${pct}%`}
          </p>
        </div>
      </div>
    </section>
  );
};

export default StreakTree;
