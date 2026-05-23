import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import Chapters from "./pages/Chapters.tsx";
import NotFound from "./pages/NotFound.tsx";
import { useState } from "react";

import { AppLanguage, LanguageGate, LANGUAGE_STORAGE_KEY } from "./components/LanguageGate";
import Subjects, { SUBJECT_STORAGE_KEY, type AppSubject } from "./pages/Subjects";
import { ThemePicker, applyTheme, getInitialTheme } from "./components/ThemePicker";
import { useEffect } from "react";
import Auth from "./pages/Auth";
import { supabase } from "./integrations/supabase/client";
import MainMenu from "./pages/MainMenu";
import Missions from "./pages/Missions";
import MCQ from "./pages/MCQ";
import Summaries from "./pages/Summaries";
import Advices from "./pages/Advices";
import Sessions from "./pages/Sessions";
import AdminDashboard from "./pages/AdminDashboard";
import AdminLogin from "./pages/AdminLogin";
import RoleGate, { ROLE_GATE_STORAGE_KEY, type AuthRole } from "./components/RoleGate";
import SupportButton from "./components/SupportButton";
import AccountCenter from "./pages/AccountCenter";
import Essay from "./pages/Essay";
import VideoNotes from "./pages/VideoNotes";
import ZombieGuard from "./components/ZombieGuard";
import EnglishCategoryPage, { ENGLISH_CATEGORY_STORAGE_KEY, type EnglishCategory } from "./pages/EnglishCategory";
import Basics, { type BasicsChoice } from "./pages/Basics";
import BiologyDrawings from "./pages/BiologyDrawings";
import More from "./pages/More";

const MENU_STORAGE_KEY = "app_menu_choice_v1";

const queryClient = new QueryClient();

const App = () => {
  useEffect(() => {
    applyTheme(getInitialTheme());
  }, []);
  const [authed, setAuthed] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authRole, setAuthRole] = useState<AuthRole | null>(
    () => (typeof window !== "undefined" ? (localStorage.getItem(ROLE_GATE_STORAGE_KEY) as AuthRole | null) : null)
  );
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setAuthed(!!session);
      if (session?.user) {
        supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", session.user.id)
          .eq("role", "admin")
          .maybeSingle()
          .then(({ data }) => setIsAdmin(!!data));
      } else {
        setIsAdmin(false);
      }
    });
    supabase.auth.getSession().then(({ data }) => {
      setAuthed(!!data.session);
      if (data.session?.user) {
        supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", data.session.user.id)
          .eq("role", "admin")
          .maybeSingle()
          .then(({ data: r }) => setIsAdmin(!!r));
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);
  const [language, setLanguage] = useState<AppLanguage | null>(
    () => (typeof window !== "undefined" ? (localStorage.getItem(LANGUAGE_STORAGE_KEY) as AppLanguage | null) : null)
  );
  const [subject, setSubject] = useState<AppSubject | null>(
    () => (typeof window !== "undefined" ? (localStorage.getItem(SUBJECT_STORAGE_KEY) as AppSubject | null) : null)
  );
  const [englishCategory, setEnglishCategory] = useState<EnglishCategory | null>(
    () => (typeof window !== "undefined" ? (localStorage.getItem(ENGLISH_CATEGORY_STORAGE_KEY) as EnglishCategory | null) : null)
  );
  type MenuChoice = "flashcards" | "missions" | "mcq" | "malazam" | "summaries" | "advices" | "sessions" | "account" | "essay" | "videoNotes" | "basics" | "biologyDrawings" | "more";
  const [menuChoice, setMenuChoice] = useState<MenuChoice | null>(
    () => (typeof window !== "undefined" ? (localStorage.getItem(MENU_STORAGE_KEY) as MenuChoice | null) : null)
  );

  const resetLanguage = () => {
    setSubject(null);
    setMenuChoice(null);
    localStorage.removeItem(MENU_STORAGE_KEY);
    setLanguage(null);
  };
  const resetSubject = () => {
    setSubject(null);
    localStorage.removeItem(ENGLISH_CATEGORY_STORAGE_KEY);
    setEnglishCategory(null);
  };
  const resetMenu = () => {
    setSubject(null);
    setMenuChoice(null);
    localStorage.removeItem(ENGLISH_CATEGORY_STORAGE_KEY);
    setEnglishCategory(null);
    localStorage.removeItem(MENU_STORAGE_KEY);
  };
  const chooseMenu = (choice: MenuChoice) => {
    localStorage.setItem(MENU_STORAGE_KEY, choice);
    setMenuChoice(choice);
  };
  const handleBasicsSelect = (c: BasicsChoice) => {
    if (c === "biologyDrawings") {
      chooseMenu("biologyDrawings");
    } else {
      chooseMenu(c as MenuChoice);
    }
  };
  const backToBasics = () => chooseMenu("basics");
  const resetRole = () => {
    localStorage.removeItem(ROLE_GATE_STORAGE_KEY);
    setAuthRole(null);
  };
  const chooseRole = (r: AuthRole) => {
    localStorage.setItem(ROLE_GATE_STORAGE_KEY, r);
    setAuthRole(r);
  };
  const adminLogout = async () => {
    await supabase.auth.signOut();
    setIsAdmin(false);
    setAuthed(false);
    resetRole();
  };

  return (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <ThemePicker language={language ?? "en"} />
      <SupportButton />
      <ZombieGuard />
      {!authRole ? (
        <RoleGate onSelect={chooseRole} />
      ) : authRole === "admin" && !authed ? (
        <AdminLogin onAuthed={() => setAuthed(true)} onBack={resetRole} />
      ) : authRole === "admin" && authed && isAdmin ? (
        <AdminDashboard onLogout={adminLogout} />
      ) : !authed ? (
        <Auth onAuthed={() => setAuthed(true)} onGoAdmin={() => chooseRole("admin")} />
      ) : !language ? (
        <LanguageGate onSelect={setLanguage} />
      ) : !menuChoice || menuChoice === "basics" ? (
        <Basics
          language={language}
          onChangeLanguage={resetLanguage}
          onSelect={handleBasicsSelect}
          onNav={chooseMenu}
        />
      ) : menuChoice === "missions" ? (
        <Missions language={language} onBack={resetMenu} />
      ) : menuChoice === "mcq" ? (
        <MCQ language={language} onBack={resetMenu} />
      ) : menuChoice === "summaries" ? (
        <Summaries language={language} onBack={resetMenu} />
      ) : menuChoice === "advices" ? (
        <Advices language={language} onBack={resetMenu} />
      ) : menuChoice === "sessions" ? (
        <Sessions language={language} onBack={resetMenu} />
      ) : menuChoice === "account" ? (
        <AccountCenter language={language} onBack={resetMenu} />
      ) : menuChoice === "essay" ? (
        <Essay language={language} onBack={resetMenu} />
      ) : menuChoice === "videoNotes" ? (
        <VideoNotes language={language} onBack={resetMenu} />
      ) : menuChoice === "biologyDrawings" ? (
        <BiologyDrawings language={language} onBack={backToBasics} />
      ) : menuChoice === "more" ? (
        <More language={language} onSelect={(c) => chooseMenu(c)} onNav={chooseMenu} />
      ) : menuChoice === "malazam" ? (
        <Subjects language={language} onChangeLanguage={resetMenu} onSelectSubject={() => {}} mode="malazam" />
      ) : !subject ? (
        <Subjects language={language} onChangeLanguage={resetMenu} onSelectSubject={setSubject} />
      ) : subject === "english" && !englishCategory ? (
        <EnglishCategoryPage
          language={language}
          onBack={resetSubject}
          onSelect={(c) => {
            localStorage.setItem(ENGLISH_CATEGORY_STORAGE_KEY, c);
            setEnglishCategory(c);
          }}
        />
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
