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
import { applyTheme, getInitialTheme } from "./components/ThemePicker";
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
import AccountCenter from "./pages/AccountCenter";
import Essay from "./pages/Essay";
import VideoNotes from "./pages/VideoNotes";
import ZombieGuard from "./components/ZombieGuard";
import EnglishCategoryPage, { ENGLISH_CATEGORY_STORAGE_KEY, type EnglishCategory } from "./pages/EnglishCategory";
import Basics, { type BasicsChoice } from "./pages/Basics";
import BiologyDrawings from "./pages/BiologyDrawings";
import More from "./pages/More";
import Leaderboard from "./pages/Leaderboard";
import PointsAwardOverlay from "./components/PointsAwardOverlay";
import TodoList from "./pages/TodoList";
import News from "./pages/News";
import Premium from "./pages/Premium";
import MinisterialBank from "./pages/MinisterialBank";
import MindMap from "./pages/MindMap";
import IslamicSurahs from "./pages/IslamicSurahs";
import HadithChecker from "./pages/HadithChecker";
import PoemsChecker from "./pages/PoemsChecker";
import EnglishEssays from "./pages/EnglishEssays";
import EnglishIsqat from "./pages/EnglishIsqat";
import DailyReport from "./pages/DailyReport";
import Notes from "./pages/Notes";
import Canvas from "./pages/Canvas";
import YoutubePlayer from "./pages/YoutubePlayer";
import OrganicEquations from "./pages/OrganicEquations";
import LiveBattle from "./pages/LiveBattle";
import SubjectsHub from "./pages/SubjectsHub";
import AppSidebar, { type SidebarKey } from "./components/AppSidebar";
// Onboarding page removed
import ParentFollow from "./pages/ParentFollow";
import { PaymentTestModeBanner } from "./components/PaymentTestModeBanner";
import { PremiumWelcomeOverlay } from "./components/PremiumWelcomeOverlay";
import SearchFAB from "./components/SearchFAB";
import ExcellenceCompanion from "./components/ExcellenceCompanion";
import TelegramGate from "./components/TelegramGate";

const MENU_STORAGE_KEY = "app_menu_choice_v1";
const COMPANION_INTRO_KEY = "app_companion_intro_v1";

const CompanionWelcomeTrigger = () => {
  useEffect(() => {
    try {
      if (localStorage.getItem(COMPANION_INTRO_KEY) === "1") return;
    } catch { /* ignore */ }
    const id = window.setTimeout(() => {
      window.dispatchEvent(new Event("app:welcome-excellence-companion"));
    }, 400);
    return () => window.clearTimeout(id);
  }, []);
  return null;
};

const queryClient = new QueryClient();

const App = () => {
  // Public parent follow-up route — intercept before any auth gating
  const followMatch = typeof window !== "undefined" ? window.location.pathname.match(/^\/follow\/([A-Za-z0-9_-]+)/) : null;
  if (followMatch) {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <ParentFollow token={followMatch[1]} />
        </TooltipProvider>
      </QueryClientProvider>
    );
  }

  useEffect(() => {
    applyTheme(getInitialTheme());
  }, []);
  const [authed, setAuthed] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [tgVerified, setTgVerified] = useState(false);
  const [tgLoading, setTgLoading] = useState(false);
  const [authRole, setAuthRole] = useState<AuthRole | null>(
    () => (typeof window !== "undefined" ? (localStorage.getItem(ROLE_GATE_STORAGE_KEY) as AuthRole | null) : null)
  );
  useEffect(() => {
    // ---- OAuth callback diagnostics (runs once on mount) ----
    try {
      const url = new URL(window.location.href);
      const hash = window.location.hash || "";
      const hashParams = new URLSearchParams(hash.startsWith("#") ? hash.slice(1) : hash);
      const searchKeys = Array.from(url.searchParams.keys());
      const hashKeys = Array.from(hashParams.keys());
      const oauthMarkers = {
        hasCode: url.searchParams.has("code"),
        hasState: url.searchParams.has("state") || hashParams.has("state"),
        hasAccessToken: hashParams.has("access_token"),
        hasRefreshToken: hashParams.has("refresh_token"),
        hasError: url.searchParams.has("error") || hashParams.has("error"),
        error: url.searchParams.get("error") ?? hashParams.get("error"),
        errorCode: url.searchParams.get("error_code") ?? hashParams.get("error_code"),
        errorDescription:
          url.searchParams.get("error_description") ?? hashParams.get("error_description"),
        provider: hashParams.get("provider_token") ? "present" : null,
      };
      const isOAuthLanding =
        oauthMarkers.hasCode ||
        oauthMarkers.hasAccessToken ||
        oauthMarkers.hasError ||
        url.pathname.includes("/~oauth");
      if (isOAuthLanding) {
        console.log("[OAuth] callback landing", {
          href: window.location.href,
          origin: window.location.origin,
          pathname: url.pathname,
          searchKeys,
          hashKeys,
          markers: oauthMarkers,
        });
        if (oauthMarkers.hasError) {
          console.error("[OAuth] provider returned error on callback", oauthMarkers);
        }
      }
    } catch (e) {
      console.error("[OAuth] failed to parse callback URL", e);
    }

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      console.log("[OAuth] onAuthStateChange", {
        event: _e,
        hasSession: !!session,
        userId: session?.user?.id,
        provider: (session?.user as any)?.app_metadata?.provider,
        providers: (session?.user as any)?.app_metadata?.providers,
        expiresAt: session?.expires_at,
      });
      setAuthed(!!session);
      if (session?.user) {
        supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", session.user.id)
          .eq("role", "admin")
          .maybeSingle()
          .then(({ data }) => setIsAdmin(!!data));
        setTgLoading(true);
        supabase
          .from("telegram_verifications")
          .select("telegram_user_id, verified")
          .eq("user_id", session.user.id)
          .maybeSingle()
          .then(({ data }) => {
            setTgVerified(!!data?.telegram_user_id && data?.verified !== false);
            setTgLoading(false);
          });
      } else {
        setIsAdmin(false);
        setTgVerified(false);
      }
    });
    supabase.auth.getSession().then(({ data, error }) => {
      console.log("[OAuth] initial getSession", {
        hasSession: !!data.session,
        userId: data.session?.user?.id,
        provider: (data.session?.user as any)?.app_metadata?.provider,
        error: error ? { message: error.message, name: error.name } : null,
      });
      setAuthed(!!data.session);
      if (data.session?.user) {
        supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", data.session.user.id)
          .eq("role", "admin")
          .maybeSingle()
          .then(({ data: r }) => setIsAdmin(!!r));
        setTgLoading(true);
        supabase
          .from("telegram_verifications")
          .select("telegram_user_id, verified")
          .eq("user_id", data.session.user.id)
          .maybeSingle()
          .then(({ data: row }) => {
            setTgVerified(!!row?.telegram_user_id && row?.verified !== false);
            setTgLoading(false);
          });
      }
      setAuthLoading(false);
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
  type MenuChoice = "flashcards" | "missions" | "mcq" | "malazam" | "summaries" | "advices" | "sessions" | "account" | "essay" | "videoNotes" | "basics" | "biologyDrawings" | "more" | "leaderboard" | "todo" | "news" | "premium" | "ministerialBank" | "mindmap" | "islamicSurahs" | "hadithChecker" | "poemsChecker" | "englishEssays" | "englishIsqat" | "report" | "notes" | "canvas" | "youtube" | "organicEquations" | "liveBattle" | "subjectsHub";
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
    } else if (c === "todo") {
      chooseMenu("todo");
    } else if (c === "news") {
      chooseMenu("news");
    } else if (c === "ministerialBank") {
      chooseMenu("ministerialBank");
    } else if (c === "mindmap") {
      chooseMenu("mindmap");
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
      <ZombieGuard />
      <PointsAwardOverlay language={language ?? "en"} />
      <PaymentTestModeBanner />
      {language && <PremiumWelcomeOverlay language={language} />}
      {authed && language && authRole !== "admin" && tgVerified && (
        <SearchFAB language={language} onSelect={(c) => chooseMenu(c as MenuChoice)} />
      )}
      {authed && language && authRole !== "admin" && tgVerified && (
        <CompanionWelcomeTrigger />
      )}
      {authed && language && authRole !== "admin" && tgVerified && (
        <AppSidebar
          language={language}
          active={(menuChoice as SidebarKey | null) ?? "basics"}
          onSelect={(k) => chooseMenu(k as MenuChoice)}
        />
      )}
      {!authRole ? (
        <RoleGate onSelect={chooseRole} />
      ) : authLoading ? (
        <main className="min-h-screen flex items-center justify-center">
          <div className="w-10 h-10 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
        </main>
      ) : authRole === "admin" && !authed ? (
        <AdminLogin onAuthed={() => setAuthed(true)} onBack={resetRole} />
      ) : authRole === "admin" && authed && isAdmin ? (
        <AdminDashboard onLogout={adminLogout} />
      ) : !authed ? (
        <Auth onAuthed={() => setAuthed(true)} onGoAdmin={() => chooseRole("admin")} />
      ) : !language ? (
        <LanguageGate onSelect={setLanguage} />
      ) : authRole !== "admin" && !tgVerified ? (
        tgLoading ? (
          <main className="min-h-screen flex items-center justify-center">
            <div className="w-10 h-10 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
          </main>
        ) : (
          <TelegramGate language={language} onVerified={() => setTgVerified(true)} />
        )
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
        <AccountCenter language={language} onBack={resetMenu} onNav={chooseMenu} onChangeLanguage={resetLanguage} />
      ) : menuChoice === "essay" ? (
        <Essay language={language} onBack={resetMenu} />
      ) : menuChoice === "videoNotes" ? (
        <VideoNotes language={language} onBack={resetMenu} />
      ) : menuChoice === "biologyDrawings" ? (
        <BiologyDrawings language={language} onBack={backToBasics} />
      ) : menuChoice === "todo" ? (
        <TodoList language={language} onBack={backToBasics} />
      ) : menuChoice === "news" ? (
        <News language={language} onBack={backToBasics} />
      ) : menuChoice === "ministerialBank" ? (
        <MinisterialBank language={language} onBack={backToBasics} />
      ) : menuChoice === "mindmap" ? (
        <MindMap language={language} onBack={backToBasics} />
      ) : menuChoice === "islamicSurahs" ? (
        <IslamicSurahs language={language} onBack={backToBasics} />
      ) : menuChoice === "hadithChecker" ? (
        <HadithChecker language={language} onBack={backToBasics} />
      ) : menuChoice === "poemsChecker" ? (
        <PoemsChecker language={language} onBack={backToBasics} />
      ) : menuChoice === "englishEssays" ? (
        <EnglishEssays language={language} onBack={backToBasics} />
      ) : menuChoice === "englishIsqat" ? (
        <EnglishIsqat language={language} onBack={backToBasics} />
      ) : menuChoice === "report" ? (
        <DailyReport language={language} onBack={resetMenu} />
      ) : menuChoice === "notes" ? (
        <Notes language={language} onBack={resetMenu} />
      ) : menuChoice === "canvas" ? (
        <Canvas language={language} onBack={resetMenu} onOpenNotes={() => chooseMenu("notes")} />
      ) : menuChoice === "youtube" ? (
        <YoutubePlayer language={language} onBack={resetMenu} />
      ) : menuChoice === "organicEquations" ? (
        <OrganicEquations language={language} onBack={resetMenu} />
      ) : menuChoice === "liveBattle" ? (
        <LiveBattle language={language} onBack={resetMenu} />
      ) : menuChoice === "subjectsHub" ? (
        <SubjectsHub language={language} onBack={backToBasics} onSelect={chooseMenu} />
      ) : menuChoice === "premium" ? (
        <Premium language={language} onBack={resetMenu} />
      ) : menuChoice === "more" ? (
        <More language={language} onSelect={(c) => chooseMenu(c)} onNav={chooseMenu} />
      ) : menuChoice === "leaderboard" ? (
        <Leaderboard language={language} onBack={resetMenu} onNav={chooseMenu} />
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
