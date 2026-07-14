import { Suspense, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { OrbitControls, Grid, Environment, Html, Text } from "@react-three/drei";
import { ArrowLeft, Atom, RotateCcw, Zap } from "lucide-react";
import * as THREE from "three";
import type { AppLanguage } from "@/components/LanguageGate";
import CapacitorDischarge from "@/components/physics/CapacitorDischarge";
import Calorimeter from "@/components/physics/Calorimeter";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

const copy = {
  en: {
    title: "Physics Activity",
    subtitle:
      "An isolated charged capacitor connected to a voltmeter. Slide the dielectric in — the voltmeter reading drops. Pull it out — the reading rises.",
    back: "Back",
    controls: "Controls",
    reset: "Reset",
    activityName: "Capacitor & Dielectric",
    labels: {
      insertion: "Dielectric insertion",
      kappa: "Dielectric constant κ",
      v0: "Initial voltage V₀ (V)",
      voltage: "Voltmeter reading",
      hint: "Drag the blue slab left / right, or use the slider.",
      inside: "inside",
      outside: "outside",
    },
  },
  ar: {
    title: "نشاط فيزيائي",
    subtitle:
      "مكثف معزول مشحون موصول بفولتمتر. أدخل العازل بين اللوحين فتنخفض قراءة الفولتمتر، وأخرجه فترتفع القراءة.",
    back: "رجوع",
    controls: "الإعدادات",
    reset: "إعادة",
    activityName: "مكثف وعازل",
    labels: {
      insertion: "مقدار إدخال العازل",
      kappa: "ثابت العازل κ",
      v0: "الجهد الابتدائي V₀ (فولت)",
      voltage: "قراءة الفولتمتر",
      hint: "اسحب اللوح الأزرق يميناً / يساراً، أو استخدم شريط التمرير.",
      inside: "بالداخل",
      outside: "بالخارج",
    },
  },
} as const;

// ------- geometry constants -------
const PLATE_W = 3; // x
const PLATE_H = 2; // y (vertical size of plate)
const PLATE_T = 0.08; // thickness
const GAP = 0.9; // z distance between plates centers
const SLAB_W = PLATE_W * 0.9;
const SLAB_H = PLATE_H * 0.9;
const SLAB_T = GAP * 0.7;
// insertion f=0 -> slab fully out to the right, f=1 -> centered in gap
const SLAB_X_OUT = PLATE_W * 1.15;
const SLAB_X_IN = 0;
const xForInsertion = (f: number) => SLAB_X_OUT + (SLAB_X_IN - SLAB_X_OUT) * f;
const insertionForX = (x: number) => {
  const f = (x - SLAB_X_OUT) / (SLAB_X_IN - SLAB_X_OUT);
  return Math.max(0, Math.min(1, f));
};

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
    position={[0, -1.4, 0]}
  />
);

// ------- Voltmeter (3D dial in the scene) -------

const Voltmeter = ({
  voltage,
  vMax,
  position,
  label,
}: {
  voltage: number;
  vMax: number;
  position: [number, number, number];
  label: string;
}) => {
  const needle = useRef<THREE.Group>(null);
  const current = useRef(0);

  useFrame((_s, dt) => {
    // smoothly ease needle toward target voltage
    current.current += (voltage - current.current) * Math.min(1, dt * 6);
    if (needle.current) {
      // sweep from -60° (left, 0V) to +60° (right, vMax)
      const frac = Math.max(0, Math.min(1, current.current / vMax));
      const angle = THREE.MathUtils.degToRad(-60 + frac * 120);
      needle.current.rotation.z = angle;
    }
  });

  // tick marks
  const ticks = useMemo(() => {
    const arr: { angle: number; big: boolean; value: number }[] = [];
    for (let i = 0; i <= 10; i++) {
      arr.push({
        angle: THREE.MathUtils.degToRad(-60 + (i / 10) * 120),
        big: i % 2 === 0,
        value: (i / 10) * vMax,
      });
    }
    return arr;
  }, [vMax]);

  return (
    <group position={position}>
      {/* body */}
      <mesh>
        <cylinderGeometry args={[1.1, 1.1, 0.25, 48]} />
        <meshStandardMaterial color="#0f172a" metalness={0.4} roughness={0.5} />
      </mesh>
      {/* dial face */}
      <mesh position={[0, 0.13, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.0, 48]} />
        <meshStandardMaterial color="#f8fafc" />
      </mesh>
      {/* ticks */}
      {ticks.map((t, i) => (
        <group key={i} position={[0, 0.14, 0]} rotation={[0, 0, t.angle]}>
          <mesh position={[0, 0.85, 0]}>
            <boxGeometry args={[t.big ? 0.05 : 0.03, t.big ? 0.16 : 0.09, 0.01]} />
            <meshStandardMaterial color="#0f172a" />
          </mesh>
        </group>
      ))}
      {/* label V */}
      <Text
        position={[0, 0.14, -0.55]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.22}
        color="#0f172a"
        anchorX="center"
        anchorY="middle"
      >
        V
      </Text>
      {/* needle */}
      <group ref={needle} position={[0, 0.15, 0]}>
        <mesh position={[0, 0.45, 0]}>
          <boxGeometry args={[0.05, 0.9, 0.02]} />
          <meshStandardMaterial color="#ef4444" />
        </mesh>
        <mesh>
          <cylinderGeometry args={[0.09, 0.09, 0.05, 24]} />
          <meshStandardMaterial color="#1e293b" />
        </mesh>
      </group>
      {/* under-label */}
      <Text
        position={[0, -0.15, 1.35]}
        fontSize={0.22}
        color="#e2e8f0"
        anchorX="center"
        anchorY="middle"
      >
        {label}
      </Text>
    </group>
  );
};

// ------- Capacitor scene -------

const Wire = ({
  from,
  to,
  color = "#f59e0b",
}: {
  from: [number, number, number];
  to: [number, number, number];
  color?: string;
}) => {
  const curve = useMemo(() => {
    const start = new THREE.Vector3(...from);
    const end = new THREE.Vector3(...to);
    const mid = start.clone().add(end).multiplyScalar(0.5);
    mid.y -= 0.6;
    return new THREE.CatmullRomCurve3([start, mid, end]);
  }, [from, to]);

  const geom = useMemo(() => new THREE.TubeGeometry(curve, 40, 0.035, 8, false), [curve]);

  return (
    <mesh geometry={geom}>
      <meshStandardMaterial color={color} metalness={0.5} roughness={0.4} />
    </mesh>
  );
};

const CapacitorScene = ({
  insertion,
  setInsertion,
  setDragging,
}: {
  insertion: number;
  setInsertion: (f: number) => void;
  setDragging: (v: boolean) => void;
}) => {
  const slabRef = useRef<THREE.Group>(null);
  const dragging = useRef(false);
  const dragOffset = useRef(0);
  const { gl } = useThree();

  useFrame(() => {
    if (slabRef.current) {
      const targetX = xForInsertion(insertion);
      // smooth
      slabRef.current.position.x += (targetX - slabRef.current.position.x) * 0.25;
    }
  });

  const dragPlane = useMemo(
    () => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0),
    []
  );

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    dragging.current = true;
    setDragging(true);
    dragOffset.current = xForInsertion(insertion) - e.point.x;
    (e.target as Element)?.setPointerCapture?.(e.pointerId);
    gl.domElement.style.cursor = "grabbing";
  };

  const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
    if (!dragging.current) return;
    // project pointer onto y=0 plane
    const hit = new THREE.Vector3();
    e.ray.intersectPlane(dragPlane, hit);
    const nextX = hit.x + dragOffset.current;
    setInsertion(insertionForX(nextX));
  };

  const handlePointerUp = (e: ThreeEvent<PointerEvent>) => {
    dragging.current = false;
    setDragging(false);
    (e.target as Element)?.releasePointerCapture?.(e.pointerId);
    gl.domElement.style.cursor = "auto";
  };

  const plateZ = GAP / 2;

  return (
    <group>
      {/* Left plate (positive) */}
      <mesh position={[0, 0, -plateZ]} castShadow receiveShadow>
        <boxGeometry args={[PLATE_W, PLATE_H, PLATE_T]} />
        <meshStandardMaterial color="#fbbf24" metalness={0.85} roughness={0.25} />
      </mesh>
      <Text
        position={[0, PLATE_H / 2 + 0.25, -plateZ]}
        fontSize={0.35}
        color="#fbbf24"
        anchorX="center"
        anchorY="middle"
      >
        +
      </Text>
      {/* Right plate (negative) */}
      <mesh position={[0, 0, plateZ]} castShadow receiveShadow>
        <boxGeometry args={[PLATE_W, PLATE_H, PLATE_T]} />
        <meshStandardMaterial color="#cbd5e1" metalness={0.85} roughness={0.25} />
      </mesh>
      <Text
        position={[0, PLATE_H / 2 + 0.25, plateZ]}
        fontSize={0.35}
        color="#94a3b8"
        anchorX="center"
        anchorY="middle"
      >
        −
      </Text>

      {/* Dielectric slab (draggable) */}
      <group
        ref={slabRef}
        position={[xForInsertion(insertion), 0, 0]}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerOut={handlePointerUp}
      >
        <mesh castShadow>
          <boxGeometry args={[SLAB_W, SLAB_H, SLAB_T]} />
          <meshPhysicalMaterial
            color="#38bdf8"
            transparent
            opacity={0.55}
            roughness={0.15}
            metalness={0.1}
            transmission={0.6}
            thickness={0.4}
            clearcoat={1}
          />
        </mesh>
        {/* subtle edge */}
        <mesh>
          <boxGeometry args={[SLAB_W + 0.01, SLAB_H + 0.01, SLAB_T + 0.01]} />
          <meshBasicMaterial color="#0ea5e9" wireframe />
        </mesh>
        <Text
          position={[0, SLAB_H / 2 + 0.22, 0]}
          fontSize={0.22}
          color="#38bdf8"
          anchorX="center"
          anchorY="middle"
        >
          κ
        </Text>
      </group>

      {/* Wires from plates to voltmeter above */}
      <Wire from={[-PLATE_W / 2, PLATE_H / 2, -plateZ]} to={[-1.1, 2.6, 0]} color="#fbbf24" />
      <Wire from={[PLATE_W / 2, PLATE_H / 2, plateZ]} to={[1.1, 2.6, 0]} color="#e2e8f0" />
    </group>
  );
};

// ------- Small UI slider -------

const Slider = ({
  label,
  value,
  min,
  max,
  step,
  onChange,
  suffix,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  suffix?: string;
}) => (
  <label className="block">
    <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
      <span>{label}</span>
      <span className="font-mono text-foreground">
        {value.toFixed(step < 1 ? 2 : 0)}
        {suffix ?? ""}
      </span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="w-full accent-primary"
    />
  </label>
);

// ------- Page -------

const PhysicsActivities = ({
  language,
  onBack,
}: {
  language: AppLanguage;
  onBack: () => void;
}) => {
  const isRTL = language === "ar";
  const t = copy[language];

  const [insertion, setInsertion] = useState(0); // 0 outside, 1 fully inside
  const [kappa, setKappa] = useState(3);
  const [v0, setV0] = useState(10);
  const [isDragging, setIsDragging] = useState(false);

  // Isolated capacitor: Q constant. C = C0 * (1 + (κ-1) f)
  // V = Q / C = V0 / (1 + (κ-1) f)
  const voltage = v0 / (1 + (kappa - 1) * insertion);

  const reset = () => {
    setInsertion(0);
    setKappa(3);
    setV0(10);
  };

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
            <p className="text-muted-foreground text-sm max-w-2xl">{t.subtitle}</p>
          </div>
        </header>

        <Tabs defaultValue="dielectric" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="dielectric">
              {isRTL ? "المكثف والعازل" : "Capacitor & Dielectric"}
            </TabsTrigger>
            <TabsTrigger value="discharge">
              {isRTL ? "تفريغ المكثف" : "Discharging a Capacitor"}
            </TabsTrigger>
            <TabsTrigger value="calorimeter">
              {isRTL ? "المسعر الحراري" : "Calorimeter"}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dielectric">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
          <div className="relative rounded-2xl overflow-hidden border border-border bg-black h-[420px] md:h-[560px]">
            <Canvas shadows camera={{ position: [5, 4, 7], fov: 50 }} dpr={[1, 1.5]}>
              <color attach="background" args={["#0b1220"]} />
              <ambientLight intensity={0.5} />
              <directionalLight
                position={[6, 10, 4]}
                intensity={1.1}
                castShadow
                shadow-mapSize-width={1024}
                shadow-mapSize-height={1024}
              />
              <Suspense fallback={<Html center><span className="text-white text-sm">Loading…</span></Html>}>
                <CapacitorScene insertion={insertion} setInsertion={setInsertion} setDragging={setIsDragging} />
                <Voltmeter
                  voltage={voltage}
                  vMax={v0}
                  position={[0, 2.9, 0]}
                  label={`${voltage.toFixed(2)} V`}
                />
                <Environment preset="city" />
              </Suspense>
              <FloorGrid />
              <OrbitControls
                enableDamping
                dampingFactor={0.1}
                minDistance={3}
                maxDistance={20}
                target={[0, 1, 0]}
                makeDefault
                enabled={!isDragging}
              />
            </Canvas>

            {/* readout overlay */}
            <div className="absolute top-3 left-3 rounded-xl bg-black/50 backdrop-blur-sm border border-white/10 px-3 py-2 text-white text-xs">
              <div className="flex items-center gap-2">
                <Zap className="w-3.5 h-3.5 text-primary" />
                <span className="uppercase tracking-widest text-white/60">{t.labels.voltage}</span>
              </div>
              <div className="font-mono text-lg font-semibold">{voltage.toFixed(2)} V</div>
              <div className="text-white/60">
                {insertion > 0.05 ? t.labels.inside : t.labels.outside}
              </div>
            </div>
          </div>

          <aside className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">
                {t.activityName}
              </p>
              <button
                onClick={reset}
                className="inline-flex items-center gap-1 h-8 px-3 rounded-lg border border-border bg-secondary/50 text-xs font-semibold hover:border-primary/40 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                {t.reset}
              </button>
            </div>
            <p className="text-xs text-muted-foreground mb-4">{t.labels.hint}</p>
            <div className="space-y-4">
              <Slider
                label={t.labels.insertion}
                value={insertion}
                min={0}
                max={1}
                step={0.01}
                onChange={setInsertion}
              />
              <Slider
                label={t.labels.kappa}
                value={kappa}
                min={1}
                max={10}
                step={0.1}
                onChange={setKappa}
              />
              <Slider
                label={t.labels.v0}
                value={v0}
                min={1}
                max={20}
                step={0.5}
                onChange={setV0}
                suffix=" V"
              />
            </div>
          </aside>
        </div>
          </TabsContent>

          <TabsContent value="discharge">
            <CapacitorDischarge language={language} />
          </TabsContent>

          <TabsContent value="calorimeter">
            <Calorimeter language={language} />
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
};

export default PhysicsActivities;