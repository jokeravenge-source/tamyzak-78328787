import { Crown } from "lucide-react";
import { motion } from "framer-motion";

export function PremiumBadge({ size = "md", label = "PREMIUM" }: { size?: "sm" | "md" | "lg"; label?: string }) {
  const sizing = size === "sm"
    ? "text-[9px] px-1.5 py-0.5 gap-1"
    : size === "lg"
    ? "text-sm px-3 py-1.5 gap-1.5"
    : "text-[10px] px-2 py-0.5 gap-1";
  const icon = size === "sm" ? "w-2.5 h-2.5" : size === "lg" ? "w-4 h-4" : "w-3 h-3";

  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`relative inline-flex items-center rounded-full font-bold uppercase tracking-wider text-white overflow-hidden ${sizing}`}
      style={{
        background: "linear-gradient(110deg, #f59e0b 0%, #fbbf24 25%, #fde68a 50%, #fbbf24 75%, #f59e0b 100%)",
        backgroundSize: "200% 100%",
        boxShadow: "0 2px 12px rgba(251, 191, 36, 0.45), inset 0 1px 0 rgba(255,255,255,0.4)",
      }}
    >
      <motion.span
        aria-hidden
        className="absolute inset-0"
        style={{
          background: "linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.6) 50%, transparent 70%)",
        }}
        animate={{ x: ["-100%", "200%"] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "linear" }}
      />
      <Crown className={`relative ${icon}`} strokeWidth={2.5} />
      <span className="relative">{label}</span>
    </motion.span>
  );
}