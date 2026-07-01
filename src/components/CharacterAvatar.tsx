import React from "react";
import boy1 from "@/assets/character-boy-1.png";
import boy2 from "@/assets/character-boy-2.png";
import boy3 from "@/assets/character-boy-3.png";
import boy4 from "@/assets/character-boy-4.png";
import boy5 from "@/assets/character-boy-5.png";
import boy6 from "@/assets/character-boy-6.png";
import boy7 from "@/assets/character-boy-7.png";
import girl1 from "@/assets/character-girl-1.png";
import girl2 from "@/assets/character-girl-2.png";
import girl3 from "@/assets/character-girl-3.png";
import girl4 from "@/assets/character-girl-4.png";
import girl5 from "@/assets/character-girl-5.png";
import girl6 from "@/assets/character-girl-6.png";
import girl7 from "@/assets/character-girl-7.png";

export type Gender = "male" | "female";

export const MALE_VARIANTS = [boy1, boy2, boy3, boy4, boy5, boy6, boy7] as const;
export const FEMALE_VARIANTS = [girl1, girl2, girl3, girl4, girl5, girl6, girl7] as const;
export type CharacterVariant = 1 | 2 | 3 | 4 | 5 | 6 | 7;

// Kept for API compatibility with AccountCenter / Leaderboard.
export const SKIN_COLORS = ["#fff6f1", "#feede6", "#ffe6d5", "#f1cfc5", "#d2b0a2", "#a17c6a"] as const;
export const HAIR_COLORS = ["#1a1410", "#2a1e16", "#4a2a18", "#7a4a22", "#b8742a", "#d9a441", "#6b3a8a"] as const;
export const SHIRT_COLORS = ["#161616", "#1f1f1f", "#3b3b3b", "#4f46e5", "#0ea5e9", "#10b981", "#ef4444", "#ec4899", "#a855f7"] as const;
export const MALE_HAIRSTYLES = ["short", "buzz", "spiky", "curly", "fade", "messy"] as const;
export const FEMALE_HAIRSTYLES = ["long", "bun", "ponytail", "bob", "curly_long", "braids"] as const;
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
  lipstick?: string | null;
  eyeshadow?: string | null;
  muscle?: boolean;
  headband?: string | null;
  necklace?: NecklaceKind;
  variant?: CharacterVariant;
};

export function getAvatarStyle(_seed: string, gender: Gender): CharacterTraits {
  return {
    skin: SKIN_COLORS[0],
    hairColor: HAIR_COLORS[0],
    shirt: SHIRT_COLORS[0],
    hair: gender === "male" ? "messy" : "long",
    accessory: null,
    blush: gender === "female",
    lipstick: null,
    eyeshadow: null,
    muscle: false,
    headband: null,
    necklace: null,
    variant: 1,
  };
}

export function CharacterAvatar({
  gender,
  size = 96,
  className = "",
  traits,
}: {
  seed?: string;
  gender: Gender | null | undefined;
  size?: number;
  className?: string;
  traits?: Partial<CharacterTraits> | null;
}) {
  const g: Gender = gender ?? "male";
  const variant = (traits?.variant ?? 1) as CharacterVariant;
  const idx = Math.max(0, Math.min(MALE_VARIANTS.length - 1, variant - 1));
  const src = g === "female" ? FEMALE_VARIANTS[idx] : MALE_VARIANTS[idx];
  const hasCrown = traits?.accessory === "crown";
  const skin = traits?.skin ?? SKIN_COLORS[0];
  const tinted = useSkinTinted(src, skin);
  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
      }}
    >
      <img
        src={tinted ?? src}
        alt={g === "female" ? "Female student character avatar" : "Male student character avatar"}
        width={size}
        height={size}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
          imageRendering: "auto",
        }}
        draggable={false}
      />
      {hasCrown && (
        <span
          aria-hidden
          style={{
            position: "absolute",
            top: "22%",
            left: "50%",
            transform: "translate(-50%, -100%)",
            fontSize: size * 0.32,
            lineHeight: 1,
            filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.35))",
            pointerEvents: "none",
          }}
        >
          👑
        </span>
      )}
    </div>
  );
}

export default CharacterAvatar;

/* ------------------------------------------------------------------ */
/* Skin recoloring                                                     */
/* ------------------------------------------------------------------ */

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

// Reference skin tone present in the source PNGs (pale peach).
const REF_SKIN: [number, number, number] = [254, 235, 228];

function tintSkin(img: HTMLImageElement, targetHex: string): string {
  const c = document.createElement("canvas");
  c.width = img.naturalWidth;
  c.height = img.naturalHeight;
  const ctx = c.getContext("2d");
  if (!ctx) return img.src;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, c.width, c.height);
  const px = data.data;
  const [tr, tg, tb] = hexToRgb(targetHex);
  const total = c.width * c.height;
  const seed = new Uint8Array(total);
  const allowed = new Uint8Array(total);
  const skinMask = new Uint8Array(total);

  for (let i = 0; i < px.length; i += 4) {
    const r = px[i], g = px[i + 1], b = px[i + 2], a = px[i + 3];
    const p = i / 4;
    seed[p] = isCoreSkinPixel(r, g, b, a) ? 1 : 0;
    allowed[p] = isNearbySkinPixel(r, g, b, a) ? 1 : 0;
  }

  // Female reference art has soft pink/white cheek and ear highlights that are
  // not strictly peach. Grow the mask from confirmed skin pixels so those
  // connected highlights recolor, while disconnected hair/clothes stay intact.
  for (let p = 0; p < total; p++) {
    if (!seed[p] || skinMask[p]) continue;
    const stack = [p];
    skinMask[p] = 1;
    while (stack.length) {
      const cur = stack.pop()!;
      const x = cur % c.width;
      const y = Math.floor(cur / c.width);
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || nx >= c.width || ny < 0 || ny >= c.height) continue;
          const next = ny * c.width + nx;
          if (!allowed[next] || skinMask[next]) continue;
          skinMask[next] = 1;
          stack.push(next);
        }
      }
    }
  }

  for (let i = 0; i < px.length; i += 4) {
    if (!skinMask[i / 4]) continue;
    const r = px[i], g = px[i + 1], b = px[i + 2];
    // Ratio-preserve shading.
    const nr = (r / REF_SKIN[0]) * tr;
    const ng = (g / REF_SKIN[1]) * tg;
    const nb = (b / REF_SKIN[2]) * tb;
    px[i] = clamp(nr);
    px[i + 1] = clamp(ng);
    px[i + 2] = clamp(nb);
  }
  ctx.putImageData(data, 0, 0);
  return c.toDataURL("image/png");
}

function isCoreSkinPixel(r: number, g: number, b: number, a: number): boolean {
  if (a < 32) return false;
  const sum = r + g + b;
  return r >= g && g >= b && r - b >= 8 && r - b <= 80 && sum >= 380 && sum <= 755;
}

function isNearbySkinPixel(r: number, g: number, b: number, a: number): boolean {
  if (a < 32) return false;
  const sum = r + g + b;
  return r >= 120 && sum >= 300 && sum <= 765 && r >= g - 12 && r >= b - 8 && r - Math.min(g, b) >= 2 && g - b >= -45;
}

function clamp(v: number) {
  return Math.max(0, Math.min(255, Math.round(v)));
}

function useSkinTinted(src: string, skinHex: string): string | null {
  const [out, setOut] = React.useState<string | null>(null);
  React.useEffect(() => {
    let cancelled = false;
    const cacheKey = `${src}|${skinHex}`;
    if (tintCache.has(cacheKey)) {
      setOut(tintCache.get(cacheKey)!);
      return;
    }
    const img = new Image();
    img.onload = () => {
      if (cancelled) return;
      try {
        const url = tintSkin(img, skinHex);
        tintCache.set(cacheKey, url);
        setOut(url);
      } catch {
        setOut(null);
      }
    };
    img.src = src;
    return () => { cancelled = true; };
  }, [src, skinHex]);
  return out;
}

const tintCache = new Map<string, string>();
