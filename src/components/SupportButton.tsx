import { MessageCircle } from "lucide-react";

const SupportButton = () => (
  <a
    href="https://t.me/ias404"
    target="_blank"
    rel="noopener noreferrer"
    aria-label="Contact support on Telegram"
    className="fixed bottom-6 right-6 z-[60] inline-flex items-center gap-2 h-12 px-4 rounded-full border border-primary/40 bg-primary text-primary-foreground shadow-[var(--shadow-glow)] hover:scale-105 transition-transform duration-300"
  >
    <MessageCircle className="w-5 h-5" />
    <span className="text-sm font-medium hidden sm:inline">Support</span>
  </a>
);

export default SupportButton;