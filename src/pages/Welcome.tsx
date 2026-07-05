import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

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

const HeroIllustration = () => (
  <motion.div
    initial={{ y: 24, opacity: 0 }}
    animate={{ y: 0, opacity: 1 }}
    transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
    className="relative w-full max-w-[360px] mx-auto aspect-[4/3]"
  >
    <svg viewBox="0 0 400 300" className="w-full h-full" fill="none">
      {/* Crescent moon */}
      <path d="M330 55 A22 22 0 1 1 308 33 A17 17 0 1 0 330 55 Z" fill={NAVY} />

      {/* Rounded landscape hills */}
      <path d="M0 220 Q60 190 120 210 T240 205 T400 215 L400 300 L0 300 Z" fill={NAVY} />
      <rect x="20" y="235" width="70" height="10" rx="5" fill={BLUE_SOFT} opacity="0.55" />
      <rect x="110" y="248" width="120" height="10" rx="5" fill={BLUE_SOFT} opacity="0.4" />
      <rect x="260" y="238" width="90" height="10" rx="5" fill={BLUE_SOFT} opacity="0.55" />
      <rect x="40" y="262" width="140" height="8" rx="4" fill={CREAM} opacity="0.35" />
      <rect x="220" y="268" width="150" height="8" rx="4" fill={CREAM} opacity="0.35" />

      {/* Curved path */}
      <path
        d="M200 295 Q210 260 195 235 Q180 210 200 190"
        stroke={CREAM}
        strokeWidth="10"
        strokeLinecap="round"
        fill="none"
      />

      {/* Doorway glow */}
      <motion.ellipse
        cx="200"
        cy="175"
        rx="55"
        ry="18"
        fill={BLUE_SOFT}
        initial={{ opacity: 0.3 }}
        animate={{ opacity: [0.25, 0.55, 0.25] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Doorway arch */}
      <path
        d="M175 195 L175 145 A25 25 0 0 1 225 145 L225 195 Z"
        fill={NAVY}
      />
      <path
        d="M183 192 L183 148 A17 17 0 0 1 217 148 L217 192 Z"
        fill={BLUE_SOFT}
      />
      <path
        d="M191 190 L191 150 A9 9 0 0 1 209 150 L209 190 Z"
        fill={CREAM}
      />
    </svg>

    {/* Twinkling stars overlay */}
    <Star x="12%" y="18%" size={8} delay={0} />
    <Star x="82%" y="28%" size={6} delay={0.4} />
    <Star x="22%" y="42%" size={5} delay={0.8} />
    <Star x="72%" y="12%" size={7} delay={1.2} />
    <Star x="48%" y="8%" size={5} delay={1.6} />
  </motion.div>
);

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
        className="mt-2 mb-6 flex flex-col items-center"
      >
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center"
          style={{ backgroundColor: NAVY }}
        >
          <svg viewBox="0 0 32 32" className="w-8 h-8" fill="none">
            <path d="M8 8 h16 M16 8 v16" stroke={CREAM} strokeWidth="3" strokeLinecap="round" />
            <path d="M22 20 A6 6 0 1 1 28 14" stroke={CREAM} strokeWidth="2.5" strokeLinecap="round" fill="none" />
          </svg>
        </div>
        <span className="mt-2 text-sm tracking-wide" style={{ color: NAVY }}>Tamayzak</span>
      </motion.div>

      {/* Hero */}
      <HeroIllustration />

      {/* Title */}
      <motion.h1
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.15, ease: "easeOut" }}
        className="mt-8 text-center text-[34px] leading-[1.15] font-extrabold"
        style={{ color: NAVY }}
      >
        تميّزك يبدأ من هنا
      </motion.h1>

      {/* Subtitle */}
      <motion.p
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.25, ease: "easeOut" }}
        className="mt-4 text-center text-[15px] leading-relaxed max-w-[320px]"
        style={{ color: NAVY_SOFT }}
      >
        اجعل الذكاء الاصطناعي شريكك في الدراسة، التصحيح، والتعلّم بطريقة أذكى.
      </motion.p>

      {/* Spacer */}
      <div className="flex-1 min-h-6" />

      {/* Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.35, ease: "easeOut" }}
        className="w-full max-w-[360px] space-y-3"
      >
        <button
          onClick={() => navigate("/")}
          className="w-full h-14 rounded-[24px] text-[17px] font-semibold active:scale-[0.98] transition-transform"
          style={{ backgroundColor: NAVY, color: CREAM }}
        >
          ابدأ الآن
        </button>
        <button
          onClick={() => navigate("/")}
          className="w-full h-14 rounded-[24px] text-[17px] font-semibold active:scale-[0.98] transition-transform border-2"
          style={{ borderColor: NAVY, color: NAVY, backgroundColor: "transparent" }}
        >
          لدي حساب
        </button>
      </motion.div>

      {/* Pagination */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.5 }}
        className="mt-6 flex items-center gap-2"
      >
        <span className="h-2 w-6 rounded-full" style={{ backgroundColor: NAVY }} />
        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: BLUE_SOFT }} />
        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: BLUE_SOFT }} />
      </motion.div>
    </main>
  );
};

export default Welcome;