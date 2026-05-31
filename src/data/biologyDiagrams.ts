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
    { id: "cristae", label: { en: "Cristae",        ar: "الأعراف" },           ax: 22, ay: 32, lx: 2,  ly: 78, lw: 18 },
    { id: "matrix",  label: { en: "Matrix",         ar: "المطرس" },            ax: 46, ay: 50, lx: 32, ly: 92, lw: 16 },
    { id: "inner",   label: { en: "Inner membrane", ar: "الغشاء الداخلي" },     ax: 64, ay: 30, lx: 58, ly: 92, lw: 18 },
    { id: "outer",   label: { en: "Outer membrane", ar: "الغشاء الخارجي" },     ax: 90, ay: 38, lx: 80, ly: 92, lw: 18 },
  ],
  art: (() => {
    const TAN = "hsl(38 55% 72%)";
    const TAN_DARK = "hsl(28 45% 35%)";
    const RED = "hsl(0 70% 60%)";
    const GREEN = "hsl(85 45% 55%)";
    // capsule path for outer membrane (rounded ends)
    const outer = "M 14 22 Q 8 22 8 38 Q 8 54 14 54 L 86 54 Q 92 54 92 38 Q 92 22 86 22 Z";
    const inner = "M 16 24 Q 11 24 11 38 Q 11 52 16 52 L 84 52 Q 89 52 89 38 Q 89 24 84 24 Z";
    // wavy cristae paths inside the matrix
    const cristae = [
      "M 18 32 q 3 -4 6 0 q 3 4 6 0 q 3 -4 6 0",
      "M 20 42 q 4 3 8 0 q 4 -3 8 0 q 4 3 8 0",
      "M 34 30 q 2 5 5 2 q 3 -3 6 1 q 3 4 6 0",
      "M 50 28 q 3 4 6 0 q 3 -4 6 0 q 3 4 6 0",
      "M 56 44 q 3 -4 6 0 q 3 4 6 0 q 3 -4 6 0",
      "M 70 32 q 3 5 6 1 q 3 -4 6 0 q 2 3 4 0",
      "M 24 48 q 4 -3 8 0 q 4 3 8 -1",
      "M 44 46 q 3 -3 6 0 q 3 3 6 0 q 3 -3 6 0",
      "M 64 26 q 2 4 5 1 q 3 -3 5 0",
      "M 18 38 q 4 -2 7 0 q 3 3 6 0",
    ];
    return h(Fragment, null,
      // outer membrane (tan capsule)
      h("path", { d: outer, fill: TAN, stroke: TAN_DARK, strokeWidth: 0.8, strokeLinejoin: "round" }),
      // inner membrane (slightly inset)
      h("path", { d: inner, fill: "none", stroke: TAN_DARK, strokeWidth: 0.6 }),
      // cristae folds (wavy interior)
      ...cristae.map((d, i) => h("path", {
        key: `cr${i}`, d, fill: "none", stroke: TAN_DARK, strokeWidth: 0.7, strokeLinecap: "round", strokeLinejoin: "round",
      })),
      // red granules (ribosome-like) in matrix
      ...[[22, 36], [34, 44], [44, 34], [58, 38], [70, 44], [78, 32], [50, 46]].map(([x, y], i) =>
        h("circle", { key: `rd${i}`, cx: x, cy: y, r: 1.6, fill: RED, opacity: 0.9 })
      ),
      // small green dots in matrix
      ...[[28, 40], [40, 40], [52, 42], [62, 34], [74, 38], [36, 36], [48, 38]].map(([x, y], i) =>
        h("circle", { key: `gd${i}`, cx: x, cy: y, r: 0.9, fill: GREEN, opacity: 0.9 })
      ),
    );
  })(),
};

/* Chloroplast (reference for memorizing) */
const chloroplast: DiagramDef = {
  id: "ch1-chloroplast",
  title: { en: "Chloroplast", ar: "البلاستيدة الخضراء" },
  aspect: "16/9",
  parts: [
    { id: "grana",   label: { en: "Grana lamellae", ar: "صفائح الكرانا" }, ax: 34, ay: 22, lx: 2,  ly: 18, lw: 22 },
    { id: "outer",   label: { en: "Outer membrane", ar: "الغشاء الخارجي" }, ax: 10, ay: 42, lx: 2,  ly: 52, lw: 22 },
    { id: "inner",   label: { en: "Inner membrane", ar: "الغشاء الداخلي" }, ax: 14, ay: 48, lx: 2,  ly: 70, lw: 22 },
    { id: "starch",  label: { en: "Starch granule", ar: "حبيبة نشاء" },     ax: 64, ay: 26, lx: 78, ly: 18, lw: 20 },
    { id: "stroma",  label: { en: "Stroma",         ar: "السدى" },          ax: 70, ay: 42, lx: 78, ly: 42, lw: 20 },
    { id: "granum",  label: { en: "Granum",         ar: "الكرانوم" },       ax: 80, ay: 55, lx: 78, ly: 70, lw: 20 },
  ],
  art: (() => {
    const OUTER = "hsl(95 35% 45%)";
    const INNER = "hsl(95 45% 55%)";
    const STROMA_BG = "hsl(50 75% 92%)";
    const GRANUM = "hsl(135 55% 38%)";
    const GRANUM_EDGE = "hsl(135 60% 22%)";
    const STARCH = "hsl(50 80% 80%)";
    const STARCH_EDGE = "hsl(40 55% 55%)";
    const THYLA = "hsl(205 65% 55%)";
    const grana: [number, number][] = [
      [26, 22], [46, 20], [68, 22],
      [22, 52], [42, 54], [62, 54], [80, 50],
      [36, 36], [78, 36],
    ];
    return h(Fragment, null,
      h("ellipse", { cx: 50, cy: 37.5, rx: 46, ry: 28, fill: STROMA_BG, stroke: OUTER, strokeWidth: 0.9 }),
      h("ellipse", { cx: 50, cy: 37.5, rx: 43.5, ry: 25.5, fill: "none", stroke: INNER, strokeWidth: 0.5 }),
      ...Array.from({ length: 70 }, (_, i) => {
        const a = (i * 137.5) * Math.PI / 180;
        const r = Math.sqrt((i + 1) / 70) * 24;
        const x = 50 + Math.cos(a) * r;
        const y = 37.5 + Math.sin(a) * r * 0.58;
        return h("circle", { key: `sd${i}`, cx: x, cy: y, r: 0.3, fill: "hsl(95 30% 45%)", opacity: 0.55 });
      }),
      h("path", { d: "M28 22 Q36 18 46 20 T68 22 Q76 24 80 26", fill: "none", stroke: THYLA, strokeWidth: 0.5 }),
      h("path", { d: "M22 52 Q32 48 42 54 T62 54 Q72 54 80 50", fill: "none", stroke: THYLA, strokeWidth: 0.5 }),
      h("path", { d: "M26 28 Q34 34 42 30 Q52 26 62 32 Q72 36 80 32", fill: "none", stroke: THYLA, strokeWidth: 0.5 }),
      h("path", { d: "M22 44 Q32 40 42 46 Q52 50 62 44 Q72 40 80 44", fill: "none", stroke: THYLA, strokeWidth: 0.5 }),
      h("path", { d: "M36 36 Q50 38 64 36 Q72 36 78 38", fill: "none", stroke: THYLA, strokeWidth: 0.4 }),
      h("ellipse", { cx: 40, cy: 32, rx: 3, ry: 2.4, fill: STARCH, stroke: STARCH_EDGE, strokeWidth: 0.3 }),
      h("ellipse", { cx: 56, cy: 42, rx: 5,  ry: 4,   fill: STARCH, stroke: STARCH_EDGE, strokeWidth: 0.3 }),
      h("circle",  { cx: 64, cy: 26, r: 1.4, fill: STARCH, stroke: STARCH_EDGE, strokeWidth: 0.3 }),
      ...grana.map(([cx, cy], i) => h("g", { key: `gr${i}` },
        ...Array.from({ length: 4 }, (_, k) => h("ellipse", {
          key: k, cx, cy: cy - 3 + k * 2, rx: 3.2, ry: 0.95,
          fill: GRANUM, stroke: GRANUM_EDGE, strokeWidth: 0.25,
        })),
      )),
    );
  })(),
};

/* Chromosome (sister chromatids + centromere) */
const chromosome: DiagramDef = {
  id: "ch1-chromosome",
  title: { en: "Chromosome", ar: "الكروموسوم" },
  aspect: "16/9",
  parts: [
    { id: "chromatids", label: { en: "Sister chromatids", ar: "كروماتيدان شقيقان" }, ax: 22, ay: 22, lx: 30, ly: 2,  lw: 36 },
    { id: "centromere", label: { en: "Centromere",        ar: "القطعة المركزية" },   ax: 52, ay: 38, lx: 70, ly: 44, lw: 26 },
  ],
  art: (() => {
    const BLUE = "hsl(205 75% 55%)";
    const BLUE_DK = "hsl(210 70% 35%)";
    const PURPLE = "hsl(285 55% 55%)";
    const PURPLE_DK = "hsl(285 55% 35%)";
    return h(Fragment, null,
      h("path", { d: "M50 38 Q30 18 14 18 Q8 18 8 24 Q8 28 14 30 Q30 34 50 40 Z", fill: BLUE, stroke: BLUE_DK, strokeWidth: 0.5 }),
      h("path", { d: "M50 38 Q30 58 14 58 Q8 58 8 52 Q8 48 14 46 Q30 42 50 36 Z", fill: BLUE, stroke: BLUE_DK, strokeWidth: 0.5 }),
      h("path", { d: "M50 38 Q70 18 86 18 Q92 18 92 24 Q92 28 86 30 Q70 34 50 40 Z", fill: PURPLE, stroke: PURPLE_DK, strokeWidth: 0.5 }),
      h("path", { d: "M50 38 Q70 58 86 58 Q92 58 92 52 Q92 48 86 46 Q70 42 50 36 Z", fill: PURPLE, stroke: PURPLE_DK, strokeWidth: 0.5 }),
      h("circle", { cx: 50, cy: 38, r: 4.5, fill: "hsl(50 95% 88%)", opacity: 0.95 }),
      h("circle", { cx: 50, cy: 38, r: 2.2, fill: "hsl(50 100% 96%)" }),
    );
  })(),
};

/* Plasma membrane (Fig 1.7) */
const plasmaMembrane: DiagramDef = {
  id: "ch1-plasma-membrane",
  title: { en: "Plasma Membrane", ar: "الغشاء البلازمي" },
  aspect: "16/9",
  parts: [
    { id: "transport",  label: { en: "Transporting materials", ar: "مواد منقولة" },        ax: 60, ay: 10, lx: 58, ly: 2,  lw: 28 },
    { id: "hHead",      label: { en: "Hydrophilic head",       ar: "الرأس المحب للماء" },   ax: 16, ay: 26, lx: 2,  ly: 8,  lw: 22 },
    { id: "hTail",      label: { en: "Hydrophobic tail",       ar: "الذيل الكاره للماء" },  ax: 16, ay: 34, lx: 2,  ly: 30, lw: 22 },
    { id: "phos",       label: { en: "Phospholipids",          ar: "الدهون الفسفورية" },    ax: 84, ay: 27, lx: 80, ly: 8,  lw: 20 },
    { id: "plasma",     label: { en: "Plasma membrane",        ar: "الغشاء البلازمي" },     ax: 92, ay: 37, lx: 80, ly: 38, lw: 20 },
    { id: "channel",    label: { en: "Protein channel",        ar: "قناة بروتينية" },       ax: 22, ay: 42, lx: 2,  ly: 64, lw: 22 },
    { id: "hole",       label: { en: "Hole",                   ar: "فتحة" },                ax: 50, ay: 50, lx: 32, ly: 92, lw: 14 },
    { id: "carrier",    label: { en: "Carrier proteins",       ar: "بروتينات ناقلة" },      ax: 70, ay: 50, lx: 56, ly: 92, lw: 20 },
    { id: "extra",      label: { en: "Extracellular",          ar: "خارج الخلية" },         ax: 50, ay: 18, lx: 40, ly: 16, lw: 20 },
    { id: "intra",      label: { en: "Intracellular",          ar: "داخل الخلية" },         ax: 50, ay: 56, lx: 40, ly: 80, lw: 20 },
  ],
  art: (() => {
    // Bilayer geometry (viewBox 100 x 75)
    const HEAD_R = 2.4;
    const TOP_HEAD_Y = 27;
    const BOT_HEAD_Y = 48;
    const MID_Y = 37.5;
    const N = 18;
    const X0 = 8;
    const STEP = (84) / (N - 1); // span 8..92
    const HEAD_FILL = "hsl(220 65% 78%)";
    const HEAD_STROKE = "hsl(220 45% 45%)";
    const TAIL = "hsl(20 75% 60%)";
    const PROT = "hsl(20 80% 58%)";
    const PROT_STROKE = "hsl(20 70% 38%)";
    return h(Fragment, null,
      // soft pink membrane background band
      h("rect", { x: 4, y: 24, width: 92, height: 27, rx: 1, fill: "hsl(320 55% 90% / 0.5)" }),

      // ---- phospholipid tails (drawn under heads) ----
      ...Array.from({ length: N }, (_, i) => {
        const x = X0 + i * STEP;
        return h(Fragment, { key: `pl${i}` },
          // top tail (slight wave)
          h("path", { d: `M${x} ${TOP_HEAD_Y + HEAD_R} q 0.6 2 0 4 q -0.6 2 0 4`, stroke: TAIL, strokeWidth: 0.9, fill: "none", strokeLinecap: "round" }),
          // bottom tail
          h("path", { d: `M${x} ${BOT_HEAD_Y - HEAD_R} q 0.6 -2 0 -4 q -0.6 -2 0 -4`, stroke: TAIL, strokeWidth: 0.9, fill: "none", strokeLinecap: "round" }),
        );
      }),

      // ---- carrier proteins (3 tilted orange capsules) ----
      ...[{ x: 40, rot: -14 }, { x: 64, rot: 16 }, { x: 82, rot: -12 }].map(({ x, rot }, i) =>
        h("rect", {
          key: `cp${i}`, x: x - 3, y: 21, width: 6, height: 33, rx: 3,
          fill: PROT, stroke: PROT_STROKE, strokeWidth: 0.4, opacity: 0.95,
          transform: `rotate(${rot} ${x} ${MID_Y})`,
        })
      ),

      // ---- protein channel (vertical capsule on the left) ----
      h("rect", { x: 19, y: 21, width: 6, height: 33, rx: 3, fill: PROT, stroke: PROT_STROKE, strokeWidth: 0.4 }),
      // hole through the channel
      h("rect", { x: 21.2, y: 21, width: 1.6, height: 33, fill: "hsl(0 0% 100% / 0.95)" }),

      // ---- top heads (extracellular row) ----
      ...Array.from({ length: N }, (_, i) => h("circle", {
        key: `th${i}`, cx: X0 + i * STEP, cy: TOP_HEAD_Y, r: HEAD_R,
        fill: HEAD_FILL, stroke: HEAD_STROKE, strokeWidth: 0.35,
      })),
      // ---- bottom heads (intracellular row) ----
      ...Array.from({ length: N }, (_, i) => h("circle", {
        key: `bh${i}`, cx: X0 + i * STEP, cy: BOT_HEAD_Y, r: HEAD_R,
        fill: HEAD_FILL, stroke: HEAD_STROKE, strokeWidth: 0.35,
      })),

      // ---- transporting materials (above membrane) ----
      ...[[40, 8], [46, 12], [52, 6], [58, 11], [64, 8], [54, 16], [48, 18]].map(([x, y], i) =>
        h("circle", { key: `tm${i}`, cx: x, cy: y, r: 1.2, fill: HEAD_FILL, stroke: HEAD_STROKE, strokeWidth: 0.25 })
      ),
      // particle entering the hole
      h("circle", { cx: 22, cy: 22, r: 1.2, fill: HEAD_FILL, stroke: HEAD_STROKE, strokeWidth: 0.25 }),
      // particle exiting into intracellular space
      h("circle", { cx: 22, cy: 58, r: 1.2, fill: HEAD_FILL, stroke: HEAD_STROKE, strokeWidth: 0.25 }),

      // ---- environment text ----
      h("text", { x: 50, y: 20, textAnchor: "middle", fontSize: 3.4, fontStyle: "italic", fill: "hsl(210 80% 55%)" }, "Extracellular"),
      h("text", { x: 50, y: 58, textAnchor: "middle", fontSize: 3.4, fontStyle: "italic", fill: "hsl(210 80% 55%)" }, "Intracellular"),
    );
  })(),
};

/* ============================================================
 * CHAPTER 3 — Fruit layers
 * ============================================================ */
const fruit: DiagramDef = {
  id: "ch3-fruit",
  title: { en: "Layers of a Fruit", ar: "طبقات الثمرة" },
  aspect: "16/9",
  parts: [
    { id: "exocarp",  label: { en: "Outer layer (Exocarp)",  ar: "الطبقة الخارجية" }, ax: 90, ay: 37, lx: 78, ly: 8,  lw: 20 },
    { id: "mesocarp", label: { en: "Middle layer (Mesocarp)", ar: "الطبقة الوسطى" },   ax: 73, ay: 50, lx: 56, ly: 82, lw: 22 },
    { id: "endocarp", label: { en: "Inner layer (Endocarp)",  ar: "الطبقة الداخلية" }, ax: 70, ay: 26, lx: 38, ly: 4,  lw: 22 },
    { id: "seed",     label: { en: "Seed",                    ar: "البذرة" },          ax: 38, ay: 38, lx: 2,  ly: 46, lw: 18 },
  ],
  art: (() => {
    const SKIN = "hsl(135 45% 32%)";
    const SKIN_DARK = "hsl(135 55% 22%)";
    const FLESH = "hsl(40 55% 82%)";
    const FLESH_SH = "hsl(35 45% 65%)";
    const ENDO = "hsl(265 45% 65%)";
    const ENDO_DARK = "hsl(265 50% 45%)";
    const SEED = "hsl(115 50% 45%)";
    const SEED_DK = "hsl(115 60% 30%)";
    const VEIN = "hsl(265 40% 50%)";

    // Lens/eye shape centered at (50, 37.5)
    const outer = "M 8 37.5 Q 50 -4 92 37.5 Q 50 79 8 37.5 Z";
    const flesh = "M 12 37.5 Q 50 0 88 37.5 Q 50 75 12 37.5 Z";
    const endo  = "M 22 37.5 Q 50 10 78 37.5 Q 50 65 22 37.5 Z";

    // spikes (inward thorns) along the inner edge of the skin (top + bottom)
    const spikes: React.ReactNode[] = [];
    for (let i = 0; i < 14; i++) {
      const t = (i + 0.5) / 14;
      const x = 14 + t * 72;
      // top arc y (approx): parabola through (12,37.5),(50,3),(88,37.5)
      const u = (x - 50) / 38;
      const yTop = 3 + (37.5 - 3) * u * u;
      const yBot = 72 - (37.5 - 3) * u * u;
      spikes.push(
        h("line", { key: `st${i}`, x1: x, y1: yTop, x2: x, y2: yTop + 5,
          stroke: ENDO_DARK, strokeWidth: 0.35, strokeLinecap: "round" }),
        h("line", { key: `sb${i}`, x1: x, y1: yBot, x2: x, y2: yBot - 5,
          stroke: ENDO_DARK, strokeWidth: 0.35, strokeLinecap: "round" }),
      );
    }

    // little veins in flesh
    const veins = [
      "M 18 40 q 6 -4 12 -1 t 10 2",
      "M 20 32 q 5 3 11 1 t 9 -2",
      "M 64 30 q 6 4 12 2 t 8 -1",
      "M 62 46 q 7 -3 13 0 t 9 -2",
      "M 30 50 q 6 -2 12 1",
      "M 58 24 q 5 -2 10 0",
    ];

    return h(Fragment, null,
      // outer skin (exocarp)
      h("path", { d: outer, fill: SKIN, stroke: SKIN_DARK, strokeWidth: 0.6 }),
      // mesocarp (flesh)
      h("path", { d: flesh, fill: FLESH, stroke: FLESH_SH, strokeWidth: 0.4 }),
      // veins
      ...veins.map((d, i) => h("path", { key: `v${i}`, d, fill: "none", stroke: VEIN, strokeWidth: 0.25, opacity: 0.55 })),
      // endocarp ring (purple)
      h("path", { d: endo, fill: "none", stroke: ENDO, strokeWidth: 1.6 }),
      h("path", { d: endo, fill: "none", stroke: ENDO_DARK, strokeWidth: 0.4 }),
      // spikes
      ...spikes,
      // seed (oval, slightly left)
      h("ellipse", { cx: 48, cy: 38, rx: 18, ry: 7.5, fill: SEED, stroke: SEED_DK, strokeWidth: 0.5 }),
      // seed highlight
      h("ellipse", { cx: 44, cy: 35.5, rx: 10, ry: 2.2, fill: "hsl(115 60% 70% / 0.7)" }),
      // seed surface lines
      h("path", { d: "M 40 39 q 6 -2 12 0 t 10 -1", fill: "none", stroke: SEED_DK, strokeWidth: 0.35, opacity: 0.7 }),
      h("path", { d: "M 42 41 q 5 1 10 -1 t 9 0", fill: "none", stroke: SEED_DK, strokeWidth: 0.3, opacity: 0.6 }),
      // seed stalk (funicle) to the left wall
      h("path", { d: "M 30 38 q 2 -2 4 -1 q 3 1 5 1", fill: "none", stroke: SEED_DK, strokeWidth: 0.5 }),
      h("path", { d: "M 22 37 q 3 4 8 1", fill: "none", stroke: SEED_DK, strokeWidth: 0.4 }),
    );
  })(),
};

/* Binary fission in bacteria */
const binaryFission: DiagramDef = {
  id: "ch3-binary-fission",
  title: { en: "Binary Fission in Bacteria", ar: "التكاثر اللاجنسي في البكتيريا" },
  aspect: "3/5",
  parts: [
    // Labels point at the TOP cell (stage 1). Top cell ≈ x:35-65, y:3-13.
    { id: "chromo",  label: { en: "Chromosome",      ar: "كروموسوم" },        ax: 50,   ay: 8,   lx: 72, ly: 2,  lw: 26 },
    { id: "plasma",  label: { en: "Plasma membrane", ar: "الغشاء البلازمي" }, ax: 64.1, ay: 8,   lx: 72, ly: 12, lw: 26 },
    { id: "cyto",    label: { en: "Cytoplasm",       ar: "السايتوبلازم" },    ax: 43,   ay: 8.5, lx: 2,  ly: 2,  lw: 26 },
    { id: "wall",    label: { en: "Cell wall",       ar: "جدار الخلية" },     ax: 35,   ay: 8,   lx: 2,  ly: 12, lw: 26 },
  ],
  art: (() => {
    const WALL = "hsl(0 70% 58%)";
    const WALL_DK = "hsl(0 65% 35%)";
    const CYTO = "hsl(200 75% 90%)";
    const MEM = "hsl(210 60% 55%)";
    const DNA = "hsl(215 75% 38%)";

    // Rounded rectangle "rod" cell
    const rod = (cx: number, cy: number, w: number, hgt: number, key: string) => {
      const x = cx - w / 2;
      const y = cy - hgt / 2;
      const r = hgt / 2;
      return h("g", { key },
        // cell wall (red rim)
        h("rect", { x, y, width: w, height: hgt, rx: r, ry: r,
          fill: WALL, stroke: WALL_DK, strokeWidth: 0.5 }),
        // plasma membrane + cytoplasm (blue interior)
        h("rect", { x: x + 0.9, y: y + 0.9, width: w - 1.8, height: hgt - 1.8,
          rx: Math.max(r - 0.9, 0.5), ry: Math.max(r - 0.9, 0.5),
          fill: CYTO, stroke: MEM, strokeWidth: 0.3 }),
      );
    };

    // Single DNA squiggle (compact loop) centered at (cx, cy)
    const dna1 = (cx: number, cy: number, key: string) =>
      h("path", { key,
        d: `M ${cx-5} ${cy} q 2 -3 4 -1 q 2 2 4 -1 q 2 -3 4 0 q 1 3 -2 3 q -3 0 -3 2 q 0 2 -3 1 q -3 -1 -4 -4 z`,
        fill: "none", stroke: DNA, strokeWidth: 0.55, strokeLinejoin: "round", strokeLinecap: "round" });

    // Replicating DNA (longer tangled loop)
    const dna2 = (cx: number, cy: number, key: string) =>
      h("path", { key,
        d: `M ${cx-9} ${cy} q 2 -3 4 -1 q 2 2 4 -1 q 2 -2 4 0 q 2 2 4 -1 q 2 -2 3 1 q 1 3 -2 3 q -3 0 -4 2 q -2 2 -4 0 q -2 -1 -4 1 q -3 1 -5 -4 z`,
        fill: "none", stroke: DNA, strokeWidth: 0.55, strokeLinejoin: "round", strokeLinecap: "round" });

    // Stretched DNA (across the cell, two copies linked)
    const dna3 = (cx: number, cy: number, key: string) =>
      h("path", { key,
        d: `M ${cx-12} ${cy} q 2 -3 4 0 q 2 3 4 0 q 2 -3 4 0 q 2 3 4 0 q 2 -3 4 0 q 2 3 4 0 q 2 -3 4 0`,
        fill: "none", stroke: DNA, strokeWidth: 0.55, strokeLinejoin: "round", strokeLinecap: "round" });

    // Arrow between stages
    const arrow = (y: number, key: string) =>
      h("g", { key },
        h("line", { x1: 50, y1: y, x2: 50, y2: y + 2.6, stroke: WALL_DK, strokeWidth: 0.6 }),
        h("path", { d: `M ${48} ${y + 2.4} L 50 ${y + 3.6} L 52 ${y + 2.4} Z`, fill: WALL_DK }),
      );

    return h(Fragment, null,
      /* Stage 1 — one cell with single chromosome */
      rod(50, 8, 30, 10, "c1"),
      dna1(50, 8, "d1"),
      arrow(13.5, "a1"),

      /* Stage 2 — chromosome replicating */
      rod(50, 22, 30, 10, "c2"),
      dna2(50, 22, "d2"),
      arrow(27.5, "a2"),

      /* Stage 3 — chromosomes separating, cell elongating */
      rod(50, 36, 36, 10, "c3"),
      dna3(50, 36, "d3"),
      arrow(41.5, "a3"),

      /* Stage 4 — cell pinching in the middle (two attached rods) */
      rod(36, 51, 22, 10, "c4a"),
      rod(64, 51, 22, 10, "c4b"),
      dna1(36, 51, "d4a"),
      dna1(64, 51, "d4b"),
      arrow(56.5, "a4"),

      /* Stage 5 — two separated daughter cells */
      rod(28, 67, 22, 10, "c5a"),
      rod(72, 67, 22, 10, "c5b"),
      dna1(28, 67, "d5a"),
      dna1(72, 67, "d5b"),
    );
  })(),
};

export const CHAPTER_DIAGRAMS: Record<number, DiagramDef[]> = {

  1: [bacteria, animalCell, plantCell, plasmaMembrane, mitochondrion, chloroplast, chromosome],
  3: [fruit, binaryFission, seedTypes],
};

