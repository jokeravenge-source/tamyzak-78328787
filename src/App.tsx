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
import Subjects, { SUBJECT_STORAGE_KEY, type AppSubject } from "./pages/Subjects";
import { ThemePicker, applyTheme, getInitialTheme } from "./components/ThemePicker";
import { useEffect } from "react";
import Auth from "./pages/Auth";
import { supabase } from "./integrations/supabase/client";
import MainMenu from "./pages/MainMenu";

const MENU_STORAGE_KEY = "app_menu_choice_v1";

const queryClient = new QueryClient();

const App = () => {
  useEffect(() => {
    applyTheme(getInitialTheme());
  }, []);
  const [unlocked, setUnlocked] = useState(
    () => typeof window !== "undefined" && localStorage.getItem(TELEGRAM_GATE_STORAGE_KEY) === "1"
  );
  const [authed, setAuthed] = useState(false);
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setAuthed(!!session);
    });
    supabase.auth.getSession().then(({ data }) => setAuthed(!!data.session));
    return () => sub.subscription.unsubscribe();
  }, []);
  const [language, setLanguage] = useState<AppLanguage | null>(
    () => (typeof window !== "undefined" ? (localStorage.getItem(LANGUAGE_STORAGE_KEY) as AppLanguage | null) : null)
  );
  const [subject, setSubject] = useState<AppSubject | null>(
    () => (typeof window !== "undefined" ? (localStorage.getItem(SUBJECT_STORAGE_KEY) as AppSubject | null) : null)
  );
  const [menuChoice, setMenuChoice] = useState<"flashcards" | null>(
    () => (typeof window !== "undefined" ? (localStorage.getItem(MENU_STORAGE_KEY) as "flashcards" | null) : null)
  );

  const resetLanguage = () => {
    setSubject(null);
    setMenuChoice(null);
    localStorage.removeItem(MENU_STORAGE_KEY);
    setLanguage(null);
  };
  const resetSubject = () => setSubject(null);
  const resetMenu = () => {
    setSubject(null);
    setMenuChoice(null);
    localStorage.removeItem(MENU_STORAGE_KEY);
  };
  const chooseMenu = (choice: "flashcards") => {
    localStorage.setItem(MENU_STORAGE_KEY, choice);
    setMenuChoice(choice);
  };

  return (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <ThemePicker language={language ?? "en"} />
      {!unlocked ? (
        <TelegramGate onUnlock={() => setUnlocked(true)} />
      ) : !authed ? (
        <Auth onAuthed={() => setAuthed(true)} />
      ) : !language ? (
        <LanguageGate onSelect={setLanguage} />
      ) : !menuChoice ? (
        <MainMenu language={language} onChangeLanguage={resetLanguage} onSelect={chooseMenu} />
      ) : !subject ? (
        <Subjects language={language} onChangeLanguage={resetMenu} onSelectSubject={setSubject} />
      ) : (
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Chapters language={language} subject={subject} onChangeLanguage={resetSubject} />} />
          <Route path="/flashcards" element={<Index language={language} subject={subject} />} />
          <Route path="/flashcards/:chapter" element={<Index language={language} subject={subject} />} />
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
