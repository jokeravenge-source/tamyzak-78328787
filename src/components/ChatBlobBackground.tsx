import { DotLottieReact } from "@lottiefiles/dotlottie-react";

const ChatBlobBackground = () => (
  <div
    aria-hidden
    className="pointer-events-none absolute inset-0 flex items-center justify-center z-0"
  >
    <div className="w-[70%] max-w-[420px] opacity-40 mix-blend-screen">
      <DotLottieReact src="/blob-animation.lottie" loop autoplay />
    </div>
  </div>
);

export default ChatBlobBackground;