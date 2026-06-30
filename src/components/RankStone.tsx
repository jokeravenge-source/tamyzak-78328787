import { motion } from "framer-motion";

export type StoneRank = "coal" | "copper" | "silver" | "gold" | "diamond" | "royal";

export const RANK_LABELS: Record<StoneRank, { en: string; ar: string }> = {
  coal:    { en: "Coal",    ar: "الفحم" },
  copper:  { en: "Copper",  ar: "النحاس" },
  silver:  { en: "Silver",  ar: "الفضة" },
  gold:    { en: "Gold",    ar: "الذهب" },
  diamond: { en: "Diamond", ar: "الألماس" },
  royal:   { en: "Royal",   ar: "الملكي" },
};

/** Six material variants for a single faceted stone shape.
 *  Renders as inline SVG with material-specific gradients/highlights.
 *  Shared facet polygon path so all ranks read as the same object,
 *  re-cut from a different material as the student advances. */
const RankStone = ({
  rank = "coal",
  size = 96,
  fillProgress = 0,
  className = "",
  glow = false,
}: {
  rank?: StoneRank;
  size?: number;
  /** 0–1: streak fill creeping up through the facets (parchment-light overlay) */
  fillProgress?: number;
  className?: string;
  glow?: boolean;
}) => {
  const id = `stone-${rank}`;
  const clamp = Math.max(0, Math.min(1, fillProgress));
  // Stone outline: a faceted polygon (top crown + body + flat base)
  const outline = "50,4 86,22 96,56 78,92 50,100 22,92 4,56 14,22";
  // Inner facets for highlight detail
  const facetA = "50,4 86,22 50,52";
  const facetB = "14,22 50,4 50,52";
  const facetC = "50,52 86,22 96,56 78,92";
  const facetD = "50,52 14,22 4,56 22,92";
  const facetE = "50,52 78,92 50,100 22,92";

  const materials: Record<StoneRank, { a: string; b: string; rim: string; shine: string }> = {
    coal:    { a: "#2a2c34", b: "#0e0f15", rim: "#3a3d48", shine: "#5a5e6d" },
    copper:  { a: "#c98257", b: "#6f3a1f", rim: "#e9a677", shine: "#fbd9b8" },
    silver:  { a: "#dfe4ea", b: "#7c8290", rim: "#f5f7fa", shine: "#ffffff" },
    gold:    { a: "#e8b341", b: "#8a5a14", rim: "#f7d271", shine: "#fff3c4" },
    diamond: { a: "#bfe6f4", b: "#5a96b3", rim: "#ffffff", shine: "#ffffff" },
    royal:   { a: "#e8a33d", b: "#3a1d4a", rim: "#ffd27a", shine: "#fff0c2" },
  };
  const m = materials[rank];

  return (
    <motion.div
      className={`relative inline-block ${className}`}
      style={{ width: size, height: size }}
      initial={{ opacity: 0, y: 6, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
    >
      {glow && (
        <div
          aria-hidden
          className="absolute inset-0 rounded-full blur-2xl"
          style={{ background: `radial-gradient(circle, ${m.rim}55, transparent 65%)` }}
        />
      )}
      <svg
        viewBox="0 0 100 104"
        width={size}
        height={size}
        className="relative drop-shadow-[0_8px_24px_rgba(0,0,0,0.5)]"
        role="img"
        aria-label={`${rank} rank stone`}
      >
        <defs>
          <linearGradient id={`${id}-body`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={m.a} />
            <stop offset="100%" stopColor={m.b} />
          </linearGradient>
          <linearGradient id={`${id}-shine`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={m.shine} stopOpacity="0.9" />
            <stop offset="100%" stopColor={m.shine} stopOpacity="0" />
          </linearGradient>
          <clipPath id={`${id}-clip`}>
            <polygon points={outline} />
          </clipPath>
        </defs>

        {/* Body */}
        <polygon points={outline} fill={`url(#${id}-body)`} />

        {/* Facet edges (darken bottom, lighten top) */}
        <polygon points={facetA} fill={m.shine} opacity="0.35" />
        <polygon points={facetB} fill={m.shine} opacity="0.18" />
        <polygon points={facetC} fill="#000" opacity="0.16" />
        <polygon points={facetD} fill="#000" opacity="0.26" />
        <polygon points={facetE} fill="#000" opacity="0.38" />

        {/* Streak fill — ember light creeping up */}
        {clamp > 0 && (
          <g clipPath={`url(#${id}-clip)`}>
            <rect
              x="0"
              y={104 - 104 * clamp}
              width="100"
              height={104 * clamp}
              fill="hsl(35 92% 60%)"
              opacity="0.32"
            />
          </g>
        )}

        {/* Specular highlight */}
        <polygon points="50,4 70,16 50,30 36,16" fill={`url(#${id}-shine)`} />

        {/* Royal inner glow pulse */}
        {rank === "royal" && (
          <circle cx="50" cy="56" r="14" fill="hsl(35 92% 68%)" opacity="0.6">
            <animate attributeName="opacity" values="0.35;0.7;0.35" dur="2.6s" repeatCount="indefinite" />
          </circle>
        )}

        {/* Diamond refraction sparkle */}
        {rank === "diamond" && (
          <>
            <line x1="50" y1="34" x2="50" y2="78" stroke="#fff" strokeWidth="0.6" opacity="0.7" />
            <line x1="30" y1="50" x2="70" y2="62" stroke="#fff" strokeWidth="0.4" opacity="0.5" />
          </>
        )}

        {/* Rim light */}
        <polygon points={outline} fill="none" stroke={m.rim} strokeWidth="1" opacity="0.55" />
      </svg>
    </motion.div>
  );
};

/** Pick a rank from a total points number — keep in sync with product rank thresholds. */
export function rankFromPoints(points: number): StoneRank {
  if (points >= 5000) return "royal";
  if (points >= 2000) return "diamond";
  if (points >= 800)  return "gold";
  if (points >= 300)  return "silver";
  if (points >= 80)   return "copper";
  return "coal";
}

export default RankStone;