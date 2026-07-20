import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { lazy } from "react";
const Index = lazy(() => import("./pages/Index.tsx"));
const Chapters = lazy(() => import("./pages/Chapters.tsx"));
import NotFound from "./pages/NotFound.tsx";
import { useState } from "react";

import { AppLanguage, LanguageGate, LANGUAGE_STORAGE_KEY } from "./components/LanguageGate";
import Subjects, { SUBJECT_STORAGE_KEY, type AppSubject } from "./pages/Subjects";
import { applyTheme, getInitialTheme } from "./components/ThemePicker";
import { useEffect } from "react";
import Auth from "./pages/Auth";
import { supabase } from "./integrations/supabase/client";
const Missions = lazy(() => import("./pages/Missions"));
const MCQ = lazy(() => import("./pages/MCQ"));
const Summaries = lazy(() => import("./pages/Summaries"));
const Advices = lazy(() => import("./pages/Advices"));
const Sessions = lazy(() => import("./pages/Sessions"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
import AdminLogin from "./pages/AdminLogin";
import RoleGate, { ROLE_GATE_STORAGE_KEY, type AuthRole } from "./components/RoleGate";
const AccountCenter = lazy(() => import("./pages/AccountCenter"));
const Essay = lazy(() => import("./pages/Essay"));
const VideoNotes = lazy(() => import("./pages/VideoNotes"));
import ZombieGuard from "./components/ZombieGuard";
import EnglishCategoryPage, { ENGLISH_CATEGORY_STORAGE_KEY, type EnglishCategory } from "./pages/EnglishCategory";
import Basics, { type BasicsChoice } from "./pages/Basics";
const BiologyDrawings = lazy(() => import("./pages/BiologyDrawings"));
const More = lazy(() => import("./pages/More"));
const Leaderboard = lazy(() => import("./pages/Leaderboard"));
import PointsAwardOverlay from "./components/PointsAwardOverlay";
const TodoList = lazy(() => import("./pages/TodoList"));
const News = lazy(() => import("./pages/News"));
const Premium = lazy(() => import("./pages/Premium"));
const MinisterialBank = lazy(() => import("./pages/MinisterialBank"));
const MindMap = lazy(() => import("./pages/MindMap"));
const IslamicSurahs = lazy(() => import("./pages/IslamicSurahs"));
const HadithChecker = lazy(() => import("./pages/HadithChecker"));
const PoemsChecker = lazy(() => import("./pages/PoemsChecker"));
const EnglishEssays = lazy(() => import("./pages/EnglishEssays"));
const EnglishIsqat = lazy(() => import("./pages/EnglishIsqat"));
const DailyReport = lazy(() => import("./pages/DailyReport"));
const Notes = lazy(() => import("./pages/Notes"));
const Canvas = lazy(() => import("./pages/Canvas"));
const YoutubePlayer = lazy(() => import("./pages/YoutubePlayer"));
const OrganicEquations = lazy(() => import("./pages/OrganicEquations"));
const LiveBattle = lazy(() => import("./pages/LiveBattle"));
const SubjectsHub = lazy(() => import("./pages/SubjectsHub"));
const TextToVideo = lazy(() => import("./pages/TextToVideo"));
const PsychAssistant = lazy(() => import("./pages/PsychAssistant"));
const SubjectTutor = lazy(() => import("./pages/SubjectTutor"));
const PhysicsLaws = lazy(() => import("./pages/PhysicsLaws"));
const PhysicsQuickMcq = lazy(() => import("./pages/PhysicsQuickMcq"));
const PhysicsProblemSolver = lazy(() => import("./pages/PhysicsProblemSolver"));
const ProblemGenerator = lazy(() => import("./pages/ProblemGenerator"));
const FrenchSynonyms = lazy(() => import("./pages/FrenchSynonyms"));
const FrenchAntonyms = lazy(() => import("./pages/FrenchAntonyms"));
const ToolPlaceholder = lazy(() => import("./pages/ToolPlaceholder"));
const PhysicsActivities = lazy(() => import("./pages/PhysicsActivities"));
const OurCourses = lazy(() => import("./pages/OurCourses"));
const ExamGenerator = lazy(() => import("./pages/ExamGenerator"));
const Teachers = lazy(() => import("./pages/Teachers"));
const AdminNotes = lazy(() => import("./pages/AdminNotes"));
const Welcome = lazy(() => import("./pages/Welcome"));
// Onboarding page removed
import ParentFollow from "./pages/ParentFollow";
import OAuthConsent from "./pages/OAuthConsent";
import ResetPassword from "./pages/ResetPassword";
import { PaymentTestModeBanner } from "./components/PaymentTestModeBanner";
import { PremiumWelcomeOverlay } from "./components/PremiumWelcomeOverlay";
import SearchFAB from "./components/SearchFAB";
import ExcellenceCompanion from "./components/ExcellenceCompanion";
import TelegramGate from "./components/TelegramGate";
import TelegramChannelGate from "./components/TelegramChannelGate";
import PageTransition from "./components/PageTransition";
import BottomGroupNav from "./components/BottomGroupNav";
import SubjectFocusPicker, { FOCUS_SUBJECT_PICKED_KEY } from "./components/SubjectFocusPicker";

const MENU_STORAGE_KEY = "app_menu_choice_v1";
const COMPANION_PLANNED_WEEK_KEY = "app_companion_planned_week_v1";

function currentISOWeek(d = new Date()): string {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${weekNo}`;
}

// Force-open the Excellence Companion on the user's first visit ever AND at the
// start of every new week, so they always chat to build a weekly plan.
const CompanionWelcomeTrigger = () => {
  useEffect(() => {
    try {
      const stored = localStorage.getItem(COMPANION_PLANNED_WEEK_KEY);
      if (stored === currentISOWeek()) return;
    } catch { /* ignore */ }
    const id = window.setTimeout(() => {
      window.dispatchEvent(new Event("app:welcome-excellence-companion"));
    }, 400);
    return () => window.clearTimeout(id);
  }, []);
  return null;
};

const SpotifyAuthCallback = () => {
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("state") === "spotify" && url.searchParams.get("code")) {
      import("@/lib/spotifyAuth").then((m) => m.handleRedirectCallback());
    }
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

  // OAuth consent route for MCP clients — intercept before any auth gating
  if (typeof window !== "undefined" && window.location.pathname === "/.lovable/oauth/consent") {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <OAuthConsent />
        </TooltipProvider>
      </QueryClientProvider>
    );
  }

  // Public password-reset landing — must run before any auth gate so the
  // recovery link works even when the user is signed out.
  if (typeof window !== "undefined" && window.location.pathname === "/reset-password") {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <ResetPassword />
        </TooltipProvider>
      </QueryClientProvider>
    );
  }

  if (typeof window !== "undefined" && window.location.pathname === "/welcome") {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <BrowserRouter>
            <Welcome />
          </BrowserRouter>
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
  const CHANNEL_VERIFIED_STORAGE_KEY = "tg_channel_verified_v1";
  const [channelVerified, _setChannelVerified] = useState<boolean>(
    () => (typeof window !== "undefined" && localStorage.getItem(CHANNEL_VERIFIED_STORAGE_KEY) === "1")
  );
  const setChannelVerified = (v: boolean) => {
    _setChannelVerified(v);
    if (typeof window !== "undefined") {
      if (v) localStorage.setItem(CHANNEL_VERIFIED_STORAGE_KEY, "1");
      else localStorage.removeItem(CHANNEL_VERIFIED_STORAGE_KEY);
    }
  };
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

  // Re-verify Telegram channel membership on load. Only unverify (show gate)
  // if the check explicitly reports the user has left the channel.
  useEffect(() => {
    if (!authed || authRole === "admin") return;
    if (!channelVerified) return;
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("telegram-channel-check");
        if (cancelled || error) return;
        if (data && data.ok === true && data.joined === false) {
          setChannelVerified(false);
        }
      } catch {
        // Network/other errors: keep the user verified, don't nag.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authed, authRole]);
  const [language, setLanguage] = useState<AppLanguage | null>(
    () => (typeof window !== "undefined" ? (localStorage.getItem(LANGUAGE_STORAGE_KEY) as AppLanguage | null) : null)
  );
  const [subject, setSubject] = useState<AppSubject | null>(
    () => (typeof window !== "undefined" ? (localStorage.getItem(SUBJECT_STORAGE_KEY) as AppSubject | null) : null)
  );
  const [focusPicked, setFocusPicked] = useState<boolean>(
    () => (typeof window !== "undefined" ? localStorage.getItem(FOCUS_SUBJECT_PICKED_KEY) === "1" : false)
  );
  const changeFocusSubject = () => {
    try {
      localStorage.removeItem(FOCUS_SUBJECT_PICKED_KEY);
      localStorage.removeItem(SUBJECT_STORAGE_KEY);
    } catch { /* ignore */ }
    setSubject(null);
    setFocusPicked(false);
  };
  useEffect(() => {
    const handler = (e: Event) => {
      const s = (e as CustomEvent).detail?.subject as AppSubject | null;
      if (s) setSubject(s);
    };
    window.addEventListener("app:set-subject", handler as EventListener);
    return () => window.removeEventListener("app:set-subject", handler as EventListener);
  }, []);
  const [englishCategory, setEnglishCategory] = useState<EnglishCategory | null>(
    () => (typeof window !== "undefined" ? (localStorage.getItem(ENGLISH_CATEGORY_STORAGE_KEY) as EnglishCategory | null) : null)
  );
  type MenuChoice = "flashcards" | "missions" | "mcq" | "malazam" | "summaries" | "advices" | "sessions" | "account" | "essay" | "videoNotes" | "basics" | "biologyDrawings" | "more" | "leaderboard" | "todo" | "news" | "premium" | "ministerialBank" | "mindmap" | "islamicSurahs" | "hadithChecker" | "poemsChecker" | "englishEssays" | "englishIsqat" | "report" | "notes" | "canvas" | "youtube" | "organicEquations" | "liveBattle" | "subjectsHub" | "textToVideo" | "psych" | "companion" | "subjectTutor" | "physicsLaws" | "physicsQuickMcq" | "physicsProblemSolver" | "problemGenerator" | "frenchSynonyms" | "frenchAntonyms" | "toolPlaceholder" | "physicsActivities" | "ourCourses" | "examGenerator" | "teachers" | "adminNotes";
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
  // Deep-link support: ?menu=courses (or any other MenuChoice) opens that section directly.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const m = params.get("menu");
    if (m) {
      chooseMenu(m as MenuChoice);
      params.delete("menu");
      const qs = params.toString();
      window.history.replaceState({}, "", window.location.pathname + (qs ? `?${qs}` : ""));
    }
  }, []);
  const handleBasicsSelect = (c: BasicsChoice) => {
    if (c === "biologyDrawings") {
      chooseMenu("biologyDrawings");
    } else if (c === "todo") {
      chooseMenu("todo");
    } else if (c === "news") {
      chooseMenu("news");
    } else if (c === "ministerialBank") {
      chooseMenu("ministerialBank");
    } else if (c === "subjectsHub") {
      chooseMenu("subjectsHub");
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
      <SpotifyAuthCallback />
      <PointsAwardOverlay language={language ?? "en"} />
      <PaymentTestModeBanner />
      {language && <PremiumWelcomeOverlay language={language} />}
      {authed && language && authRole !== "admin" && channelVerified && (
        <SearchFAB language={language} onSelect={(c) => chooseMenu(c as MenuChoice)} />
      )}
      {authed && language && authRole !== "admin" && channelVerified && (
        <CompanionWelcomeTrigger />
      )}
      {authed && language && authRole !== "admin" && channelVerified && (
        <BottomGroupNav
          language={language}
          active={(menuChoice as any) ?? "basics"}
          onSelect={(k) => chooseMenu(k as MenuChoice)}
        />
      )}
      <PageTransition
        routeKey={`${authRole ?? "norole"}|${authed ? "in" : "out"}|${language ?? "nolang"}|${channelVerified ? "ch" : "noch"}|${menuChoice ?? "basics"}|${subject ?? "nosub"}|${englishCategory ?? "noec"}`}
      >
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
      ) : authRole === "guest" ? (
        <Teachers
          language={language ?? "ar"}
          onBack={resetRole}
          isAdmin={false}
        />
      ) : !authed ? (
        <Auth onAuthed={() => setAuthed(true)} onGoAdmin={() => chooseRole("admin")} />
      ) : !language ? (
        <LanguageGate onSelect={setLanguage} />
      ) : authRole !== "admin" && !channelVerified ? (
        <TelegramChannelGate language={language} onVerified={() => setChannelVerified(true)} />
      ) : authRole !== "admin" && !focusPicked ? (
        <SubjectFocusPicker
          language={language}
          onPick={(s) => {
            setSubject(s);
            setFocusPicked(true);
          }}
        />
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
        <DailyReport language={language} onBack={resetMenu} onNav={chooseMenu} />
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
      ) : menuChoice === "textToVideo" ? (
        <TextToVideo language={language} onBack={resetMenu} />
      ) : menuChoice === "psych" ? (
        <PsychAssistant language={language} onBack={resetMenu} />
      ) : menuChoice === "subjectTutor" ? (
        <SubjectTutor language={language} onBack={resetMenu} />
      ) : menuChoice === "physicsLaws" ? (
        <PhysicsLaws language={language} onBack={resetMenu} />
      ) : menuChoice === "physicsQuickMcq" ? (
        <PhysicsQuickMcq language={language} onBack={resetMenu} />
      ) : menuChoice === "physicsProblemSolver" ? (
        <PhysicsProblemSolver language={language} onBack={resetMenu} />
      ) : menuChoice === "problemGenerator" ? (
        <ProblemGenerator language={language} onBack={resetMenu} onNav={(c) => setMenuChoice(c as MenuChoice)} />
      ) : menuChoice === "frenchSynonyms" ? (
        <FrenchSynonyms language={language} onBack={resetMenu} />
      ) : menuChoice === "frenchAntonyms" ? (
        <FrenchAntonyms language={language} onBack={resetMenu} />
      ) : menuChoice === "toolPlaceholder" ? (
        <ToolPlaceholder language={language} onBack={resetMenu} />
      ) : menuChoice === "physicsActivities" ? (
        <PhysicsActivities language={language} onBack={resetMenu} />
      ) : menuChoice === "ourCourses" ? (
        <OurCourses language={language} onBack={resetMenu} />
      ) : menuChoice === "examGenerator" ? (
        <ExamGenerator language={language} onBack={resetMenu} />
      ) : menuChoice === "teachers" ? (
        <Teachers language={language} onBack={resetMenu} isAdmin={isAdmin} />
      ) : menuChoice === "adminNotes" ? (
        <AdminNotes language={language} onBack={resetMenu} />
      ) : menuChoice === "companion" ? (
        <main className="min-h-screen bg-background pb-28">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-6">
            <button
              onClick={resetMenu}
              className="inline-flex items-center gap-2 h-9 px-3 rounded-lg border border-border bg-card text-sm font-medium hover:bg-secondary transition-colors mb-6"
            >
              {language === "ar" ? "رجوع" : "Back"}
            </button>
            <ExcellenceCompanion language={language} embedded />
          </div>
        </main>
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
      </PageTransition>
    </TooltipProvider>
  </QueryClientProvider>
  );
};

export default App;
