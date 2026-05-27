import React from "react";
import boyImg from "@/assets/character-boy.png";
import girlImg from "@/assets/character-girl.png";

export type Gender = "male" | "female";

// Kept for API compatibility with AccountCenter / Leaderboard.
export const SKIN_COLORS = ["#fde7d3", "#f4cfa8", "#d9a679", "#a8714a", "#6b4226"] as const;
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
        src={src}
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
