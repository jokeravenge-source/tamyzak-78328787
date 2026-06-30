import physics from "@/assets/themes/physics.png";
import chemistry from "@/assets/themes/chemistry.png";
import biology from "@/assets/themes/biology.png";
import arabic from "@/assets/themes/arabic.png";
import islamic from "@/assets/themes/islamic.png";
import english from "@/assets/themes/english.png";
import french from "@/assets/themes/french.png";
import revision from "@/assets/themes/revision.png";
import type { AppSubject } from "@/pages/Subjects";

export const subjectThemes: Record<AppSubject, { image: string; tint: string }> = {
  physics: { image: physics, tint: "from-indigo-500/15 via-transparent to-cyan-500/10" },
  chemistry: { image: chemistry, tint: "from-emerald-500/15 via-transparent to-amber-500/10" },
  biology: { image: biology, tint: "from-emerald-500/15 via-transparent to-lime-500/10" },
  arabic: { image: arabic, tint: "from-amber-500/15 via-transparent to-orange-500/10" },
  islamic: { image: islamic, tint: "from-emerald-600/15 via-transparent to-amber-500/10" },
  english: { image: english, tint: "from-red-500/10 via-transparent to-blue-500/10" },
  french: { image: french, tint: "from-blue-500/10 via-transparent to-red-500/10" },
  revision: { image: revision, tint: "from-purple-500/15 via-transparent to-fuchsia-500/10" },
};