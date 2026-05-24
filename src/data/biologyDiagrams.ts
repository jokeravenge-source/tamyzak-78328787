import type { DiagramDef } from "@/components/LabeledDiagram";
import { createElement as h, Fragment } from "react";

/* ---------- shared paints ---------- */
const P = "hsl(var(--primary))";
const A = "hsl(var(--accent))";

/* ============================================================
 * CHAPTER 1
 * ============================================================ */

/* 1.4 Bacteria */
const bacteria: DiagramDef = {
  id: "ch1-bacteria",
  title: { en: "Structure of Bacteria", ar: "تركيب البكتيريا" },
  aspect: "3/4",
  parts: [
    // ax 0-100 (viewBox x), ay 0-75 (viewBox y). lx/ly are container %.
    { id: "pilus",    label: { en: "Sex pilus",       ar: "الأهداب الجنسية" }, ax: 44, ay: 9,  lx: 2,  ly: 16 },
    { id: "cyto",     label: { en: "Cytoplasm",       ar: "السايتوبلازم" },    ax: 58, ay: 14, lx: 76, ly: 20 },
    { id: "nucleoid", label: { en: "Nucleoid",        ar: "النيوكليويد" },     ax: 50, ay: 12, lx: 76, ly: 30 },
    { id: "plasma",   label: { en: "Plasma membrane", ar: "الغشاء البلازمي" }, ax: 44, ay: 23, lx: 76, ly: 42 },
    { id: "wall",     label: { en: "Cell wall",       ar: "الجدار الخلوي" },   ax: 58, ay: 27, lx: 76, ly: 52 },
    { id: "capsule",  label: { en: "Capsule",         ar: "المحفظة" },         ax: 64, ay: 45, lx: 76, ly: 62 },
    { id: "fimbriae", label: { en: "Fimbriae",        ar: "الزوائد" },         ax: 36, ay: 38, lx: 2,  ly: 50 },
    { id: "flagella", label: { en: "Flagella",        ar: "الأسواط" },         ax: 50, ay: 66, lx: 2,  ly: 82 },
  ],
  art: h(Fragment, null,
    // capsule (outer dashed halo)
    h("path", { d: "M36 8 Q36 3 50 3 Q64 3 64 8 L64 58 Q64 67 50 67 Q36 67 36 58 Z",
                fill: "hsl(var(--accent) / 0.10)", stroke: A, strokeWidth: 0.35, strokeDasharray: "1 1" }),
    // body (rod = cell wall outer)
    h("path", { d: "M40 10 Q40 6 50 6 Q60 6 60 10 L60 60 Q60 65 50 65 Q40 65 40 60 Z",
                fill: "hsl(var(--primary) / 0.22)", stroke: P, strokeWidth: 0.55 }),
    // cell wall band (darker ring around middle)
    h("path", { d: "M40 26 L60 26 L60 30 L40 30 Z", fill: "hsl(20 55% 45% / 0.55)", stroke: P, strokeWidth: 0.25 }),
    // plasma membrane band (just inside the wall band)
    h("path", { d: "M40 21 L60 21 L60 25 L40 25 Z", fill: "hsl(170 55% 55% / 0.55)", stroke: A, strokeWidth: 0.25 }),
    // nucleoid (DNA tangle near top)
    h("path", { d: "M44 10 q3 -3 6 1 t6 2 q-2 4 -6 3 t-6 2 q-2 -4 0 -8", fill: "none", stroke: "hsl(0 0% 12%)", strokeWidth: 0.45, opacity: 0.9 }),
    h("path", { d: "M46 13 q3 2 6 0 t5 2", fill: "none", stroke: "hsl(0 0% 12%)", strokeWidth: 0.4, opacity: 0.8 }),
    h("path", { d: "M47 16 q3 -2 6 1 t4 1", fill: "none", stroke: "hsl(0 0% 12%)", strokeWidth: 0.4, opacity: 0.8 }),
    // fimbriae (short hairs both sides, along full body)
    ...Array.from({ length: 14 }, (_, i) => h("line", {
      key: `fl${i}`, x1: 40, y1: 8 + i * 4, x2: 35, y2: 7 + i * 4.1,
      stroke: "hsl(0 0% 30%)", strokeWidth: 0.3,
    })),
    ...Array.from({ length: 14 }, (_, i) => h("line", {
      key: `fr${i}`, x1: 60, y1: 8 + i * 4, x2: 65, y2: 7 + i * 4.1,
      stroke: "hsl(0 0% 30%)", strokeWidth: 0.3,
    })),
    // sex pilus (longer hair from top-left of body)
    h("line", { x1: 44, y1: 8, x2: 30, y2: 4, stroke: "hsl(0 0% 20%)", strokeWidth: 0.45 }),
    // flagella (wavy tail from bottom)
    h("path", { d: "M50 65 Q47 68 50 70 T50 73 Q53 71 56 73 T54 67", fill: "none", stroke: "hsl(0 0% 20%)", strokeWidth: 0.5 }),
  ),
};

/* Animal cell */
const animalCell: DiagramDef = {
  id: "ch1-animal-cell",
  title: { en: "Animal Cell", ar: "الخلية الحيوانية" },
  aspect: "1/1",
  parts: [
    // Right side
    { id: "mito",     label: { en: "Mitochondrion",       ar: "الميتوكوندريا" },        ax: 66, ay: 11,  lx: 80, ly: 4,  lw: 18 },
    { id: "golgi",    label: { en: "Golgi apparatus",     ar: "جهاز جولجي" },           ax: 52, ay: 18,  lx: 80, ly: 16, lw: 18 },
    { id: "nucleolus",label: { en: "Nucleolus",           ar: "النوية" },               ax: 50, ay: 27,  lx: 80, ly: 26, lw: 18 },
    { id: "nucleus",  label: { en: "Nucleus",             ar: "النواة" },               ax: 54, ay: 34.5,lx: 80, ly: 36, lw: 18 },
    { id: "centro",   label: { en: "Centrioles",          ar: "الجسيمات المركزية" },    ax: 50, ay: 43.5,lx: 80, ly: 48, lw: 18 },
    { id: "micro",    label: { en: "Microtubules",        ar: "أنابيب دقيقة" },         ax: 72, ay: 51,  lx: 80, ly: 60, lw: 18 },
    { id: "cyto",     label: { en: "Cytoplasm",           ar: "السايتوبلازم" },         ax: 56, ay: 60,  lx: 80, ly: 74, lw: 18 },
    { id: "ribo",     label: { en: "Ribosome",            ar: "الرايبوسوم" },           ax: 70, ay: 64.5,lx: 80, ly: 86, lw: 18 },
    // Left side
    { id: "pino",     label: { en: "Pinocytotic vesicle", ar: "حويصلة قاذفة" },         ax: 44, ay: 6,   lx: 2,  ly: 2,  lw: 24 },
    { id: "lyso",     label: { en: "Lysosome",            ar: "الليسوسوم" },            ax: 32, ay: 13,  lx: 2,  ly: 14, lw: 18 },
    { id: "gvesi",    label: { en: "Golgi vesicles",      ar: "حويصلات جولجي" },        ax: 40, ay: 18,  lx: 2,  ly: 26, lw: 18 },
    { id: "rer",      label: { en: "Rough ER",            ar: "الشبكة الخشنة" },        ax: 24, ay: 25,  lx: 2,  ly: 38, lw: 18 },
    { id: "ser",      label: { en: "Smooth ER",           ar: "الشبكة الملساء" },       ax: 28, ay: 38,  lx: 2,  ly: 54, lw: 18 },
    { id: "membrane", label: { en: "Cell (plasma) membrane", ar: "الغشاء البلازمي" },   ax: 12, ay: 48,  lx: 2,  ly: 76, lw: 24 },
  ],
  art: h(Fragment, null,
    // Cell body (cream oval = plasma membrane outline)
    h("ellipse", { cx: 50, cy: 37.5, rx: 42, ry: 34, fill: "hsl(50 70% 94%)", stroke: "hsl(30 40% 55%)", strokeWidth: 0.6 }),
    // Nucleus (large pink oval, center)
    h("ellipse", { cx: 50, cy: 32, rx: 11, ry: 10, fill: "hsl(350 55% 90%)", stroke: "hsl(350 40% 55%)", strokeWidth: 0.35 }),
    // Nucleolus (small purple inside nucleus, upper)
    h("circle", { cx: 50, cy: 27, r: 2.2, fill: "hsl(280 45% 55%)" }),
    // Mitochondria (top-right + two bottom-center)
    ...[[66, 11],[40, 52.5],[55, 52.5]].map(([cx, cy], i) => h("g", { key: `mt${i}` },
      h("ellipse", { cx, cy, rx: 5, ry: 2.3, fill: "hsl(15 65% 82%)", stroke: "hsl(15 55% 50%)", strokeWidth: 0.3 }),
      h("path", { d: `M${cx-3.6} ${cy} q1 -1.6 2 0 q1 1.6 2 0 q1 -1.6 2 0 q1 1.6 2 0`, fill: "none", stroke: "hsl(25 60% 45%)", strokeWidth: 0.35 }),
    )),
    // Golgi apparatus (stacked cisternae, top-center)
    h("path", { d: "M46 16 Q52 14 58 16 M46 18 Q52 16 58 18 M46 20 Q52 18 58 20 M46 22 Q52 20 58 22",
                fill: "none", stroke: "hsl(35 75% 55%)", strokeWidth: 0.5 }),
    // Golgi vesicles (small empty circles next to Golgi)
    ...[[38, 17],[41, 18.5],[43, 17],[40, 20]].map(([x, y], i) =>
      h("circle", { key: `gv${i}`, cx: x, cy: y, r: 0.7, fill: "none", stroke: "hsl(40 60% 50%)", strokeWidth: 0.3 })),
    // Lysosome (yellow oval, upper-left)
    h("ellipse", { cx: 32, cy: 13, rx: 2.6, ry: 1.4, fill: "hsl(55 85% 65%)", stroke: "hsl(45 70% 45%)", strokeWidth: 0.3 }),
    // Pinocytotic vesicle (small empty circle near top edge)
    h("circle", { cx: 44, cy: 6, r: 1.2, fill: "none", stroke: "hsl(220 30% 45%)", strokeWidth: 0.35 }),
    h("circle", { cx: 47, cy: 7.5, r: 0.8, fill: "none", stroke: "hsl(220 30% 45%)", strokeWidth: 0.3 }),
    // Rough ER (wavy loops with ribosome dots, left side)
    h("path", { d: "M22 21 q-3 2 0 4 q3 2 0 4 q-3 2 0 4 q3 2 0 4 q-3 2 0 4", fill: "none", stroke: "hsl(200 55% 55%)", strokeWidth: 0.4 }),
    h("path", { d: "M27 21 q-3 2 0 4 q3 2 0 4 q-3 2 0 4 q3 2 0 4 q-3 2 0 4", fill: "none", stroke: "hsl(200 55% 55%)", strokeWidth: 0.4 }),
    ...Array.from({ length: 14 }, (_, i) => h("circle", {
      key: `rerd${i}`, cx: 21 + (i % 2) * 7, cy: 22 + i * 1.4, r: 0.35, fill: "hsl(0 0% 15%)",
    })),
    // Rough ER mirror on right side
    h("path", { d: "M73 21 q3 2 0 4 q-3 2 0 4 q3 2 0 4 q-3 2 0 4 q3 2 0 4", fill: "none", stroke: "hsl(200 55% 55%)", strokeWidth: 0.4 }),
    h("path", { d: "M78 21 q3 2 0 4 q-3 2 0 4 q3 2 0 4 q-3 2 0 4 q3 2 0 4", fill: "none", stroke: "hsl(200 55% 55%)", strokeWidth: 0.4 }),
    ...Array.from({ length: 14 }, (_, i) => h("circle", {
      key: `rerdr${i}`, cx: 72 + (i % 2) * 7, cy: 22 + i * 1.4, r: 0.35, fill: "hsl(0 0% 15%)",
    })),
    // Smooth ER (no dots, left mid)
    h("path", { d: "M26 36 q-3 2 0 4 q3 2 0 4 q-3 2 0 4", fill: "none", stroke: "hsl(200 55% 55%)", strokeWidth: 0.4 }),
    h("path", { d: "M31 36 q-3 2 0 4 q3 2 0 4 q-3 2 0 4", fill: "none", stroke: "hsl(200 55% 55%)", strokeWidth: 0.4 }),
    // Centrioles (two small barrels below nucleus)
    h("g", null,
      h("rect", { x: 47, y: 42, width: 4, height: 1.6, rx: 0.3, fill: "hsl(320 40% 75%)", stroke: "hsl(320 35% 45%)", strokeWidth: 0.25 }),
      h("rect", { x: 49.2, y: 44, width: 1.6, height: 4, rx: 0.3, fill: "hsl(320 40% 75%)", stroke: "hsl(320 35% 45%)", strokeWidth: 0.25 }),
    ),
    // Microtubules (crossing diagonal lines)
    ...[
      [60, 46, 80, 56], [62, 50, 78, 60], [25, 56, 42, 50],
      [20, 60, 38, 54], [55, 60, 75, 52], [44, 58, 66, 66],
      [22, 50, 36, 60],
    ].map(([x1, y1, x2, y2], i) => h("line", {
      key: `mt${i}`, x1, y1, x2, y2, stroke: "hsl(95 35% 45%)", strokeWidth: 0.5,
    })),
    // Free ribosomes scattered
    ...[[68, 64],[72, 66],[60, 64],[34, 60],[40, 64],[50, 62],[64, 60]].map(([x, y], i) =>
      h("circle", { key: `rb${i}`, cx: x, cy: y, r: 0.45, fill: "hsl(0 0% 15%)" })),
    // Extra cytoplasm dots
    ...Array.from({ length: 10 }, (_, i) => h("circle", {
      key: `cyd${i}`, cx: 20 + i * 6, cy: 65 + (i % 3) * 1.5, r: 0.3, fill: "hsl(30 40% 55%)", opacity: 0.6,
    })),
  ),
};

/* Plant cell */
const plantCell: DiagramDef = {
  id: "ch1-plant-cell",
  title: { en: "Plant Cell", ar: "الخلية النباتية" },
  aspect: "1/1",
  parts: [
    // Right side labels
    { id: "wall",     label: { en: "Cell wall",         ar: "الجدار الخلوي" },        ax: 88, ay: 3,    lx: 80, ly: 2,  lw: 18 },
    { id: "membrane", label: { en: "Cell membrane",     ar: "الغشاء البلازمي" },      ax: 86, ay: 7.5,  lx: 80, ly: 10, lw: 18 },
    { id: "golgi",    label: { en: "Golgi apparatus",   ar: "جهاز جولجي" },           ax: 58, ay: 15,   lx: 80, ly: 18, lw: 18 },
    { id: "chloro",   label: { en: "Chloroplast",       ar: "البلاستيدة الخضراء" },   ax: 80, ay: 22.5, lx: 80, ly: 30, lw: 18 },
    { id: "vacmem",   label: { en: "Vacuole membrane",  ar: "غشاء الفجوة" },          ax: 66, ay: 34.5, lx: 80, ly: 42, lw: 18 },
    { id: "mito",     label: { en: "Mitochondrion",     ar: "الميتوكوندريا" },        ax: 76, ay: 54,   lx: 80, ly: 64, lw: 18 },
    { id: "cyto",     label: { en: "Cytoplasm",         ar: "السايتوبلازم" },         ax: 50, ay: 66,   lx: 80, ly: 82, lw: 18 },
    // Left side labels
    { id: "gvesi",    label: { en: "Golgi vesicles",    ar: "حويصلات جولجي" },        ax: 36, ay: 12,   lx: 2,  ly: 4,  lw: 18 },
    { id: "ribo",     label: { en: "Ribosome",          ar: "الرايبوسوم" },           ax: 28, ay: 16,   lx: 2,  ly: 12, lw: 18 },
    { id: "ser",      label: { en: "Smooth ER",         ar: "الشبكة الملساء" },       ax: 24, ay: 24,   lx: 2,  ly: 20, lw: 18 },
    { id: "nucleolus",label: { en: "Nucleolus",         ar: "النوية" },               ax: 30, ay: 31.5, lx: 2,  ly: 30, lw: 18 },
    { id: "nucleus",  label: { en: "Nucleus",           ar: "النواة" },               ax: 32, ay: 36,   lx: 2,  ly: 40, lw: 18 },
    { id: "rer",      label: { en: "Rough ER",          ar: "الشبكة الخشنة" },        ax: 24, ay: 42,   lx: 2,  ly: 50, lw: 18 },
    { id: "vacuole",  label: { en: "Central vacuole",   ar: "الفجوة المركزية" },      ax: 50, ay: 45,   lx: 2,  ly: 66, lw: 18 },
    { id: "amylo",    label: { en: "Amyloplast",        ar: "بلاستيدة نشوية" },       ax: 20, ay: 60,   lx: 2,  ly: 80, lw: 18 },
  ],
  art: h(Fragment, null,
    // Cell wall (dark outer rounded rect)
    h("rect", { x: 10, y: 3,   width: 80, height: 68, rx: 4, fill: "hsl(95 45% 78%)", stroke: "hsl(95 40% 35%)", strokeWidth: 0.7 }),
    // Cell membrane (just inside)
    h("rect", { x: 13, y: 5.5, width: 74, height: 63, rx: 4, fill: "hsl(95 50% 82%)", stroke: "hsl(95 40% 45%)", strokeWidth: 0.35 }),
    // Large central vacuole (off-white blob, vacuole membrane = its border)
    h("path", { d: "M33 22 Q33 17 40 17 L62 17 Q72 17 72 27 L72 56 Q72 64 60 64 L40 64 Q33 64 33 56 Z",
                fill: "hsl(50 60% 96%)", stroke: "hsl(40 50% 55%)", strokeWidth: 0.4 }),
    // Chloroplasts (green ovals with stripes)
    ...[[80, 22.5],[80, 33],[80, 44],[26, 50],[54, 62]].map(([cx, cy], i) => h("g", { key: `cp${i}` },
      h("ellipse", { cx, cy, rx: 4, ry: 2, fill: "hsl(95 55% 60%)", stroke: "hsl(95 50% 30%)", strokeWidth: 0.3 }),
      ...Array.from({ length: 4 }, (_, k) => h("line", {
        key: k, x1: cx - 2.8 + k * 1.6, y1: cy - 1.4, x2: cx - 2.8 + k * 1.6, y2: cy + 1.4,
        stroke: "hsl(95 55% 30%)", strokeWidth: 0.3,
      })),
    )),
    // Mitochondria (pink/orange ovals with cristae)
    ...[[76, 54],[44, 64]].map(([cx, cy], i) => h("g", { key: `mt${i}` },
      h("ellipse", { cx, cy, rx: 4, ry: 2, fill: "hsl(15 65% 80%)", stroke: "hsl(15 55% 50%)", strokeWidth: 0.3 }),
      h("path", { d: `M${cx-3} ${cy} q1 -1.6 2 0 q1 1.6 2 0 q1 -1.6 2 0`, fill: "none", stroke: "hsl(25 60% 50%)", strokeWidth: 0.35 }),
    )),
    // Nucleus (pink oval)
    h("ellipse", { cx: 30, cy: 35, rx: 6, ry: 5.5, fill: "hsl(320 50% 88%)", stroke: "hsl(320 40% 55%)", strokeWidth: 0.35 }),
    // Nucleolus (small purple inside nucleus)
    h("circle",  { cx: 30, cy: 32, r: 1.6, fill: "hsl(280 50% 50%)" }),
    // Smooth ER (wavy stacked curves, no dots)
    h("path", { d: "M19 22 Q23 20 27 22 M19 24 Q23 22 27 24 M19 26 Q23 24 27 26 M19 28 Q23 26 27 28",
                fill: "none", stroke: "hsl(200 55% 55%)", strokeWidth: 0.35 }),
    // Rough ER (wavy stacks with ribosome dots)
    h("path", { d: "M19 41 Q23 39 27 41 M19 43 Q23 41 27 43 M19 45 Q23 43 27 45",
                fill: "none", stroke: "hsl(200 55% 55%)", strokeWidth: 0.35 }),
    ...Array.from({ length: 8 }, (_, i) => h("circle", {
      key: `rerd${i}`, cx: 19 + (i % 4) * 2.6, cy: 40 + Math.floor(i / 4) * 2.2 + (i % 2) * 0.3,
      r: 0.35, fill: "hsl(0 0% 15%)",
    })),
    // Ribosome cluster (free)
    ...[[26, 16],[28, 15.5],[30, 17],[27, 18],[29, 19],[31, 18.5]].map(([x, y], i) =>
      h("circle", { key: `rb${i}`, cx: x, cy: y, r: 0.5, fill: "hsl(0 0% 12%)" })),
    // Golgi vesicles (small empty circles)
    ...[[34, 13],[37, 14],[40, 12.5],[42, 14.5],[36, 11]].map(([x, y], i) =>
      h("circle", { key: `gv${i}`, cx: x, cy: y, r: 0.7, fill: "none", stroke: "hsl(40 60% 50%)", strokeWidth: 0.3 })),
    // Golgi apparatus (stacked curved cisternae)
    h("path", { d: "M48 13 Q54 11 60 13 M48 15 Q54 13 60 15 M48 17 Q54 15 60 17 M48 19 Q54 17 60 19",
                fill: "none", stroke: "hsl(35 75% 55%)", strokeWidth: 0.55 }),
    // Amyloplast (concentric spiral - starch grain)
    h("g", null,
      h("circle", { cx: 20, cy: 60, r: 2.2, fill: "hsl(220 15% 88%)", stroke: "hsl(220 20% 55%)", strokeWidth: 0.3 }),
      h("circle", { cx: 20, cy: 60, r: 1.5, fill: "none", stroke: "hsl(220 20% 55%)", strokeWidth: 0.25 }),
      h("circle", { cx: 20, cy: 60, r: 0.8, fill: "none", stroke: "hsl(220 20% 55%)", strokeWidth: 0.25 }),
    ),
  ),
};

/* Mitochondrion (A for memorizing) */
const mitochondrion: DiagramDef = {
  id: "ch1-mitochondrion",
  title: { en: "Mitochondrion", ar: "الميتوكوندريا" },
  aspect: "16/9",
  parts: [
    { id: "cristae", label: { en: "Cristae",        ar: "الأعراف" },           ax: 30, ay: 26, lx: 2,  ly: 4  },
    { id: "matrix",  label: { en: "Matrix",         ar: "المطرس" },            ax: 50, ay: 50, lx: 42, ly: 86 },
    { id: "inner",   label: { en: "Inner membrane", ar: "الغشاء الداخلي" },     ax: 70, ay: 30, lx: 82, ly: 6  },
    { id: "outer",   label: { en: "Outer membrane", ar: "الغشاء الخارجي" },     ax: 90, ay: 42, lx: 82, ly: 30 },
  ],
  art: h(Fragment, null,
    // outer membrane
    h("ellipse", { cx: 50, cy: 38, rx: 42, ry: 22, fill: "hsl(40 80% 70% / 0.25)", stroke: P, strokeWidth: 0.7 }),
    // inner membrane
    h("ellipse", { cx: 50, cy: 38, rx: 38, ry: 18, fill: "hsl(40 80% 60% / 0.35)", stroke: A, strokeWidth: 0.4 }),
    // cristae (folded inner)
    ...Array.from({ length: 7 }, (_, i) => h("path", {
      key: `cr${i}`, d: `M${20 + i * 9} 30 q3 6 6 0 q3 -6 6 0`,
      fill: "none", stroke: A, strokeWidth: 0.5, transform: `translate(${i * 0.2}, 0)`,
    })),
  ),
};

/* Chloroplast (A for memorizing) */
const chloroplast: DiagramDef = {
  id: "ch1-chloroplast",
  title: { en: "Chloroplast", ar: "البلاستيدة الخضراء" },
  parts: [
    { id: "outer",        label: { en: "Outer membrane",      ar: "الغشاء الخارجي" },        ax: 16, ay: 20, lx: 2,  ly: 4 },
    { id: "intermembrane",label: { en: "Intermembrane space", ar: "الحيز بين الغشائين" },    ax: 26, ay: 18, lx: 24, ly: 4 },
    { id: "inner",        label: { en: "Inner membrane",      ar: "الغشاء الداخلي" },        ax: 36, ay: 22, lx: 48, ly: 4 },
    { id: "stroma",       label: { en: "Stroma",              ar: "السدى" },                 ax: 70, ay: 24, lx: 78, ly: 4 },
    { id: "granum",       label: { en: "Granum",              ar: "الكرانة" },               ax: 36, ay: 50, lx: 2,  ly: 60 },
    { id: "thylakoid",    label: { en: "Thylakoid",           ar: "ثايلكويد" },              ax: 50, ay: 40, lx: 28, ly: 86 },
    { id: "lamella",      label: { en: "Lamella",             ar: "الصفائح" },               ax: 60, ay: 50, lx: 52, ly: 86 },
    { id: "lumen",        label: { en: "Lumen",               ar: "اللومن" },                ax: 70, ay: 48, lx: 78, ly: 86 },
  ],
  art: h(Fragment, null,
    // outer membrane (large ellipse)
    h("ellipse", { cx: 50, cy: 38, rx: 42, ry: 26, fill: "hsl(140 55% 45% / 0.3)", stroke: P, strokeWidth: 0.6 }),
    // inner membrane
    h("ellipse", { cx: 50, cy: 38, rx: 38, ry: 22, fill: "hsl(140 50% 50% / 0.25)", stroke: A, strokeWidth: 0.4 }),
    // stroma (yellow inner area)
    h("ellipse", { cx: 50, cy: 38, rx: 32, ry: 16, fill: "hsl(48 90% 70% / 0.5)" }),
    // grana (stacks of thylakoids)
    ...[28, 42, 56, 70].map((x, i) => h("g", { key: `g${i}` },
      ...Array.from({ length: 5 }, (_, k) => h("ellipse", {
        key: k, cx: x, cy: 32 + k * 2.5, rx: 5, ry: 1, fill: "hsl(140 65% 35%)", opacity: 0.85,
      })),
      // lamella connecting next stack
      i < 3 && h("line", { x1: x + 5, y1: 38, x2: x + 9, y2: 38, stroke: "hsl(140 65% 35%)", strokeWidth: 0.4 }),
    )),
  ),
};

/* Plasma membrane (Fig 1.7) */
const plasmaMembrane: DiagramDef = {
  id: "ch1-plasma-membrane",
  title: { en: "Plasma Membrane", ar: "الغشاء البلازمي" },
  aspect: "16/9",
  parts: [
    { id: "transport",  label: { en: "Transporting materials", ar: "مواد منقولة" },        ax: 56, ay: 14, lx: 60, ly: 2,  lw: 22 },
    { id: "hHead",      label: { en: "Hydrophilic head",       ar: "الرأس المحب للماء" },   ax: 18, ay: 26, lx: 2,  ly: 14 },
    { id: "hTail",      label: { en: "Hydrophobic tail",       ar: "الذيل الكاره للماء" },  ax: 30, ay: 40, lx: 2,  ly: 32 },
    { id: "phos",       label: { en: "Phospholipids",          ar: "الدهون الفسفورية" },    ax: 70, ay: 28, lx: 80, ly: 18 },
    { id: "plasma",     label: { en: "Plasma membrane",        ar: "الغشاء البلازمي" },     ax: 80, ay: 44, lx: 80, ly: 38 },
    { id: "channel",    label: { en: "Protein channel",        ar: "قناة بروتينية" },       ax: 24, ay: 50, lx: 2,  ly: 58 },
    { id: "hole",       label: { en: "Hole",                   ar: "فتحة" },                ax: 50, ay: 44, lx: 32, ly: 86 },
    { id: "carrier",    label: { en: "Carrier proteins",       ar: "بروتينات ناقلة" },      ax: 64, ay: 58, lx: 60, ly: 86 },
  ],
  art: h(Fragment, null,
    // top heads (extracellular row)
    ...Array.from({ length: 14 }, (_, i) => h("circle", {
      key: `ht${i}`, cx: 10 + i * 6, cy: 28, r: 2, fill: "hsl(210 70% 70%)", stroke: P, strokeWidth: 0.2,
    })),
    // top tails
    ...Array.from({ length: 14 }, (_, i) => h("line", {
      key: `tt${i}`, x1: 10 + i * 6, y1: 30, x2: 10 + i * 6, y2: 42,
      stroke: "hsl(20 80% 60%)", strokeWidth: 1.2,
    })),
    // bottom tails
    ...Array.from({ length: 14 }, (_, i) => h("line", {
      key: `bt${i}`, x1: 10 + i * 6, y1: 42, x2: 10 + i * 6, y2: 54,
      stroke: "hsl(20 80% 60%)", strokeWidth: 1.2,
    })),
    // bottom heads
    ...Array.from({ length: 14 }, (_, i) => h("circle", {
      key: `hb${i}`, cx: 10 + i * 6, cy: 56, r: 2, fill: "hsl(210 70% 70%)", stroke: P, strokeWidth: 0.2,
    })),
    // protein channel (vertical pill across membrane on left)
    h("rect", { x: 22, y: 24, width: 4, height: 36, rx: 2, fill: A, opacity: 0.85 }),
    // hole carrier in middle (open at top)
    h("path", { d: "M46 26 q4 4 0 14 q-4 4 0 14 q4 -4 8 0 q4 -4 0 -14 q4 -4 0 -14 z", fill: A, opacity: 0.5, stroke: A, strokeWidth: 0.3 }),
    // floating transporting materials
    ...[[58,18],[62,12],[66,16],[70,20],[54,16]].map(([x,y],i)=>h("circle",{key:`m${i}`,cx:x,cy:y,r:0.8,fill:P})),
  ),
};

export const CHAPTER_DIAGRAMS: Record<number, DiagramDef[]> = {
  1: [bacteria, animalCell, plantCell],
};
