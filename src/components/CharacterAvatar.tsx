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

export const SKIN_COLORS = ["#f4d3b3", "#e6b48a", "#c98e62", "#8d5a3b", "#5b3922"] as const;
export const HAIR_COLORS = ["#1a1a1a", "#3b2412", "#6b3a1a", "#b8742a", "#d9a441", "#7a3b9a", "#e85d3a"] as const;
export const SHIRT_COLORS = ["#4f46e5", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#ec4899", "#6366f1", "#14b8a6", "#a855f7"] as const;

export const MALE_HAIRSTYLES = ["short", "buzz", "spiky", "curly", "fade", "messy"] as const;
export const FEMALE_HAIRSTYLES = ["long", "bun", "ponytail", "bob", "curly_long", "braids"] as const;

// Premium-only cosmetics — gated in the UI via the user's subscription
export const PREMIUM_SKIN_COLORS = ["#ffd9b3", "#d4b896", "#a87d52"] as const;
export const PREMIUM_HAIR_COLORS = ["#06b6d4", "#ec4899", "#22d3ee", "#f0abfc"] as const;
export const PREMIUM_SHIRT_COLORS = ["#fbbf24", "#06b6d4", "#a78bfa", "#f0abfc", "#22d3ee"] as const;

export type CharacterTraits = {
  skin: string;
  hairColor: string;
  shirt: string;
  hair: string;
  accessory: "glasses" | "crown" | null;
  blush: boolean;
};

function pick<T>(arr: readonly T[], r: number): T {
  return arr[Math.floor(r * arr.length) % arr.length];
}

export function getAvatarStyle(seed: string, gender: Gender): CharacterTraits {
  const rand = mulberry32(hashStr(seed + ":" + gender));
  return {
    skin: pick(SKIN_COLORS, rand()),
    hairColor: pick(HAIR_COLORS, rand()),
    shirt: pick(SHIRT_COLORS, rand()),
    hair: gender === "male" ? pick(MALE_HAIRSTYLES, rand()) : pick(FEMALE_HAIRSTYLES, rand()),
    accessory: rand() > 0.75 ? "glasses" : null,
    blush: gender === "female" || rand() > 0.7,
  };
}

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
      {/* shirt / shoulders */}
      <path d="M15 100 Q15 75 35 70 L65 70 Q85 75 85 100 Z" fill={s.shirt} />
      <path d="M40 70 Q50 78 60 70 L60 74 Q50 82 40 74 Z" fill="#ffffff" opacity="0.25" />
      {/* neck */}
      <rect x="44" y="60" width="12" height="14" rx="3" fill={s.skin} />
      {/* head */}
      <ellipse cx="50" cy="48" rx="20" ry="22" fill={s.skin} />
      {/* ears */}
      <ellipse cx="29" cy="50" rx="3" ry="5" fill={s.skin} />
      <ellipse cx="71" cy="50" rx="3" ry="5" fill={s.skin} />
      {/* hair */}
      <Hair style={s.hair} color={s.hairColor} />
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
      {/* mouth */}
      <path d="M45 60 Q50 64 55 60" stroke="#1a1a1a" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      {/* glasses */}
      {s.accessory === "glasses" && (
        <g stroke="#1a1a1a" strokeWidth="1.5" fill="none">
          <circle cx="42" cy="50" r="5" />
          <circle cx="58" cy="50" r="5" />
          <line x1="47" y1="50" x2="53" y2="50" />
        </g>
      )}
      {/* premium crown */}
      {s.accessory === "crown" && (
        <g>
          <path
            d="M 32 28 L 38 18 L 44 26 L 50 14 L 56 26 L 62 18 L 68 28 L 68 32 L 32 32 Z"
            fill="#fbbf24"
            stroke="#b45309"
            strokeWidth="1"
            strokeLinejoin="round"
          />
          <circle cx="38" cy="20" r="1.5" fill="#ef4444" />
          <circle cx="50" cy="16" r="1.8" fill="#06b6d4" />
          <circle cx="62" cy="20" r="1.5" fill="#a855f7" />
          <rect x="32" y="30" width="36" height="2" fill="#b45309" />
        </g>
      )}
    </svg>
  );
}

export default CharacterAvatar;