import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import Chapters from "./pages/Chapters.tsx";
import NotFound from "./pages/NotFound.tsx";
import { useState } from "react";
import { TelegramGate, TELEGRAM_GATE_STORAGE_KEY } from "./components/TelegramGate";
import { AppLanguage, LanguageGate, LANGUAGE_STORAGE_KEY } from "./components/LanguageGate";

const queryClient = new QueryClient();

const App = () => {
  const [unlocked, setUnlocked] = useState(
    () => typeof window !== "undefined" && localStorage.getItem(TELEGRAM_GATE_STORAGE_KEY) === "1"
  );
  const [language, setLanguage] = useState<AppLanguage | null>(
    () => (typeof window !== "undefined" ? (localStorage.getItem(LANGUAGE_STORAGE_KEY) as AppLanguage | null) : null)
  );

  return (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      {!unlocked ? (
        <TelegramGate onUnlock={() => setUnlocked(true)} />
      ) : !language ? (
        <LanguageGate onSelect={setLanguage} />
      ) : (
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Chapters language={language} onChangeLanguage={() => setLanguage(null)} />} />
          <Route path="/flashcards" element={<Index language={language} />} />
          <Route path="/flashcards/:chapter" element={<Index language={language} />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
      )}
    </TooltipProvider>
  </QueryClientProvider>
  );
};

export default App;
