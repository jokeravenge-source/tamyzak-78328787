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
  switch (style) {
    case "buzz":
      return <path d="M30 42 Q50 22 70 42 L70 50 L30 50 Z" fill={color} opacity="0.85" />;
    case "spiky":
      return (
        <path
          d="M28 48 L32 30 L38 44 L42 26 L48 42 L52 24 L58 42 L62 28 L68 44 L72 32 L72 50 L28 50 Z"
          fill={color}
        />
      );
    case "curly":
      return (
        <g fill={color}>
          <circle cx="35" cy="38" r="8" />
          <circle cx="45" cy="32" r="9" />
          <circle cx="55" cy="32" r="9" />
          <circle cx="65" cy="38" r="8" />
          <rect x="28" y="40" width="44" height="12" />
        </g>
      );
    case "fade":
      return <path d="M32 46 Q50 28 68 46 L68 52 L32 52 Z" fill={color} />;
    case "messy":
      return (
        <path
          d="M28 50 Q30 30 40 32 Q42 24 52 30 Q60 22 66 34 Q74 32 72 50 Z"
          fill={color}
        />
      );
    case "short":
      return <path d="M28 48 Q50 24 72 48 L72 52 L28 52 Z" fill={color} />;
    case "long":
      return (
        <g fill={color}>
          <path d="M26 50 Q26 28 50 26 Q74 28 74 50 L74 85 L66 85 L66 55 L34 55 L34 85 L26 85 Z" />
        </g>
      );
    case "bun":
      return (
        <g fill={color}>
          <circle cx="50" cy="22" r="10" />
          <path d="M28 48 Q50 26 72 48 L72 54 L28 54 Z" />
        </g>
      );
    case "ponytail":
      return (
        <g fill={color}>
          <path d="M28 50 Q30 26 50 26 Q70 26 72 50 L72 54 L28 54 Z" />
          <path d="M68 46 Q82 60 76 80 L70 78 Q74 62 64 52 Z" />
        </g>
      );
    case "bob":
      return <path d="M26 58 Q26 28 50 26 Q74 28 74 58 L70 60 L66 52 L34 52 L30 60 Z" fill={color} />;
    case "curly_long":
      return (
        <g fill={color}>
          <circle cx="32" cy="40" r="9" />
          <circle cx="44" cy="30" r="10" />
          <circle cx="56" cy="30" r="10" />
          <circle cx="68" cy="40" r="9" />
          <path d="M26 44 L26 78 L34 78 L34 56 L66 56 L66 78 L74 78 L74 44 Z" />
        </g>
      );
    case "braids":
      return (
        <g fill={color}>
          <path d="M28 50 Q30 26 50 26 Q70 26 72 50 L72 54 L28 54 Z" />
          <rect x="22" y="50" width="8" height="36" rx="4" />
          <rect x="70" y="50" width="8" height="36" rx="4" />
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