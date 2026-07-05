import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import tamayzakLogo from "@/assets/tamayzak-logo.png.asset.json";

const CREAM = "#F7F4EC";
const NAVY = "#183A72";
const NAVY_SOFT = "#3A5B96";
const BLUE_SOFT = "#B9C7DE";

const Star = ({ x, y, size = 6, delay = 0 }: { x: string; y: string; size?: number; delay?: number }) => (
  <motion.svg
    style={{ position: "absolute", left: x, top: y }}
    width={size}
    height={size}
    viewBox="0 0 12 12"
    initial={{ opacity: 0.3, scale: 0.8 }}
    animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.1, 0.8] }}
    transition={{ duration: 2.4, repeat: Infinity, delay, ease: "easeInOut" }}
  >
    <path d="M6 0 L7.2 4.8 L12 6 L7.2 7.2 L6 12 L4.8 7.2 L0 6 L4.8 4.8 Z" fill={NAVY} />
  </motion.svg>
);

const DoorwayIllustration = () => {
  const MID_NAVY = "#254B8A";
  const LIGHT = "#7A9AC8";
  return (
    <motion.div
      initial={{ y: 24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      className="relative w-full max-w-[380px] mx-auto aspect-[5/4]"
    >
      <svg viewBox="0 0 400 320" className="w-full h-full" fill="none">
        {/* Crescent moon (upper-right of doorway) */}
        <path d="M262 90 A16 16 0 1 1 246 74 A12 12 0 1 0 262 90 Z" fill={NAVY} />

        {/* Radial glow behind doorway */}
        <motion.circle
          cx="200" cy="160" r="70"
          fill={LIGHT}
          initial={{ opacity: 0.25 }}
          animate={{ opacity: [0.2, 0.45, 0.2] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.circle
          cx="200" cy="160" r="45"
          fill={BLUE_SOFT}
          initial={{ opacity: 0.35 }}
          animate={{ opacity: [0.35, 0.6, 0.35] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
        />

        {/* Doorway arch — navy outline, inner glow */}
        <path d="M170 230 L170 160 A30 30 0 0 1 230 160 L230 230 Z" fill={NAVY} />
        <path d="M180 228 L180 162 A20 20 0 0 1 220 162 L220 228 Z" fill={BLUE_SOFT} />
        <path d="M190 226 L190 164 A10 10 0 0 1 210 164 L210 226 Z" fill={CREAM} />

        {/* Ground band — big navy strip */}
        <rect x="0" y="228" width="400" height="60" fill={NAVY} />

        {/* Floating rounded bars — light blue stripes on top of band */}
        <rect x="14" y="240" width="70" height="10" rx="5" fill={LIGHT} />
        <rect x="100" y="240" width="40" height="10" rx="5" fill={LIGHT} opacity="0.7" />
        <rect x="260" y="240" width="55" height="10" rx="5" fill={LIGHT} />
        <rect x="330" y="240" width="45" height="10" rx="5" fill={LIGHT} opacity="0.7" />
        <rect x="30" y="258" width="120" height="10" rx="5" fill={MID_NAVY} />
        <rect x="170" y="258" width="60" height="10" rx="5" fill={MID_NAVY} opacity="0.8" />
        <rect x="250" y="258" width="130" height="10" rx="5" fill={MID_NAVY} />
        <rect x="60" y="276" width="90" height="10" rx="5" fill={LIGHT} opacity="0.6" />
        <rect x="230" y="276" width="110" height="10" rx="5" fill={LIGHT} opacity="0.6" />

        {/* Curved white path from bottom-center up to doorway */}
        <path
          d="M200 315 Q214 285 196 260 Q182 240 200 228"
          stroke={CREAM}
          strokeWidth="14"
          strokeLinecap="round"
          fill="none"
        />
      </svg>

      {/* Twinkling stars */}
      <Star x="12%" y="10%" size={8} delay={0} />
      <Star x="86%" y="14%" size={6} delay={0.4} />
      <Star x="22%" y="30%" size={5} delay={0.8} />
      <Star x="80%" y="42%" size={5} delay={1.2} />
      <Star x="48%" y="6%" size={5} delay={1.6} />
      <Star x="8%" y="48%" size={5} delay={0.6} />
    </motion.div>
  );
};

const Welcome = () => {
  const navigate = useNavigate();

  return (
    <main
      dir="rtl"
      className="min-h-[100dvh] w-full flex flex-col items-center px-6 pt-[max(env(safe-area-inset-top),24px)] pb-[max(env(safe-area-inset-bottom),24px)]"
      style={{ backgroundColor: CREAM, color: NAVY, fontFamily: "'Tajawal','Cairo',system-ui,sans-serif" }}
    >
      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="mt-2 mb-2 flex flex-col items-center"
      >
        <img
          src={tamayzakLogo.url}
          alt="Tamayzak"
          className="w-32 h-32 object-contain select-none"
          draggable={false}
        />
      </motion.div>

      {/* Content */}
      <motion.div
        initial={{ opacity: 0, x: 24 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="w-full flex flex-col items-center"
      >
        <DoorwayIllustration />
        <h1
          className="mt-8 text-center text-[32px] leading-[1.15] font-extrabold"
          style={{ color: NAVY }}
        >
          تميّزك يبدأ من هنا
        </h1>
        <p
          className="mt-4 text-center text-[15px] leading-relaxed max-w-[320px]"
          style={{ color: NAVY_SOFT }}
        >
          اجعل الذكاء الاصطناعي شريكك في الدراسة، التصحيح، والتعلّم بطريقة أذكى.
        </p>
      </motion.div>

      {/* Spacer */}
      <div className="flex-1 min-h-6" />

      {/* Button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.35, ease: "easeOut" }}
        className="w-full max-w-[360px]"
      >
        <button
          onClick={() => navigate("/")}
          className="w-full h-14 rounded-[24px] text-[17px] font-semibold active:scale-[0.98] transition-transform"
          style={{ backgroundColor: NAVY, color: CREAM }}
        >
          ابدأ الآن
        </button>
      </motion.div>
    </main>
  );
};

export default Welcome;
