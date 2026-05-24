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
    { id: "pilus",    label: { en: "Sex pilus",       ar: "الأهداب الجنسية" }, ax: 50, ay: 6,  lx: 4,  ly: 4  },
    { id: "cyto",     label: { en: "Cytoplasm",       ar: "السايتوبلازم" },    ax: 60, ay: 22, lx: 78, ly: 14 },
    { id: "nucleoid", label: { en: "Nucleoid",        ar: "النيوكليويد" },     ax: 46, ay: 30, lx: 78, ly: 26 },
    { id: "plasma",   label: { en: "Plasma membrane", ar: "الغشاء البلازمي" }, ax: 38, ay: 42, lx: 78, ly: 40 },
    { id: "wall",     label: { en: "Cell wall",       ar: "الجدار الخلوي" },   ax: 32, ay: 54, lx: 78, ly: 54 },
    { id: "capsule",  label: { en: "Capsule",         ar: "المحفظة" },         ax: 70, ay: 62, lx: 78, ly: 68 },
    { id: "fimbriae", label: { en: "Fimbriae",        ar: "الزوائد" },         ax: 28, ay: 28, lx: 4,  ly: 26 },
    { id: "flagella", label: { en: "Flagella",        ar: "الأسواط" },         ax: 50, ay: 72, lx: 4,  ly: 70 },
  ],
  art: h(Fragment, null,
    // body (rod)
    h("path", { d: "M40 10 Q40 6 50 6 Q60 6 60 10 L60 60 Q60 70 50 70 Q40 70 40 60 Z",
                fill: `${P} / 0.25`, stroke: P, strokeWidth: 0.6, style: { fill: "hsl(var(--primary) / 0.25)" } }),
    // capsule (outer halo)
    h("path", { d: "M38 9 Q38 4 50 4 Q62 4 62 9 L62 60 Q62 72 50 72 Q38 72 38 60 Z",
                fill: "none", stroke: A, strokeWidth: 0.4, strokeDasharray: "1 1" }),
    // nucleoid (DNA tangle)
    h("path", { d: "M44 22 Q47 18 50 22 T55 24 Q53 28 49 27 T44 30",
                fill: "none", stroke: P, strokeWidth: 0.6, opacity: 0.8 }),
    h("path", { d: "M45 28 Q48 32 52 30 T57 32",
                fill: "none", stroke: P, strokeWidth: 0.6, opacity: 0.7 }),
    // fimbriae (short hairs)
    ...Array.from({ length: 10 }, (_, i) => h("line", {
      key: `f${i}`, x1: 40, y1: 14 + i * 4, x2: 36, y2: 12 + i * 4.2,
      stroke: A, strokeWidth: 0.35,
    })),
    ...Array.from({ length: 10 }, (_, i) => h("line", {
      key: `fr${i}`, x1: 60, y1: 14 + i * 4, x2: 64, y2: 12 + i * 4.2,
      stroke: A, strokeWidth: 0.35,
    })),
    // sex pilus (one longer hair on top)
    h("line", { x1: 50, y1: 6, x2: 50, y2: -1, stroke: P, strokeWidth: 0.5 }),
    // flagella (wavy tail)
    h("path", { d: "M50 70 Q48 73 52 75 T48 78 T52 80",
                fill: "none", stroke: P, strokeWidth: 0.6 }),
  ),
};

/* Animal cell */
const animalCell: DiagramDef = {
  id: "ch1-animal-cell",
  title: { en: "Animal Cell", ar: "الخلية الحيوانية" },
  parts: [
    { id: "membrane", label: { en: "Cell membrane",  ar: "الغشاء البلازمي" },     ax: 14, ay: 38, lx: 2,  ly: 18 },
    { id: "nucleus",  label: { en: "Nucleus",        ar: "النواة" },              ax: 50, ay: 40, lx: 78, ly: 8  },
    { id: "nucleolus",label: { en: "Nucleolus",      ar: "النوية" },              ax: 52, ay: 38, lx: 78, ly: 20 },
    { id: "mito",     label: { en: "Mitochondrion",  ar: "الميتوكوندريا" },       ax: 72, ay: 60, lx: 80, ly: 56 },
    { id: "rer",      label: { en: "Rough ER",       ar: "الشبكة الخشنة" },        ax: 30, ay: 22, lx: 2,  ly: 4  },
    { id: "ser",      label: { en: "Smooth ER",      ar: "الشبكة الملساء" },       ax: 26, ay: 50, lx: 2,  ly: 44 },
    { id: "golgi",    label: { en: "Golgi apparatus",ar: "جهاز جولجي" },          ax: 70, ay: 30, lx: 80, ly: 32 },
    { id: "lyso",     label: { en: "Lysosome",       ar: "الليسوسوم" },           ax: 38, ay: 58, lx: 2,  ly: 58 },
    { id: "ribo",     label: { en: "Ribosome",       ar: "الرايبوسوم" },          ax: 60, ay: 60, lx: 2,  ly: 74 },
    { id: "centro",   label: { en: "Centrioles",     ar: "الجسيمات المركزية" },   ax: 64, ay: 50, lx: 80, ly: 74 },
    { id: "cyto",     label: { en: "Cytoplasm",      ar: "السايتوبلازم" },        ax: 20, ay: 32, lx: 2,  ly: 30 },
  ],
  art: h(Fragment, null,
    h("defs", null, h("radialGradient", { id: "anCell", cx: "50%", cy: "50%", r: "55%" },
      h("stop", { offset: "0%",  stopColor: "hsl(var(--primary) / 0.30)" }),
      h("stop", { offset: "100%", stopColor: "hsl(var(--primary) / 0.05)" }),
    )),
    h("ellipse", { cx: 50, cy: 40, rx: 38, ry: 28, fill: "url(#anCell)", stroke: P, strokeWidth: 0.5 }),
    // nucleus
    h("ellipse", { cx: 50, cy: 40, rx: 9, ry: 7, fill: "hsl(var(--primary) / 0.55)", stroke: P, strokeWidth: 0.4 }),
    h("circle",  { cx: 52, cy: 38, r: 2.2, fill: P, opacity: 0.85 }),
    // mitochondrion
    h("ellipse", { cx: 72, cy: 60, rx: 6, ry: 2.6, fill: "hsl(var(--accent) / 0.5)", stroke: A, strokeWidth: 0.3 }),
    h("path", { d: "M67 60 q1.5 -1.5 3 0 q1.5 1.5 3 0 q1.5 -1.5 3 0", fill: "none", stroke: A, strokeWidth: 0.3 }),
    // Golgi
    h("path", { d: "M65 28 Q70 26 75 28 M65 30 Q70 28 75 30 M65 32 Q70 30 75 32", fill: "none", stroke: A, strokeWidth: 0.5 }),
    // rough ER + dots
    h("path", { d: "M22 18 Q30 16 36 20 Q40 24 34 26 Q26 28 22 24 Z", fill: "none", stroke: P, strokeWidth: 0.4 }),
    ...[[24,19],[28,17],[33,19],[36,22],[32,25],[26,25]].map(([x,y],i)=>h("circle",{key:`r${i}`,cx:x,cy:y,r:0.45,fill:P})),
    // smooth ER
    h("path", { d: "M22 46 Q28 44 30 48 Q32 52 26 54 Q22 52 22 48 Z", fill: "none", stroke: P, strokeWidth: 0.4 }),
    // lysosomes
    h("circle", { cx: 38, cy: 58, r: 1.6, fill: A, opacity: 0.7 }),
    h("circle", { cx: 42, cy: 60, r: 1.2, fill: A, opacity: 0.6 }),
    // ribosomes
    ...[[58,60],[62,58],[60,62],[56,58]].map(([x,y],i)=>h("circle",{key:`rb${i}`,cx:x,cy:y,r:0.55,fill:P})),
    // centrioles
    h("g", null,
      h("rect", { x: 62, y: 49, width: 4, height: 1.4, fill: A, opacity: 0.8 }),
      h("rect", { x: 64, y: 47, width: 1.4, height: 4, fill: A, opacity: 0.8 }),
    ),
  ),
};

/* Plant cell */
const plantCell: DiagramDef = {
  id: "ch1-plant-cell",
  title: { en: "Plant Cell", ar: "الخلية النباتية" },
  parts: [
    { id: "wall",     label: { en: "Cell wall",          ar: "الجدار الخلوي" },        ax: 10, ay: 18, lx: 2,  ly: 4  },
    { id: "membrane", label: { en: "Cell membrane",      ar: "الغشاء البلازمي" },      ax: 14, ay: 24, lx: 2,  ly: 18 },
    { id: "chloro",   label: { en: "Chloroplast",        ar: "البلاستيدة الخضراء" },   ax: 22, ay: 36, lx: 2,  ly: 36 },
    { id: "vacuole",  label: { en: "Central vacuole",    ar: "الفجوة المركزية" },      ax: 50, ay: 40, lx: 78, ly: 6  },
    { id: "nucleus",  label: { en: "Nucleus",            ar: "النواة" },               ax: 30, ay: 56, lx: 2,  ly: 56 },
    { id: "nucleolus",label: { en: "Nucleolus",          ar: "النوية" },               ax: 32, ay: 54, lx: 2,  ly: 70 },
    { id: "mito",     label: { en: "Mitochondrion",      ar: "الميتوكوندريا" },        ax: 70, ay: 58, lx: 80, ly: 56 },
    { id: "golgi",    label: { en: "Golgi apparatus",    ar: "جهاز جولجي" },           ax: 68, ay: 28, lx: 80, ly: 22 },
    { id: "rer",      label: { en: "Rough ER",           ar: "الشبكة الخشنة" },        ax: 64, ay: 18, lx: 80, ly: 38 },
    { id: "cyto",     label: { en: "Cytoplasm",          ar: "السايتوبلازم" },         ax: 76, ay: 46, lx: 80, ly: 70 },
  ],
  art: h(Fragment, null,
    h("defs", null, h("linearGradient", { id: "plCell", x1: "0", x2: "0", y1: "0", y2: "1" },
      h("stop", { offset: "0%",  stopColor: "hsl(140 50% 55% / 0.35)" }),
      h("stop", { offset: "100%", stopColor: "hsl(140 50% 35% / 0.18)" }),
    )),
    // cell wall (outer rect)
    h("rect", { x: 8,  y: 8,  width: 84, height: 60, rx: 3, fill: "none", stroke: P, strokeWidth: 0.8 }),
    // plasma membrane
    h("rect", { x: 11, y: 11, width: 78, height: 54, rx: 3, fill: "url(#plCell)", stroke: A, strokeWidth: 0.4 }),
    // large central vacuole
    h("rect", { x: 24, y: 22, width: 52, height: 32, rx: 4, fill: "hsl(200 70% 60% / 0.25)", stroke: P, strokeWidth: 0.4 }),
    // chloroplasts (lens shapes)
    ...[[20,36],[22,46],[78,30],[80,42],[40,16],[58,16]].map(([x,y],i)=>h("ellipse",{key:`c${i}`,cx:x,cy:y,rx:3,ry:1.6,fill:"hsl(140 60% 45% / 0.85)",stroke:"hsl(140 50% 30%)",strokeWidth:0.2})),
    // nucleus
    h("ellipse", { cx: 30, cy: 58, rx: 5, ry: 3.5, fill: "hsl(var(--primary) / 0.55)", stroke: P, strokeWidth: 0.4 }),
    h("circle",  { cx: 32, cy: 56, r: 1.3, fill: P }),
    // mitochondria
    h("ellipse", { cx: 70, cy: 58, rx: 4, ry: 1.8, fill: "hsl(var(--accent) / 0.5)", stroke: A, strokeWidth: 0.3 }),
    // Golgi
    h("path", { d: "M62 26 Q68 24 74 26 M62 28 Q68 26 74 28 M62 30 Q68 28 74 30", fill: "none", stroke: A, strokeWidth: 0.5 }),
    // rough ER
    h("path", { d: "M55 16 Q62 14 68 18 Q72 22 64 24 Q56 22 55 18 Z", fill: "none", stroke: P, strokeWidth: 0.4 }),
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
  1: [bacteria, animalCell, plantCell, mitochondrion, chloroplast, plasmaMembrane],
  2: [],
  3: [],
  4: [],
  5: [],
};
