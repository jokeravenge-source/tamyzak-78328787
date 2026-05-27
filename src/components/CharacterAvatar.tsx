import React from "react";

export type Gender = "male" | "female";

function hashStr(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6D2B79F5) >>> 0;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

// Pale chibi skin tones (matches the soft-pixel reference style).
export const SKIN_COLORS = ["#fde7d3", "#f4cfa8", "#d9a679", "#a8714a", "#6b4226"] as const;
// Dark / cool hair palette (defaults to near-black like the reference).
export const HAIR_COLORS = ["#1a1410", "#2a1e16", "#4a2a18", "#7a4a22", "#b8742a", "#d9a441", "#6b3a8a"] as const;
// Default hoodie black sits first so randomized defaults match the reference look.
export const SHIRT_COLORS = ["#161616", "#1f1f1f", "#3b3b3b", "#4f46e5", "#0ea5e9", "#10b981", "#ef4444", "#ec4899", "#a855f7"] as const;

export const MALE_HAIRSTYLES = ["short", "buzz", "spiky", "curly", "fade", "messy"] as const;
export const FEMALE_HAIRSTYLES = ["long", "bun", "ponytail", "bob", "curly_long", "braids"] as const;

// Premium-only cosmetic option palettes
export const LIPSTICK_COLORS = ["#dc2626", "#e11d48", "#be185d", "#9d174d", "#f43f5e", "#c026d3"] as const;
export const EYESHADOW_COLORS = ["#a855f7", "#ec4899", "#06b6d4", "#10b981", "#f59e0b", "#6366f1"] as const;
export const HEADBAND_COLORS = ["#ef4444", "#3b82f6", "#10b981", "#1a1a1a", "#ffffff", "#f59e0b"] as const;
export type NecklaceKind = "gold" | "pearl" | null;

export type CharacterTraits = {
  skin: string;
  hairColor: string;
  shirt: string;
  hair: string;
  accessory: "glasses" | "crown" | null;
  blush: boolean;
  // Premium-only (null/false when not applied)
  lipstick?: string | null;
  eyeshadow?: string | null;
  muscle?: boolean;
  headband?: string | null;
  necklace?: NecklaceKind;
};

function pick<T>(arr: readonly T[], r: number): T {
  return arr[Math.floor(r * arr.length) % arr.length];
}

export function getAvatarStyle(seed: string, gender: Gender): CharacterTraits {
  const rand = mulberry32(hashStr(seed + ":" + gender));
  // Default to the reference look (pale skin, dark hair, black hoodie). Randomization
  // only nudges colors so the whole roster stays inside the new pixel-art design.
  return {
    skin: rand() < 0.7 ? SKIN_COLORS[0] : pick(SKIN_COLORS, rand()),
    hairColor: rand() < 0.7 ? HAIR_COLORS[0] : pick(HAIR_COLORS, rand()),
    shirt: rand() < 0.65 ? SHIRT_COLORS[0] : pick(SHIRT_COLORS, rand()),
    hair: gender === "male" ? pick(MALE_HAIRSTYLES, rand()) : pick(FEMALE_HAIRSTYLES, rand()),
    accessory: rand() > 0.85 ? "glasses" : null,
    blush: gender === "female",
    lipstick: null,
    eyeshadow: null,
    muscle: false,
    headband: null,
    necklace: null,
  };
}

/* ------------------------------------------------------------------ */
/* Pixel-art chibi renderer                                            */
/* ------------------------------------------------------------------ */

const PW = 32; // pixel grid width
const PH = 48; // pixel grid height

type Grid = string[][];

function newGrid(): Grid {
  return Array.from({ length: PH }, () => Array<string>(PW).fill("."));
}
function setPx(g: Grid, x: number, y: number, c: string) {
  if (x >= 0 && x < PW && y >= 0 && y < PH) g[y][x] = c;
}
function fillRect(g: Grid, x1: number, y1: number, x2: number, y2: number, c: string) {
  for (let y = y1; y <= y2; y++) for (let x = x1; x <= x2; x++) setPx(g, x, y, c);
}
function fillEllipse(g: Grid, cx: number, cy: number, rx: number, ry: number, c: string, overwrite = true) {
  for (let y = cy - ry; y <= cy + ry; y++) {
    for (let x = cx - rx; x <= cx + rx; x++) {
      const dx = (x - cx) / rx, dy = (y - cy) / ry;
      if (dx * dx + dy * dy <= 1) {
        if (!overwrite && g[y]?.[x] && g[y][x] !== ".") continue;
        setPx(g, x, y, c);
      }
    }
  }
}
function outline(g: Grid, c: string) {
  // For every non-transparent cell, if any 4-neighbor is transparent or out of bounds, mark as outline.
  const targets: Array<[number, number]> = [];
  for (let y = 0; y < PH; y++) {
    for (let x = 0; x < PW; x++) {
      if (g[y][x] === "." || g[y][x] === c) continue;
      const n = [
        y > 0 ? g[y - 1][x] : ".",
        y < PH - 1 ? g[y + 1][x] : ".",
        x > 0 ? g[y][x - 1] : ".",
        x < PW - 1 ? g[y][x + 1] : ".",
      ];
      if (n.some((v) => v === ".")) targets.push([x, y]);
    }
  }
  for (const [x, y] of targets) setPx(g, x, y, c);
}

function mix(hex: string, withHex: string, t: number) {
  const h = (c: string) => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
  const [r1, g1, b1] = h(hex);
  const [r2, g2, b2] = h(withHex);
  const r = Math.round(r1 * (1 - t) + r2 * t);
  const gC = Math.round(g1 * (1 - t) + g2 * t);
  const b = Math.round(b1 * (1 - t) + b2 * t);
  return "#" + [r, gC, b].map((v) => v.toString(16).padStart(2, "0")).join("");
}

function drawHair(g: Grid, style: string) {
  const H = "H"; // hair color marker
  // Default cap covers crown of head: ellipse rx=10 ry=6 cx=16 cy=8
  switch (style) {
    case "buzz": {
      // Thin cap, low coverage
      fillEllipse(g, 16, 9, 9, 4, H);
      break;
    }
    case "short": {
      // Side-parted short cut with bangs to right brow
      fillEllipse(g, 16, 9, 10, 6, H);
      fillRect(g, 7, 11, 14, 13, H);
      fillRect(g, 18, 11, 24, 12, H);
      break;
    }
    case "spiky": {
      fillEllipse(g, 16, 9, 10, 5, H);
      // spikes upward
      const spikes = [
        [8, 4], [10, 2], [12, 4], [14, 1], [16, 3], [18, 1], [20, 4], [22, 2], [24, 4],
      ];
      for (const [x, y] of spikes) {
        for (let yy = y; yy <= 8; yy++) setPx(g, x, yy, H);
        setPx(g, x - 1, y + 1, H);
        setPx(g, x + 1, y + 1, H);
      }
      break;
    }
    case "curly": {
      fillEllipse(g, 16, 9, 10, 6, H);
      // tufts
      fillEllipse(g, 8, 6, 3, 3, H);
      fillEllipse(g, 13, 4, 3, 3, H);
      fillEllipse(g, 19, 4, 3, 3, H);
      fillEllipse(g, 24, 6, 3, 3, H);
      break;
    }
    case "fade": {
      // Flat-top: tall block on crown, short sides
      fillEllipse(g, 16, 11, 10, 3, H);
      fillRect(g, 11, 4, 21, 10, H);
      break;
    }
    case "messy":
    default: {
      // Default boy: messy thick fringe matching reference
      fillEllipse(g, 16, 9, 11, 7, H);
      // jagged forehead bangs
      const bangs = [
        [8, 11], [9, 12], [10, 13], [11, 12], [12, 13], [13, 12], [14, 13],
        [15, 12], [16, 13], [17, 12], [18, 13], [19, 12], [20, 13], [21, 12],
        [22, 13], [23, 12], [24, 11],
      ];
      for (const [x, y] of bangs) setPx(g, x, y, H);
      // little antenna tufts (like reference)
      setPx(g, 13, 3, H); setPx(g, 13, 4, H);
      setPx(g, 19, 3, H); setPx(g, 19, 4, H);
      break;
    }
    case "long": {
      // Default girl: long hair past shoulders with bangs
      fillEllipse(g, 16, 9, 11, 7, H);
      // bangs over forehead
      fillRect(g, 8, 11, 24, 14, H);
      // sides flowing down
      fillRect(g, 4, 12, 7, 34, H);
      fillRect(g, 25, 12, 28, 34, H);
      // back hair behind shoulders (fills behind body)
      fillEllipse(g, 16, 28, 13, 10, H, false);
      // gentle wavy ends
      setPx(g, 5, 35, H); setPx(g, 6, 36, H);
      setPx(g, 26, 35, H); setPx(g, 27, 36, H);
      break;
    }
    case "bun": {
      fillEllipse(g, 16, 9, 10, 6, H);
      fillRect(g, 8, 11, 24, 13, H);
      fillEllipse(g, 16, 3, 4, 3, H); // bun on top
      break;
    }
    case "ponytail": {
      fillEllipse(g, 16, 9, 10, 6, H);
      fillRect(g, 8, 11, 24, 13, H);
      // side ponytail
      fillRect(g, 24, 10, 28, 28, H);
      fillEllipse(g, 27, 30, 2, 3, H);
      break;
    }
    case "bob": {
      fillEllipse(g, 16, 10, 11, 7, H);
      fillRect(g, 5, 11, 27, 20, H);
      break;
    }
    case "curly_long": {
      fillEllipse(g, 16, 9, 11, 7, H);
      fillRect(g, 8, 11, 24, 14, H);
      fillRect(g, 4, 12, 7, 30, H);
      fillRect(g, 25, 12, 28, 30, H);
      // curls along edges
      for (const y of [16, 22, 28]) {
        fillEllipse(g, 4, y, 2, 2, H);
        fillEllipse(g, 28, y, 2, 2, H);
      }
      fillEllipse(g, 6, 32, 3, 2, H);
      fillEllipse(g, 26, 32, 3, 2, H);
      break;
    }
    case "braids": {
      fillEllipse(g, 16, 9, 10, 6, H);
      fillRect(g, 8, 11, 24, 13, H);
      // braid columns each side with bulges
      for (const y of [16, 20, 24, 28, 32]) {
        fillEllipse(g, 5, y, 2, 2, H);
        fillEllipse(g, 27, y, 2, 2, H);
      }
      break;
    }
  }
}

function buildSprite(t: CharacterTraits, gender: Gender): Grid {
  const g = newGrid();

  const SKIN = "S"; // skin
  const SHIRT = "C";
  const POCKET = "J"; // hoodie shadow / pocket
  const PANT = "D";
  const SHOE = "B";
  const EYE = "E";
  const EYE_W = "W";
  const MOUTH = "M";
  const BLUSH = "Z";
  const HEADBAND = "K";
  const GLASS = "G";
  const CROWN = "R";
  const LIPSTICK = "L";
  const EYESHADOW = "X";
  const NECK_GOLD = "Y";
  const NECK_PEARL = "P";

  // Background pants column behind hoodie (for legs)
  fillRect(g, 11, 33, 20, 40, PANT);
  // Shoes
  fillRect(g, 10, 41, 15, 43, SHOE);
  fillRect(g, 16, 41, 21, 43, SHOE);
  // White sole stripe
  fillRect(g, 10, 43, 15, 43, EYE_W);
  fillRect(g, 16, 43, 21, 43, EYE_W);

  // Hoodie body (rounded by ellipse mask)
  fillEllipse(g, 16, 30, 10, 8, SHIRT);
  fillRect(g, 6, 26, 25, 33, SHIRT);
  // shoulder slope soften
  setPx(g, 6, 26, "."); setPx(g, 25, 26, ".");
  setPx(g, 6, 27, SHIRT); setPx(g, 25, 27, SHIRT);
  // Hoodie pocket (kangaroo)
  fillRect(g, 11, 30, 20, 33, POCKET);
  setPx(g, 11, 30, SHIRT); setPx(g, 20, 30, SHIRT);
  // Zipper line
  for (let y = 25; y <= 32; y++) setPx(g, 16, y, mix(t.shirt, "#000000", 0.5) === t.shirt ? "#ffffff" : "Q"); // placeholder, will style via Q

  // Muscle (premium): broaden shoulders
  if (t.muscle) {
    fillRect(g, 4, 27, 27, 30, SHIRT);
    fillEllipse(g, 16, 28, 12, 4, SHIRT);
  }

  // Neck
  fillRect(g, 14, 22, 18, 25, SKIN);

  // Head (big chibi head)
  fillEllipse(g, 16, 13, 9, 10, SKIN);
  // Ears
  setPx(g, 6, 14, SKIN); setPx(g, 6, 15, SKIN);
  setPx(g, 25, 14, SKIN); setPx(g, 25, 15, SKIN);

  // Hair (under-layer behind head: pass 1 = back/long hair behind shoulders)
  // First pass: long-style back hair painted before face details so face overrides it
  const longish = ["long", "curly_long", "braids", "ponytail", "bob"].includes(t.hair);
  if (longish) {
    // back hair behind head/body in 'H' marker (drawn now, face/body re-overrides)
    fillEllipse(g, 16, 18, 12, 8, "H");
    if (t.hair === "long" || t.hair === "curly_long") {
      fillRect(g, 4, 18, 7, 34, "H");
      fillRect(g, 25, 18, 28, 34, "H");
    }
  }
  // Re-paint head/face skin so back hair stays only behind it
  fillEllipse(g, 16, 13, 9, 10, SKIN);
  setPx(g, 6, 14, SKIN); setPx(g, 6, 15, SKIN);
  setPx(g, 25, 14, SKIN); setPx(g, 25, 15, SKIN);

  // Hair top (always over the head)
  drawHair(g, t.hair);

  // Headband over hair
  if (t.headband) {
    fillRect(g, 7, 10, 24, 11, HEADBAND);
  }

  // Eyes — big chibi eyes
  fillRect(g, 11, 14, 13, 16, EYE);
  fillRect(g, 18, 14, 20, 16, EYE);
  // sparkle
  setPx(g, 12, 14, EYE_W);
  setPx(g, 19, 14, EYE_W);

  // Eyeshadow (premium) above eyes
  if (t.eyeshadow) {
    fillRect(g, 11, 13, 13, 13, EYESHADOW);
    fillRect(g, 18, 13, 20, 13, EYESHADOW);
  }

  // Blush
  if (t.blush) {
    setPx(g, 10, 18, BLUSH); setPx(g, 11, 18, BLUSH);
    setPx(g, 20, 18, BLUSH); setPx(g, 21, 18, BLUSH);
  }

  // Mouth / lipstick
  if (t.lipstick) {
    setPx(g, 15, 19, LIPSTICK); setPx(g, 16, 19, LIPSTICK); setPx(g, 17, 19, LIPSTICK);
  } else {
    setPx(g, 15, 19, MOUTH); setPx(g, 16, 19, MOUTH);
  }

  // Glasses
  if (t.accessory === "glasses") {
    // circle frames
    for (const [x, y] of [
      [10, 14], [10, 15], [10, 16], [11, 13], [12, 13], [13, 13], [14, 14], [14, 15], [14, 16], [11, 17], [12, 17], [13, 17],
      [17, 14], [17, 15], [17, 16], [18, 13], [19, 13], [20, 13], [21, 14], [21, 15], [21, 16], [18, 17], [19, 17], [20, 17],
      [15, 15], [16, 15],
    ]) setPx(g, x, y, GLASS);
  }
  // Crown
  if (t.accessory === "crown") {
    fillRect(g, 9, 5, 23, 7, CROWN);
    setPx(g, 11, 4, CROWN); setPx(g, 16, 3, CROWN); setPx(g, 21, 4, CROWN);
  }

  // Necklace
  if (t.necklace === "gold") {
    setPx(g, 12, 24, NECK_GOLD); setPx(g, 13, 25, NECK_GOLD); setPx(g, 14, 26, NECK_GOLD);
    setPx(g, 15, 26, NECK_GOLD); setPx(g, 16, 26, NECK_GOLD); setPx(g, 17, 26, NECK_GOLD); setPx(g, 18, 26, NECK_GOLD);
    setPx(g, 19, 25, NECK_GOLD); setPx(g, 20, 24, NECK_GOLD);
  } else if (t.necklace === "pearl") {
    for (let i = 0; i < 9; i++) setPx(g, 12 + i, 25 + (i % 2 === 0 ? 0 : 1), NECK_PEARL);
  }

  // Outline pass (snaps every silhouette edge to dark for the chibi look)
  outline(g, "O");

  return g;
}

function colorOf(ch: string, t: CharacterTraits): string | null {
  switch (ch) {
    case ".": return null;
    case "O": return "#0d0d0d";
    case "S": return t.skin;
    case "H": return t.hairColor;
    case "C": return t.shirt;
    case "J": return mix(t.shirt, "#000000", 0.35);
    case "D": return "#141414";
    case "B": return "#0a0a0a";
    case "E": return "#0d0d0d";
    case "W": return "#ffffff";
    case "M": return mix(t.skin, "#7a2a2a", 0.7);
    case "Z": return "#ff8aa8";
    case "K": return t.headband || "#ef4444";
    case "G": return "#0d0d0d";
    case "R": return "#fbbf24";
    case "L": return t.lipstick || "#dc2626";
    case "X": return t.eyeshadow || "#a855f7";
    case "Y": return "#fbbf24";
    case "P": return "#fdf6e3";
    case "Q": return mix(t.shirt, "#ffffff", 0.4);
    default: return null;
  }
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export function CharacterAvatar({
  seed,
  gender,
  size = 96,
  className = "",
  traits,
}: {
  seed: string;
  gender: Gender | null | undefined;
  size?: number;
  className?: string;
  traits?: Partial<CharacterTraits> | null;
}) {
  const g: Gender = gender ?? "male";
  const base = getAvatarStyle(seed || "anon", g);
  const s: CharacterTraits = { ...base, ...(traits ?? {}) } as CharacterTraits;

  const grid = React.useMemo(() => buildSprite(s, g), [
    s.skin, s.hairColor, s.shirt, s.hair, s.accessory, s.blush,
    s.lipstick, s.eyeshadow, s.muscle, s.headband, s.necklace, g,
  ]);

  // Build run-length rectangles per row for fewer DOM nodes.
  const rects: React.ReactNode[] = [];
  for (let y = 0; y < PH; y++) {
    let x = 0;
    while (x < PW) {
      const ch = grid[y][x];
      if (ch === ".") { x++; continue; }
      let w = 1;
      while (x + w < PW && grid[y][x + w] === ch) w++;
      const col = colorOf(ch, s);
      if (col) {
        rects.push(<rect key={`${y}-${x}`} x={x} y={y} width={w} height={1} fill={col} />);
      }
      x += w;
    }
  }

  return (
    <svg
      viewBox={`0 0 ${PW} ${PH}`}
      width={size}
      height={size * (PH / PW)}
      preserveAspectRatio="xMidYMid meet"
      className={className}
      shapeRendering="crispEdges"
      style={{ display: "block", imageRendering: "pixelated" as any }}
    >
      {/* soft tinted background circle for chip contexts */}
      <rect x="0" y="0" width={PW} height={PH} fill="transparent" />
      {rects}
    </svg>
  );
}

export default CharacterAvatar;

function Hair({ style, color }: { style: string; color: string }) {
  // Guaranteed scalp cap — ensures the top of the head (ellipse cx=50,cy=48,rx=20,ry=22)
  // is always covered by hair color, no matter which decorative style is picked.
  const Cap = () => (
    <path d="M 30 50 Q 30 26 50 26 Q 70 26 70 50 Z" fill={color} />
  );
  const withCap = (decoration: React.ReactNode) => (
    <g>
      <Cap />
      {decoration}
    </g>
  );
  switch (style) {
    // very thin shaved cap with subtle stubble dots
    case "buzz":
      return withCap(
        <g fill={color}>
          <circle cx="40" cy="36" r="0.8" opacity="0.5" />
          <circle cx="46" cy="32" r="0.8" opacity="0.5" />
          <circle cx="52" cy="34" r="0.8" opacity="0.5" />
          <circle cx="58" cy="32" r="0.8" opacity="0.5" />
          <circle cx="62" cy="38" r="0.8" opacity="0.5" />
        </g>
      );
    // side-parted short cut
    case "short":
      return withCap(
        <g fill={color}>
          <path d="M 28 50 Q 28 22 50 22 Q 72 22 72 48 L 68 40 Q 60 30 50 32 Q 38 34 32 44 Z" />
        </g>
      );
    // tall sharp spikes
    case "spiky":
      return withCap(
        <g fill={color}>
          <path d="M 30 42 Q 30 30 50 30 Q 70 30 70 42 Z" />
          <path d="M30 32 L34 12 L40 28 L44 10 L50 26 L54 8 L60 26 L66 10 L70 32 Z" />
        </g>
      );
    // round curly afro top
    case "curly":
      return withCap(
        <g fill={color}>
          <circle cx="32" cy="32" r="9" />
          <circle cx="42" cy="22" r="10" />
          <circle cx="52" cy="18" r="11" />
          <circle cx="62" cy="22" r="10" />
          <circle cx="68" cy="32" r="9" />
          <path d="M 30 44 Q 30 32 50 32 Q 70 32 70 44 Z" />
        </g>
      );
    // high-top fade: tall block on crown, shaved sides
    case "fade":
      return withCap(
        <g fill={color}>
          <rect x="36" y="14" width="28" height="22" rx="6" />
        </g>
      );
    // messy tufts going every direction
    case "messy":
      return withCap(
        <g fill={color}>
          <path d="M 28 46 Q 28 22 50 22 Q 72 22 72 46 Z" />
          <path d="M28 28 Q26 16 36 20 Q34 10 44 18 Q46 6 52 18 Q58 8 62 20 Q72 14 70 28 Q66 24 60 28 Q54 22 48 28 Q40 24 34 30 Z" />
        </g>
      );
    // long straight hair past shoulders
    case "long":
      return withCap(
        <g fill={color}>
          <path d="M22 56 Q22 22 50 22 Q78 22 78 56 L78 92 L66 92 L66 60 L34 60 L34 92 L22 92 Z" />
        </g>
      );
    // top bun with cap
    case "bun":
      return withCap(
        <g fill={color}>
          <circle cx="50" cy="14" r="11" />
          <path d="M 28 48 Q 28 22 50 22 Q 72 22 72 48 Z" />
          <line x1="50" y1="22" x2="50" y2="14" stroke={color} strokeWidth="3" />
        </g>
      );
    // side ponytail
    case "ponytail":
      return withCap(
        <g fill={color}>
          <path d="M 28 50 Q 28 22 50 22 Q 72 22 72 50 Z" />
          <path d="M70 40 Q92 56 82 86 L72 82 Q80 60 64 50 Z" />
        </g>
      );
    // chin-length bob frame
    case "bob":
      return withCap(
        <g fill={color}>
          <path d="M22 64 Q22 22 50 22 Q78 22 78 64 L72 70 L68 56 L32 56 L28 70 Z" />
        </g>
      );
    // long curly hair
    case "curly_long":
      return withCap(
        <g fill={color}>
          <path d="M22 56 Q22 22 50 22 Q78 22 78 56 L78 84 L66 84 L66 60 L34 60 L34 84 L22 84 Z" />
          <circle cx="26" cy="32" r="8" />
          <circle cx="38" cy="20" r="9" />
          <circle cx="50" cy="16" r="10" />
          <circle cx="62" cy="20" r="9" />
          <circle cx="74" cy="32" r="8" />
          <circle cx="24" cy="70" r="7" />
          <circle cx="76" cy="70" r="7" />
        </g>
      );
    // two long braids on each side
    case "braids":
      return withCap(
        <g fill={color}>
          <path d="M 28 50 Q 28 22 50 22 Q 72 22 72 50 Z" />
          <ellipse cx="24" cy="58" rx="6" ry="8" />
          <ellipse cx="24" cy="72" rx="6" ry="8" />
          <ellipse cx="24" cy="86" rx="6" ry="8" />
          <ellipse cx="76" cy="58" rx="6" ry="8" />
          <ellipse cx="76" cy="72" rx="6" ry="8" />
          <ellipse cx="76" cy="86" rx="6" ry="8" />
        </g>
      );
    default:
      return <Cap />;
  }
}

export function CharacterAvatar({
  seed,
  gender,
  size = 96,
  className = "",
  traits,
}: {
  seed: string;
  gender: Gender | null | undefined;
  size?: number;
  className?: string;
  traits?: Partial<CharacterTraits> | null;
}) {
  const g: Gender = gender ?? "male";
  const base = getAvatarStyle(seed || "anon", g);
  const s: CharacterTraits = { ...base, ...(traits ?? {}) } as CharacterTraits;

  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={className}
      style={{ display: "block" }}
    >
      {/* background */}
      <rect width="100" height="100" rx="50" fill={s.shirt} opacity="0.15" />
      {/* shirt / shoulders (broadens when muscle is on) */}
      {s.muscle ? (
        <>
          <path d="M6 100 Q6 70 28 64 L72 64 Q94 70 94 100 Z" fill={s.shirt} />
          {/* pec definition */}
          <path d="M30 72 Q40 78 48 72 L48 86 Q40 88 32 86 Z" fill="#000" opacity="0.12" />
          <path d="M52 72 Q60 78 70 72 L68 86 Q60 88 52 86 Z" fill="#000" opacity="0.12" />
        </>
      ) : (
        <path d="M15 100 Q15 75 35 70 L65 70 Q85 75 85 100 Z" fill={s.shirt} />
      )}
      <path d="M40 70 Q50 78 60 70 L60 74 Q50 82 40 74 Z" fill="#ffffff" opacity="0.25" />
      {/* neck */}
      <rect x="44" y="60" width="12" height="14" rx="3" fill={s.skin} />
      {/* necklace */}
      {s.necklace === "gold" && (
        <g>
          <path d="M34 70 Q50 82 66 70" fill="none" stroke="#fbbf24" strokeWidth="1.6" />
          <path d="M46 78 L50 86 L54 78 Z" fill="#fbbf24" stroke="#b45309" strokeWidth="0.5" />
        </g>
      )}
      {s.necklace === "pearl" && (
        <g fill="#fdf6e3" stroke="#cbb994" strokeWidth="0.4">
          {Array.from({ length: 9 }).map((_, i) => {
            const t = i / 8;
            const x = 34 + t * 32;
            const y = 70 + Math.sin(t * Math.PI) * 8;
            return <circle key={i} cx={x} cy={y} r={1.4} />;
          })}
        </g>
      )}
      {/* head */}
      <ellipse cx="50" cy="48" rx="20" ry="22" fill={s.skin} />
      {/* ears */}
      <ellipse cx="29" cy="50" rx="3" ry="5" fill={s.skin} />
      <ellipse cx="71" cy="50" rx="3" ry="5" fill={s.skin} />
      {/* hair */}
      <Hair style={s.hair} color={s.hairColor} />
      {/* headband (sits over the hair) */}
      {s.headband && (
        <g>
          <path
            d="M28 38 Q50 30 72 38 L72 44 Q50 36 28 44 Z"
            fill={s.headband}
            stroke="#000"
            strokeOpacity="0.25"
            strokeWidth="0.6"
          />
          <circle cx="50" cy="38" r="1.8" fill="#fff" opacity="0.6" />
        </g>
      )}
      {/* eyeshadow (premium) */}
      {s.eyeshadow && (
        <g fill={s.eyeshadow} opacity="0.55">
          <path d="M37 47 Q42 44 47 47 L47 49 Q42 47 37 49 Z" />
          <path d="M53 47 Q58 44 63 47 L63 49 Q58 47 53 49 Z" />
        </g>
      )}
      {/* eyes */}
      <circle cx="42" cy="50" r="2" fill="#1a1a1a" />
      <circle cx="58" cy="50" r="2" fill="#1a1a1a" />
      {/* blush */}
      {s.blush && (
        <>
          <circle cx="39" cy="56" r="2.5" fill="#ff8aa8" opacity="0.5" />
          <circle cx="61" cy="56" r="2.5" fill="#ff8aa8" opacity="0.5" />
        </>
      )}
      {/* mouth / lipstick */}
      {s.lipstick ? (
        <g>
          <path
            d="M44 60 Q47 58 50 60 Q53 58 56 60 Q53 64 50 64 Q47 64 44 60 Z"
            fill={s.lipstick}
            stroke="#000"
            strokeOpacity="0.25"
            strokeWidth="0.5"
          />
          <path d="M46 60 Q50 61.5 54 60" stroke="#fff" strokeOpacity="0.5" strokeWidth="0.6" fill="none" />
        </g>
      ) : (
        <path d="M45 60 Q50 64 55 60" stroke="#1a1a1a" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      )}
      {/* glasses */}
      {s.accessory === "glasses" && (
        <g stroke="#1a1a1a" strokeWidth="1.5" fill="none">
          <circle cx="42" cy="50" r="5" />
          <circle cx="58" cy="50" r="5" />
          <line x1="47" y1="50" x2="53" y2="50" />
        </g>
      )}
      {/* premium crown — cute rounded heart-tipped tiara */}
      {s.accessory === "crown" && (
        <g>
          <defs>
            <linearGradient id="crownGold" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fde68a" />
              <stop offset="55%" stopColor="#fbbf24" />
              <stop offset="100%" stopColor="#d97706" />
            </linearGradient>
          </defs>
          {/* soft rounded tiara body */}
          <path
            d="M30 32 Q30 22 36 22 Q38 14 44 20 Q50 10 56 20 Q62 14 64 22 Q70 22 70 32 Z"
            fill="url(#crownGold)"
            stroke="#b45309"
            strokeWidth="0.9"
            strokeLinejoin="round"
          />
          {/* base band */}
          <rect x="29" y="31" width="42" height="3" rx="1.5" fill="#f59e0b" stroke="#b45309" strokeWidth="0.6" />
          {/* heart on top */}
          <path
            d="M50 14 Q47 10 44.5 12.5 Q42 15 50 20 Q58 15 55.5 12.5 Q53 10 50 14 Z"
            fill="#f472b6"
            stroke="#be185d"
            strokeWidth="0.5"
          />
          {/* pastel gems */}
          <circle cx="37" cy="24" r="1.6" fill="#a78bfa" stroke="#7c3aed" strokeWidth="0.3" />
          <circle cx="50" cy="26" r="1.8" fill="#22d3ee" stroke="#0e7490" strokeWidth="0.3" />
          <circle cx="63" cy="24" r="1.6" fill="#fb7185" stroke="#be123c" strokeWidth="0.3" />
          {/* sparkles */}
          <g fill="#fff" opacity="0.9">
            <circle cx="34" cy="28" r="0.6" />
            <circle cx="66" cy="28" r="0.6" />
            <circle cx="50" cy="32" r="0.5" />
          </g>
        </g>
      )}
    </svg>
  );
}

export default CharacterAvatar;