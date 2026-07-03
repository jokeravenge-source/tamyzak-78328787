import { Suspense, useRef, useState } from "react";
import { Canvas, useFrame, ThreeEvent } from "@react-three/fiber";
import { OrbitControls, Grid, Environment, Html } from "@react-three/drei";
import { ArrowLeft, Atom, RotateCcw } from "lucide-react";
import * as THREE from "three";
import type { AppLanguage } from "@/components/LanguageGate";

type ActivityKey = "capacitor";

const copy = {
  en: {
    title: "Physics Activities",
    subtitle: "Interactive 3D experiments — drag to rotate the camera, drag the dielectric to slide it in and out.",
    back: "Back",
    pick: "Pick an activity",
    controls: "Controls",
    reset: "Reset",
    activities: {
      capacitor: {
        name: "Capacitor & Dielectric",
        desc: "An isolated charged parallel-plate capacitor connected to a voltmeter. Slide the dielectric slab into the gap — the voltmeter reading drops. Pull it out — the reading rises again.",
      },
    },
    labels: {
      insertion: "Dielectric insertion",
      kappa: "Dielectric constant κ",
      v0: "Initial voltage V₀ (V)",
      voltage: "Voltmeter reading",
      hint: "Tip: drag the blue slab left/right, or use the slider below.",
    },
  },
  ar: {
    title: "أنشطة الفيزياء",
    subtitle: "تجارب ثلاثية الأبعاد تفاعلية — اسحب لتدوير الكاميرا، واسحب العازل لإدخاله وإخراجه من المكثف.",
    back: "رجوع",
    pick: "اختر نشاطاً",
    controls: "الإعدادات",
    reset: "إعادة",
    activities: {
      capacitor: {
        name: "مكثف وعازل",
        desc: "مكثف بلوحين متوازيين مشحون ومعزول موصول بفولتمتر. أدخل العازل بين اللوحين فتنخفض قراءة الفولتمتر، وأخرجه فترتفع القراءة مرة أخرى.",
      },
    },
    labels: {
      insertion: "مقدار إدخال العازل",
      kappa: "ثابت العازل κ",
      v0: "الجهد الابتدائي V₀ (فولت)",
      voltage: "قراءة الفولتمتر",
      hint: "تلميح: اسحب اللوح الأزرق يميناً ويساراً، أو استخدم شريط التمرير أدناه.",
    },
  },
} as const;

// ---------- shared 3D helpers ----------

const FloorGrid = () => (
  <Grid
    args={[20, 20]}
    cellSize={1}
    cellThickness={0.6}
    cellColor="#334155"
    sectionSize={5}
    sectionThickness={1.2}
    sectionColor="#64748b"
    fadeDistance={30}
    infiniteGrid
    position={[0, -0.01, 0]}
  />
);

// ---------- Pendulum ----------

const Pendulum = ({
  length,
  gravity,
  playing,
  resetKey,
}: {
  length: number;
  gravity: number;
  playing: boolean;
  resetKey: number;
}) => {
  const theta = useRef(Math.PI / 4);
  const omega = useRef(0);
  const group = useRef<THREE.Group>(null);

  useMemo(() => {
    theta.current = Math.PI / 4;
    omega.current = 0;
  }, [resetKey]);

  useFrame((_s, dt) => {
    if (!playing) return;
    const step = Math.min(dt, 1 / 30);
    const alpha = -(gravity / length) * Math.sin(theta.current);
    omega.current += alpha * step;
    omega.current *= 0.999;
    theta.current += omega.current * step;
    if (group.current) group.current.rotation.z = theta.current;
  });

  const bobY = -length;
  return (
    <group position={[0, 3, 0]}>
      <mesh>
        <cylinderGeometry args={[1.5, 1.5, 0.1, 32]} />
        <meshStandardMaterial color="#1e293b" />
      </mesh>
      <group ref={group}>
        <mesh position={[0, bobY / 2, 0]}>
          <cylinderGeometry args={[0.03, 0.03, length, 8]} />
          <meshStandardMaterial color="#94a3b8" />
        </mesh>
        <mesh position={[0, bobY, 0]} castShadow>
          <sphereGeometry args={[0.35, 32, 32]} />
          <meshStandardMaterial color="#3b82f6" metalness={0.4} roughness={0.3} />
        </mesh>
      </group>
    </group>
  );
};

// ---------- Projectile ----------

const Projectile = ({
  speed,
  angleDeg,
  gravity,
  playing,
  resetKey,
}: {
  speed: number;
  angleDeg: number;
  gravity: number;
  playing: boolean;
  resetKey: number;
}) => {
  const t = useRef(0);
  const landed = useRef(false);
  const ball = useRef<THREE.Mesh>(null);

  useMemo(() => {
    t.current = 0;
    landed.current = false;
  }, [resetKey, speed, angleDeg, gravity]);

  useFrame((_s, dt) => {
    if (!playing || landed.current) return;
    t.current += Math.min(dt, 1 / 30);
    const rad = (angleDeg * Math.PI) / 180;
    const vx = speed * Math.cos(rad);
    const vy = speed * Math.sin(rad);
    const x = vx * t.current;
    const y = vy * t.current - 0.5 * gravity * t.current * t.current;
    if (y <= 0 && t.current > 0.05) {
      landed.current = true;
      if (ball.current) ball.current.position.set(x, 0.25, 0);
      return;
    }
    if (ball.current) ball.current.position.set(x, y + 0.25, 0);
  });

  return (
    <group>
      <mesh position={[0, 0.05, 0]}>
        <boxGeometry args={[0.8, 0.1, 0.8]} />
        <meshStandardMaterial color="#f59e0b" />
      </mesh>
      <mesh ref={ball} position={[0, 0.25, 0]} castShadow>
        <sphereGeometry args={[0.25, 24, 24]} />
        <meshStandardMaterial color="#ef4444" />
      </mesh>
    </group>
  );
};

// ---------- Inclined plane ----------

const Incline = ({
  angleDeg,
  friction,
  gravity,
  playing,
  resetKey,
}: {
  angleDeg: number;
  friction: number;
  gravity: number;
  playing: boolean;
  resetKey: number;
}) => {
  const s = useRef(0);
  const v = useRef(0);
  const block = useRef<THREE.Mesh>(null);
  const rampLen = 8;
  const rad = (angleDeg * Math.PI) / 180;

  useMemo(() => {
    s.current = 0;
    v.current = 0;
  }, [resetKey, angleDeg, friction]);

  useFrame((_st, dt) => {
    if (!playing) return;
    const step = Math.min(dt, 1 / 30);
    const a = gravity * (Math.sin(rad) - friction * Math.cos(rad));
    if (a > 0) {
      v.current += a * step;
      s.current += v.current * step;
    }
    if (s.current > rampLen) s.current = rampLen;
    if (block.current) {
      const x = -rampLen / 2 * Math.cos(rad) + s.current * Math.cos(rad);
      const y = rampLen / 2 * Math.sin(rad) - s.current * Math.sin(rad) + 0.3;
      block.current.position.set(x, y, 0);
      block.current.rotation.z = -rad;
    }
  });

  return (
    <group>
      <mesh rotation={[0, 0, rad]} position={[0, 0, 0]}>
        <boxGeometry args={[rampLen, 0.2, 3]} />
        <meshStandardMaterial color="#334155" />
      </mesh>
      <mesh ref={block} castShadow>
        <boxGeometry args={[0.7, 0.7, 0.7]} />
        <meshStandardMaterial color="#22c55e" />
      </mesh>
    </group>
  );
};

// ---------- Spring / SHM ----------

const Spring = ({
  k,
  mass,
  amplitude,
  playing,
  resetKey,
}: {
  k: number;
  mass: number;
  amplitude: number;
  playing: boolean;
  resetKey: number;
}) => {
  const t = useRef(0);
  const box = useRef<THREE.Mesh>(null);
  const coil = useRef<THREE.Mesh>(null);

  useMemo(() => {
    t.current = 0;
  }, [resetKey]);

  useFrame((_s, dt) => {
    if (!playing) return;
    t.current += Math.min(dt, 1 / 30);
    const omega = Math.sqrt(k / Math.max(mass, 0.01));
    const x = amplitude * Math.cos(omega * t.current);
    if (box.current) box.current.position.y = x;
    if (coil.current) {
      const len = 3 + x;
      coil.current.scale.y = len / 3;
      coil.current.position.y = len / 2 + 1;
    }
  });

  return (
    <group position={[0, 0, 0]}>
      <mesh position={[0, 5, 0]}>
        <boxGeometry args={[3, 0.2, 1]} />
        <meshStandardMaterial color="#1e293b" />
      </mesh>
      <mesh ref={coil} position={[0, 2.5, 0]}>
        <cylinderGeometry args={[0.15, 0.15, 3, 12]} />
        <meshStandardMaterial color="#94a3b8" wireframe />
      </mesh>
      <mesh ref={box} position={[0, 0, 0]} castShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#8b5cf6" metalness={0.3} roughness={0.4} />
      </mesh>
    </group>
  );
};

// ---------- Orbit ----------

const Orbit = ({
  radius,
  speed,
  playing,
  resetKey,
}: {
  radius: number;
  speed: number;
  playing: boolean;
  resetKey: number;
}) => {
  const t = useRef(0);
  const planet = useRef<THREE.Mesh>(null);

  useMemo(() => {
    t.current = 0;
  }, [resetKey]);

  useFrame((_s, dt) => {
    if (!playing) return;
    t.current += Math.min(dt, 1 / 30) * speed;
    if (planet.current) {
      planet.current.position.set(
        Math.cos(t.current) * radius,
        0,
        Math.sin(t.current) * radius,
      );
    }
  });

  const orbitPoints = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 64; i++) {
      const a = (i / 64) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(a) * radius, 0, Math.sin(a) * radius));
    }
    return pts;
  }, [radius]);

  const orbitGeom = useMemo(() => new THREE.BufferGeometry().setFromPoints(orbitPoints), [orbitPoints]);

  return (
    <group>
      <mesh>
        <sphereGeometry args={[0.9, 32, 32]} />
        <meshStandardMaterial color="#f59e0b" emissive="#f97316" emissiveIntensity={0.6} />
      </mesh>
      <primitive object={new THREE.Line(orbitGeom, new THREE.LineBasicMaterial({ color: "#475569" }))} />
      <mesh ref={planet} castShadow>
        <sphereGeometry args={[0.35, 24, 24]} />
        <meshStandardMaterial color="#3b82f6" />
      </mesh>
    </group>
  );
};

// ---------- Scene wrapper ----------

const Slider = ({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) => (
  <label className="block">
    <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
      <span>{label}</span>
      <span className="text-foreground font-mono">{value.toFixed(2)}</span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(parseFloat(e.currentTarget.value))}
      className="w-full accent-primary"
    />
  </label>
);

const PhysicsActivities = ({
  language,
  onBack,
}: {
  language: AppLanguage;
  onBack: () => void;
}) => {
  const isRTL = language === "ar";
  const t = copy[language];
  const [activity, setActivity] = useState<ActivityKey>("pendulum");
  const [playing, setPlaying] = useState(true);
  const [resetKey, setResetKey] = useState(0);

  // per-activity params
  const [length, setLength] = useState(2);
  const [gravity, setGravity] = useState(9.81);
  const [speed, setSpeed] = useState(8);
  const [angle, setAngle] = useState(45);
  const [rampAngle, setRampAngle] = useState(25);
  const [friction, setFriction] = useState(0.1);
  const [k, setK] = useState(20);
  const [mass, setMass] = useState(1);
  const [amplitude, setAmplitude] = useState(1.2);
  const [orbitR, setOrbitR] = useState(3);
  const [orbitSpeed, setOrbitSpeed] = useState(1);

  const reset = () => setResetKey((v) => v + 1);

  const renderScene = () => {
    switch (activity) {
      case "pendulum":
        return <Pendulum length={length} gravity={gravity} playing={playing} resetKey={resetKey} />;
      case "projectile":
        return <Projectile speed={speed} angleDeg={angle} gravity={gravity} playing={playing} resetKey={resetKey} />;
      case "incline":
        return <Incline angleDeg={rampAngle} friction={friction} gravity={gravity} playing={playing} resetKey={resetKey} />;
      case "spring":
        return <Spring k={k} mass={mass} amplitude={amplitude} playing={playing} resetKey={resetKey} />;
      case "orbit":
        return <Orbit radius={orbitR} speed={orbitSpeed} playing={playing} resetKey={resetKey} />;
    }
  };

  const renderControls = () => {
    switch (activity) {
      case "pendulum":
        return (
          <>
            <Slider label={t.labels.length} value={length} min={0.5} max={5} step={0.1} onChange={setLength} />
            <Slider label={t.labels.gravity} value={gravity} min={1} max={25} step={0.1} onChange={setGravity} />
          </>
        );
      case "projectile":
        return (
          <>
            <Slider label={t.labels.speed} value={speed} min={1} max={20} step={0.1} onChange={setSpeed} />
            <Slider label={t.labels.angle} value={angle} min={5} max={85} step={1} onChange={setAngle} />
            <Slider label={t.labels.gravity} value={gravity} min={1} max={25} step={0.1} onChange={setGravity} />
          </>
        );
      case "incline":
        return (
          <>
            <Slider label={t.labels.angleRamp} value={rampAngle} min={5} max={60} step={1} onChange={setRampAngle} />
            <Slider label={t.labels.friction} value={friction} min={0} max={0.8} step={0.01} onChange={setFriction} />
            <Slider label={t.labels.gravity} value={gravity} min={1} max={25} step={0.1} onChange={setGravity} />
          </>
        );
      case "spring":
        return (
          <>
            <Slider label={t.labels.k} value={k} min={1} max={80} step={1} onChange={setK} />
            <Slider label={t.labels.mass} value={mass} min={0.1} max={5} step={0.1} onChange={setMass} />
            <Slider label={t.labels.amplitude} value={amplitude} min={0.2} max={2} step={0.1} onChange={setAmplitude} />
          </>
        );
      case "orbit":
        return (
          <>
            <Slider label={t.labels.orbitR} value={orbitR} min={1.5} max={6} step={0.1} onChange={setOrbitR} />
            <Slider label={t.labels.orbitSpeed} value={orbitSpeed} min={0.1} max={4} step={0.05} onChange={setOrbitSpeed} />
          </>
        );
    }
  };

  const activityList: ActivityKey[] = ["pendulum", "projectile", "incline", "spring", "orbit"];

  return (
    <main dir={isRTL ? "rtl" : "ltr"} className="min-h-screen bg-background pb-28">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 h-9 px-3 rounded-lg border border-border bg-card text-sm font-medium hover:bg-secondary transition-colors mb-6"
        >
          <ArrowLeft className={`w-4 h-4 ${isRTL ? "rotate-180" : ""}`} />
          {t.back}
        </button>

        <header className="mb-6 flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Atom className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1
              className="text-2xl md:text-3xl font-bold tracking-tight"
              style={{ fontFamily: "'Outfit', sans-serif" }}
            >
              {t.title}
            </h1>
            <p className="text-muted-foreground text-sm">{t.subtitle}</p>
          </div>
        </header>

        {/* Activity picker */}
        <div className="mb-4">
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">{t.pick}</p>
          <div className="flex flex-wrap gap-2">
            {activityList.map((k) => {
              const meta = t.activities[k];
              const active = k === activity;
              return (
                <button
                  key={k}
                  onClick={() => {
                    setActivity(k);
                    setResetKey((v) => v + 1);
                  }}
                  className={`px-3 py-2 rounded-xl text-sm border transition-all ${
                    active
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border bg-card text-muted-foreground hover:border-primary/40"
                  }`}
                >
                  {meta.name}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground mt-2">{t.activities[activity].desc}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
          <div className="relative rounded-2xl overflow-hidden border border-border bg-black h-[420px] md:h-[560px]">
            <Canvas shadows camera={{ position: [6, 5, 8], fov: 50 }} dpr={[1, 1.5]}>
              <color attach="background" args={["#0b1220"]} />
              <ambientLight intensity={0.4} />
              <directionalLight
                position={[6, 10, 4]}
                intensity={1.1}
                castShadow
                shadow-mapSize-width={1024}
                shadow-mapSize-height={1024}
              />
              <Suspense fallback={<Html center><span className="text-white text-sm">Loading…</span></Html>}>
                {renderScene()}
                <Environment preset="city" />
              </Suspense>
              <FloorGrid />
              <OrbitControls
                enableDamping
                dampingFactor={0.1}
                minDistance={3}
                maxDistance={30}
                target={[0, 1, 0]}
              />
            </Canvas>
          </div>

          <aside className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">{t.controls}</p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPlaying((p) => !p)}
                  className="inline-flex items-center gap-1 h-8 px-3 rounded-lg border border-border bg-secondary/50 text-xs font-semibold hover:border-primary/40 transition-colors"
                >
                  {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  {playing ? t.pause : t.play}
                </button>
                <button
                  onClick={reset}
                  className="inline-flex items-center gap-1 h-8 px-3 rounded-lg border border-border bg-secondary/50 text-xs font-semibold hover:border-primary/40 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  {t.reset}
                </button>
              </div>
            </div>
            <div className="space-y-4">{renderControls()}</div>
          </aside>
        </div>
      </div>
    </main>
  );
};

export default PhysicsActivities;