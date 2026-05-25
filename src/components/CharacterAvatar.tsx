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

const SKIN = ["#f4d3b3", "#e6b48a", "#c98e62", "#8d5a3b", "#5b3922"];
const HAIR_COLORS = ["#1a1a1a", "#3b2412", "#6b3a1a", "#b8742a", "#d9a441", "#7a3b9a", "#e85d3a"];
const SHIRT_COLORS = ["#4f46e5", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#ec4899", "#6366f1", "#14b8a6", "#a855f7"];

const MALE_HAIRSTYLES = ["short", "buzz", "spiky", "curly", "fade", "messy"] as const;
const FEMALE_HAIRSTYLES = ["long", "bun", "ponytail", "bob", "curly_long", "braids"] as const;

function pick<T>(arr: readonly T[], r: number): T {
  return arr[Math.floor(r * arr.length) % arr.length];
}

export function getAvatarStyle(seed: string, gender: Gender) {
  const rand = mulberry32(hashStr(seed + ":" + gender));
  return {
    skin: pick(SKIN, rand()),
    hairColor: pick(HAIR_COLORS, rand()),
    shirt: pick(SHIRT_COLORS, rand()),
    hair: gender === "male" ? pick(MALE_HAIRSTYLES, rand()) : pick(FEMALE_HAIRSTYLES, rand()),
    accessory: rand() > 0.75 ? "glasses" : null,
    blush: gender === "female" || rand() > 0.7,
  };
}

function Hair({ style, color }: { style: string; color: string }) {
  // Base cap that fully covers the top of the head (head: cx=50, cy=48, rx=20, ry=22).
  // Solid filled crown from (28,50) over (50,22) to (72,50).
  const baseCap = "M 28 50 Q 28 22 50 22 Q 72 22 72 50 Z";
  switch (style) {
    case "buzz":
      return <path d={baseCap} fill={color} opacity="0.9" />;
    case "spiky":
      return (
        <g fill={color}>
          <path d={baseCap} />
          <path d="M30 28 L34 14 L38 26 L42 12 L46 24 L50 10 L54 24 L58 12 L62 26 L66 14 L70 28 Z" />
        </g>
      );
    case "curly":
      return (
        <g fill={color}>
          <path d={baseCap} />
          <circle cx="32" cy="28" r="6" />
          <circle cx="42" cy="22" r="7" />
          <circle cx="52" cy="20" r="7" />
          <circle cx="62" cy="22" r="7" />
          <circle cx="70" cy="28" r="6" />
        </g>
      );
    case "fade":
      return <path d="M 30 50 Q 30 26 50 26 Q 70 26 70 50 Z" fill={color} />;
    case "messy":
      return (
        <g fill={color}>
          <path d={baseCap} />
          <path d="M30 28 Q34 18 40 24 Q44 14 50 22 Q56 12 62 24 Q68 18 72 28 L72 34 L28 34 Z" />
        </g>
      );
    case "short":
      return <path d={baseCap} fill={color} />;
    case "long":
      return (
        <g fill={color}>
          <path d="M26 50 Q26 22 50 22 Q74 22 74 50 L74 88 L66 88 L66 56 L34 56 L34 88 L26 88 Z" />
        </g>
      );
    case "bun":
      return (
        <g fill={color}>
          <circle cx="50" cy="16" r="9" />
          <path d={baseCap} />
        </g>
      );
    case "ponytail":
      return (
        <g fill={color}>
          <path d={baseCap} />
          <path d="M70 44 Q84 58 78 80 L70 78 Q76 60 64 50 Z" />
        </g>
      );
    case "bob":
      return <path d="M26 60 Q26 22 50 22 Q74 22 74 60 L70 62 L66 54 L34 54 L30 62 Z" fill={color} />;
    case "curly_long":
      return (
        <g fill={color}>
          <path d="M26 50 Q26 22 50 22 Q74 22 74 50 L74 78 L66 78 L66 58 L34 58 L34 78 L26 78 Z" />
          <circle cx="30" cy="28" r="7" />
          <circle cx="42" cy="22" r="8" />
          <circle cx="54" cy="22" r="8" />
          <circle cx="66" cy="28" r="7" />
        </g>
      );
    case "braids":
      return (
        <g fill={color}>
          <path d={baseCap} />
          <rect x="22" y="48" width="8" height="38" rx="4" />
          <rect x="70" y="48" width="8" height="38" rx="4" />
        </g>
      );
    default:
      return null;
  }
}

export function CharacterAvatar({
  seed,
  gender,
  size = 96,
  className = "",
}: {
  seed: string;
  gender: Gender | null | undefined;
  size?: number;
  className?: string;
}) {
  const g: Gender = gender ?? "male";
  const s = getAvatarStyle(seed || "anon", g);

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
    </svg>
  );
}

export default CharacterAvatar;