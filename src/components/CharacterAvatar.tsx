import React from "react";
import boyImg from "@/assets/character-boy.png";
import girlImg from "@/assets/character-girl.png";

export type Gender = "male" | "female";

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
  const src = g === "female" ? girlImg : boyImg;
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
        alt={g === "female" ? "Character" : "Character"}
        width={size}
        height={size}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
          imageRendering: "pixelated",
        }}
        draggable={false}
      />
      {hasCrown && (
        <span
          aria-hidden
          style={{
            position: "absolute",
            top: "2%",
            left: "50%",
            transform: "translateX(-50%)",
            fontSize: size * 0.32,
            lineHeight: 1,
            filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.35))",
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
const REF_SKIN: [number, number, number] = [245, 213, 197];
const REF_BLUSH: [number, number, number] = [240, 196, 196];

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
  // luminance ratio for blush variant
  for (let i = 0; i < px.length; i += 4) {
    const r = px[i], g = px[i + 1], b = px[i + 2], a = px[i + 3];
    if (a < 8) continue;
    const dSkin = Math.abs(r - REF_SKIN[0]) + Math.abs(g - REF_SKIN[1]) + Math.abs(b - REF_SKIN[2]);
    const dBlush = Math.abs(r - REF_BLUSH[0]) + Math.abs(g - REF_BLUSH[1]) + Math.abs(b - REF_BLUSH[2]);
    if (dSkin <= 45) {
      // tonal preserve: keep brightness offset from REF
      px[i] = clamp(tr + (r - REF_SKIN[0]) * 0.5);
      px[i + 1] = clamp(tg + (g - REF_SKIN[1]) * 0.5);
      px[i + 2] = clamp(tb + (b - REF_SKIN[2]) * 0.5);
    } else if (dBlush <= 40) {
      // pinker variant for cheeks
      px[i] = clamp(tr + 18);
      px[i + 1] = clamp(tg - 8);
      px[i + 2] = clamp(tb - 4);
    }
  }
  ctx.putImageData(data, 0, 0);
  return c.toDataURL("image/png");
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
    img.crossOrigin = "anonymous";
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
