import { Toaster } from "@/components/ui/sonner";
import { SiteFooter } from "@/components/SiteFooter";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, Redirect, useLocation } from "wouter";
import { lazy, Suspense, useEffect, useState } from "react";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AuthProvider } from "@/lib/useAuth";
// Removed (Feb 2026, Rich): ThemeToggle, ThemeSuggestion, ThemeOnboarding,
// AdminQrBadge — user-facing theme picker + QR badge floating pills gone.
// AutoThemeByTime (defined below) handles theme via time-of-day.
import UserMenu from "@/components/UserMenu";
import CrushCascade from "@/components/CrushCascade";

// ── EAGER: first-paint-critical + cellar-floor PWA tabs ───────────────────
// Loaded synchronously so the most-trafficked routes render with zero
// network round-trip after the JS shell arrives. Everything else lives
// behind React.lazy() so a winemaker on rural 3G doesn't pay for code
// they may never touch.
import Home from "./pages/Home";
import FreeRun from "./pages/FreeRun";
const FreeRunJournal = lazy(() => import("./pages/FreeRunJournal"));
const Apco = lazy(() => import("./pages/Apco"));
const HomeV2 = lazy(() => import("./pages/HomeV2"));
const HomeV3 = lazy(() => import("./pages/HomeV3"));
import ThePress from "./pages/ThePress";
import QuickEntry from "./pages/QuickEntry";
import CellarTasks from "./pages/CellarTasks";
import Today from "./pages/Today";
import Pricing from "./pages/Pricing";
import CellarBrief from "./pages/CellarBrief";
import TrialEnding from "./pages/TrialEnding";
import Invite from "./pages/Invite";
import { TrialBanner } from "./components/TrialBanner";
import WorkModeLayout from "@/components/WorkModeLayout";
import PwaInstallBanner from "./components/PwaInstallBanner";

// ── LAZY: cold pages — code-split into their own chunks ───────────────────
const WhyOwnology = lazy(() => import("./pages/WhyOwnology"));
const ForInnoVintUsers = lazy(() => import("./pages/ForInnoVintUsers"));
const ForVintraceUsers = lazy(() => import("./pages/ForVintraceUsers"));
const Blog = lazy(() => import("./pages/Blog"));
const BlogArticle = lazy(() => import("./pages/BlogArticle"));
const Regulations = lazy(() => import("./pages/Regulations"));
const RegulatoryLinks = lazy(() => import("./pages/RegulatoryLinks"));
const Compliance = lazy(() => import("./pages/Compliance"));
const Merch = lazy(() => import("./pages/Merch"));
const MerchSuccess = lazy(() => import("./pages/MerchSuccess"));
const MerchCancel = lazy(() => import("./pages/MerchCancel"));
const CampaignMetrics = lazy(() => import("./pages/CampaignMetrics"));
const Orders = lazy(() => import("./pages/Orders"));
const Admin = lazy(() => import("./pages/Admin"));
const HomeWineryKit = lazy(() => import("./pages/HomeWineryKit"));
const ForHomeWinemakers = lazy(() => import("./pages/ForHomeWinemakers"));
const DIYKnowledge = lazy(() => import("./pages/DIYKnowledge"));
const HomeWinemakerTroubleshooting = lazy(() => import("./pages/HomeWinemakerTroubleshooting"));
const HomeWinemakerGlossary = lazy(() => import("./pages/HomeWinemakerGlossary"));
const CompetitiveAdvantage = lazy(() => import("./pages/CompetitiveAdvantage"));
const Preview = lazy(() => import("./pages/Preview"));
const AdminLeads = lazy(() => import("./pages/AdminLeads"));
const AdminComplianceDoctrine = lazy(() => import("./pages/AdminComplianceDoctrine"));
const AdminVintageIntelligence = lazy(() => import("./pages/AdminVintageIntelligence"));
const AdminWbs = lazy(() => import("./pages/AdminWbs"));
const AdminTrinity = lazy(() => import("./pages/AdminTrinity"));
const AdminFunnel = lazy(() => import("./pages/AdminFunnel"));
const FoundingMemberSuccess = lazy(() => import("./pages/FoundingMemberSuccess"));
const OAuthCallback = lazy(() => import("./pages/OAuthCallback"));
const ProductionDashboard = lazy(() => import("./pages/ProductionDashboard"));
const BuildIndex = lazy(() => import("./pages/BuildIndex"));
const Vineyard = lazy(() => import("./pages/Vineyard"));
const Knowledge = lazy(() => import("./pages/Knowledge"));
// Named exports — must rewrap to a `default` shape for React.lazy().
const CellarJournalIndex = lazy(() =>
  import("./pages/CellarJournal").then((m) => ({ default: m.CellarJournalIndex }))
);
const CellarJournalEntry = lazy(() =>
  import("./pages/CellarJournal").then((m) => ({ default: m.CellarJournalEntry }))
);
const Guide = lazy(() => import("./pages/Guide"));
const Import = lazy(() => import("./pages/Import"));
const OurStory = lazy(() => import("./pages/OurStory"));
const PricingComparison = lazy(() => import("./pages/PricingComparison"));
const Learn = lazy(() => import("./pages/Learn"));
const Demo = lazy(() => import("./pages/Demo"));
const Waitlist = lazy(() => import("./pages/Waitlist"));
const VineReference = lazy(() => import("./pages/VineReference"));
const Resume = lazy(() => import("./pages/Resume"));
const Stats = lazy(() => import("./pages/Stats"));
const TankQr = lazy(() => import("./pages/TankQr"));
const VintageCompare = lazy(() => import("./pages/VintageCompare"));
const HiContact = lazy(() => import("./pages/HiContact"));
const AdminContacts = lazy(() => import("./pages/AdminContacts"));
const AdminContactsMigrate = lazy(() => import("./pages/AdminContactsMigrate"));
const AdminContactsPipeline = lazy(() => import("./pages/AdminContactsPipeline"));
const AdminEventIngest = lazy(() => import("./pages/AdminEventIngest"));
const AdminAudioHook = lazy(() => import("./pages/AdminAudioHook"));
const AdminMarketingKit = lazy(() => import("./pages/AdminMarketingKit"));
const AdminOperatorGuide = lazy(() => import("./pages/AdminOperatorGuide"));
const AdminThemesStats = lazy(() => import("./pages/AdminThemesStats"));
const AdminQuizPicks = lazy(() => import("./pages/AdminQuizPicks"));
const AdminProducers = lazy(() => import("./pages/AdminProducers"));
const AdminMarketingOps = lazy(() => import("./pages/AdminMarketingOps"));
const AdminEnvironment = lazy(() => import("./pages/AdminEnvironment"));
const AdminGateInvites = lazy(() => import("./pages/AdminGateInvites"));
const AdminMembers = lazy(() => import("./pages/AdminMembers"));
const TrialLocked = lazy(() => import("./pages/TrialLocked"));
const JoinLandscape = lazy(() => import("./pages/JoinLandscape"));
const JoinQr = lazy(() => import("./pages/JoinQr"));
const InstallIos = lazy(() => import("./pages/InstallIos"));
const TastingEntry = lazy(() => import("./pages/TastingEntry"));
const RiskManagement = lazy(() => import("./pages/RiskManagement"));
const RiskBriefing = lazy(() => import("./pages/RiskBriefing"));
const RiskGlossary = lazy(() => import("./pages/RiskGlossary"));
const HiProducerPreview = lazy(() => import("./pages/HiProducerPreview"));
const CascadeDemo = lazy(() => import("./pages/CascadeDemo"));
const CopilotMockup = lazy(() => import("./pages/CopilotMockup"));
const BrandingMockup = lazy(() => import("./pages/BrandingMockup"));
const OnboardingMockup = lazy(() => import("./pages/OnboardingMockup"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Terms = lazy(() => import("./pages/Terms"));
const Refund = lazy(() => import("./pages/Refund"));
const AdminResponsive = lazy(() => import("./pages/AdminResponsive"));
const AdminDev = lazy(() => import("./pages/AdminDev"));
const AdminAnalyticsThemes = lazy(() => import("./pages/AdminAnalyticsThemes"));
const AdminSettings = lazy(() => import("./pages/AdminSettings"));
const AdminPlaybook = lazy(() => import("./pages/AdminPlaybook"));
const Login = lazy(() => import("./pages/Login"));
const AuthCallback = lazy(() => import("./pages/AuthCallback"));
const Quiz = lazy(() => import("./pages/Quiz"));
const SiteMapPage = lazy(() => import("./pages/SiteMap"));
const Try = lazy(() => import("./pages/Try"));
const Ask = lazy(() => import("./pages/Ask"));
const FoundingPartners = lazy(() => import("./pages/FoundingPartners"));
const Referral = lazy(() => import("./pages/Join"));
const CallPlaybook = lazy(() => import("./pages/CallPlaybook"));
const Todo = lazy(() => import("./pages/Todo"));

/** Lightweight skeleton shown while a lazy page chunk downloads.
 *  Sized so it doesn't cause layout shift on first paint. */
function PageLoading() {
  return (
    <div
      style={{
        minHeight: "60vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "var(--ow-text-lo, #6b7280)",
        fontFamily: "'Lato',sans-serif",
        fontSize: "0.85rem",
        letterSpacing: "0.08em",
        textTransform: "uppercase",
      }}
      data-testid="page-loading"
      role="status"
      aria-live="polite"
    >
      Loading…
    </div>
  );
}


// ── Work Mode wrapper components ──────────────────────────────────────────
function FreeRunPage() {
  return (
    <WorkModeLayout title="Ask Ownology" activeTab="ask">
      <FreeRun />
    </WorkModeLayout>
  );
}
function ThePressPage() {
  return (
    <WorkModeLayout title="The Press" activeTab="press">
      <ThePress />
    </WorkModeLayout>
  );
}
function QuickEntryPage() {
  return (
    <WorkModeLayout title="Quick Entry" activeTab="log">
      <QuickEntry />
    </WorkModeLayout>
  );
}
function CellarTasksPage() {
  return (
    <WorkModeLayout title="Cellar Tasks" activeTab="tasks">
      <CellarTasks />
    </WorkModeLayout>
  );
}
function DashboardPage() {
  return (
    <WorkModeLayout title="Dashboard" activeTab="more" wide>
      <ProductionDashboard />
    </WorkModeLayout>
  );
}
function ImportPage() {
  return (
    <WorkModeLayout title="Import">
      <Import />
    </WorkModeLayout>
  );
}
function TodayPage() {
  return (
    <WorkModeLayout title="Today" activeTab="more">
      <Today />
    </WorkModeLayout>
  );
}
function CellarBriefPage() {
  return (
    <WorkModeLayout title="Cellar Brief" activeTab="more">
      <CellarBrief />
    </WorkModeLayout>
  );
}
function TrialEndingPage() {
  return (
    <WorkModeLayout title="Your trial" activeTab="more">
      <TrialEnding />
    </WorkModeLayout>
  );
}
function InvitePage() {
  return (
    <WorkModeLayout title="Invite a winemaker" activeTab="more">
      <Invite />
    </WorkModeLayout>
  );
}
function KnowledgePage() {
  return (
    <WorkModeLayout title="Knowledge" wide>
      <Knowledge />
    </WorkModeLayout>
  );
}

/**
 * MobileRedirect — auto-routes mobile users to Work Mode on first visit to /
 * Desktop users see the marketing homepage as normal.
 * A sessionStorage flag prevents re-redirecting during the same session.
 */
function MobileHomeRoute() {
  const [, navigate] = useLocation();
  useEffect(() => {
    // S8-I: First-visit orientation redirect.
    // New users (no ownology_guide_seen flag) are sent to /guide once.
    // The Guide page sets ownology_guide_seen on mount, so this fires only once.
    const guideSeen = (() => {
      try { return localStorage.getItem("ownology_guide_seen") === "1"; }
      catch { return true; /* if storage unavailable, never force-redirect */ }
    })();
    if (!guideSeen) {
      navigate("/guide", { replace: true });
      return;
    }

    // Returning mobile users are routed straight to Work Mode (Free Run) once per session.
    const isMobile = window.matchMedia("(max-width: 768px)").matches;
    const alreadyRedirected = sessionStorage.getItem("ow_mobile_redirected");
    if (isMobile && !alreadyRedirected) {
      sessionStorage.setItem("ow_mobile_redirected", "1");
      navigate("/free-run", { replace: true });
    }
  }, [navigate]);
  return <Home />;
}

function Router() {
  // S8-I: Post-login redirect to /guide for new users
  // The Guide page sets 'ownology_guide_seen' in localStorage on mount.
  // We only redirect on the root path so deep-links are not interrupted.
  // Also — scroll to top of window on every route change. Wouter's <Link>
  // preserves scroll by default, which meant deep-scrolled visitors landed
  // on the next page mid-footer. This restores natural "top of page" UX.
  const [pathname] = useLocation();
  useEffect(() => {
    if (typeof window === "undefined") return;
    // Skip when navigating to an in-page anchor (e.g. /#our-story) — the
    // browser's native anchor scrolling should still work in that case.
    if (window.location.hash) return;
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname]);
  return (
    <>
    <TrialBanner />
    {/* Removed (Feb 2026, Rich): ThemeOnboarding, AdminQrBadge, and the
        floating GlobalThemeToggle. User-toggled themes are gone —
        theme is now auto-switched by time of day via AutoThemeByTime
        below. Q "Try Parchment for now?" popups are muted. */}
    <AutoThemeByTime />
    <CrushCascade />
    <Suspense fallback={<PageLoading />}>
    <Switch>
      <Route path={"/"} component={MobileHomeRoute} />
      <Route path={"/home"} component={Home} />
      <Route path={"/why-ownology"} component={WhyOwnology} />
      <Route path={"/our-story"} component={OurStory} />
      <Route path={"/pricing-comparison"} component={PricingComparison} />
      <Route path={"/apprentice"} component={Learn} />
      <Route path={"/for-innovint-users"} component={ForInnoVintUsers} />
      <Route path={"/for-vintrace-users"} component={ForVintraceUsers} />
      <Route path={"/for-home-winemakers"} component={ForHomeWinemakers} />
      <Route path={"/for-home-winemakers/troubleshooting"} component={HomeWinemakerTroubleshooting} />
      <Route path={"/for-home-winemakers/glossary"} component={HomeWinemakerGlossary} />
      <Route path={"/for-home-winemakers/knowledge"} component={DIYKnowledge} />
      <Route path={"/for-home-winemakers/knowledge/*"} component={DIYKnowledge} />
      <Route path={"/blog"} component={Blog} />
      <Route path={"/blog/:slug"} component={BlogArticle} />
      <Route path={"/cellar-journal"} component={CellarJournalIndex} />
      <Route path={"/cellar-journal/:slug"}>
        {(params) => <CellarJournalEntry slug={params.slug} />}
      </Route>
      <Route path={"/regulations"} component={RegulatoryLinks} />
      <Route path={"/regulations/detail"} component={Regulations} />
      <Route path={"/resources"} component={RegulatoryLinks} />
      <Route path={"/resources/home-winery-kit"} component={HomeWineryKit} />
      <Route path={"/compliance"} component={Compliance} />
      <Route path={"/free-run/journal"} component={FreeRunJournal} />
      <Route path={"/free-run"} component={FreeRunPage} />
      <Route path={"/apco"} component={Apco} />
      <Route path={"/home-v2"} component={HomeV2} />
      <Route path={"/home-v3"} component={HomeV3} />
      <Route path={"/the-press"} component={ThePressPage} />
      <Route path={"/pricing"} component={Pricing} />
      <Route path={"/merch/success"} component={MerchSuccess} />
      <Route path={"/merch/cancel"} component={MerchCancel} />
      <Route path={"/merch"} component={Merch} />
      <Route path={"/campaign-metrics"} component={CampaignMetrics} />
      <Route path={"/orders"} component={Orders} />
      <Route path={"/admin"} component={Admin} />
      <Route path={"/quick-entry"} component={QuickEntryPage} />
      <Route path={"/cellar-tasks"} component={CellarTasksPage} />
      <Route path={"/competitive-advantage"} component={CompetitiveAdvantage} />
      <Route path={"/preview"} component={Preview} />
      <Route path={"/admin/leads"} component={AdminLeads} />
      <Route path={"/admin/compliance-doctrine"} component={AdminComplianceDoctrine} />
      <Route path={"/admin/vintage-intelligence"} component={AdminVintageIntelligence} />
      <Route path={"/admin/wbs"} component={AdminWbs} />
      <Route path={"/admin/trinity"} component={AdminTrinity} />
      <Route path={"/admin/funnel"} component={AdminFunnel} />
      <Route path={"/founding-member/success"} component={FoundingMemberSuccess} />
      <Route path={"/dashboard"} component={DashboardPage} />
      <Route path={"/vineyard"} component={Vineyard} />
      <Route path={"/build-index"} component={BuildIndex} />
      <Route path={"/knowledge"} component={KnowledgePage} />
      <Route path={"/knowledge/*"} component={KnowledgePage} />
      <Route path={"/guide"} component={Guide} />
      <Route path={"/import"} component={ImportPage} />
      <Route path={"/today"} component={TodayPage} />
      <Route path={"/cellar-brief"} component={CellarBriefPage} />
      <Route path={"/trial-ending"} component={TrialEndingPage} />
      <Route path={"/invite"} component={InvitePage} />
      <Route path={"/demo"} component={Demo} />
      <Route path={"/waitlist"} component={Waitlist} />
      <Route path={"/reference/vine"} component={VineReference} />
      <Route path={"/resume"} component={Resume} />
      <Route path={"/stats"} component={Stats} />
      <Route path={"/tank-qr"} component={TankQr} />
      <Route path={"/the-press/compare"} component={VintageCompare} />
      <Route path={"/hi/producers/:id"} component={HiProducerPreview} />
      <Route path={"/hi/:slug"} component={HiContact} />
      <Route path={"/admin/contacts/pipeline"} component={AdminContactsPipeline} />
      <Route path={"/admin/contacts"} component={AdminContacts} />
      <Route path={"/admin/contacts-migrate"} component={AdminContactsMigrate} />
      <Route path={"/admin/event-ingest"} component={AdminEventIngest} />
      <Route path={"/admin/audio-hook"} component={AdminAudioHook} />
      <Route path={"/admin/marketing-kit"} component={AdminMarketingKit} />
      <Route path={"/admin/operator-guide"} component={AdminOperatorGuide} />
      <Route path={"/admin/themes-stats"} component={AdminThemesStats} />
      <Route path={"/admin/quiz-picks"} component={AdminQuizPicks} />
      <Route path={"/admin/producers"} component={AdminProducers} />
      <Route path={"/admin/marketing-ops"} component={AdminMarketingOps} />
      <Route path={"/admin/environment"} component={AdminEnvironment} />
      <Route path={"/admin/gate-invites"} component={AdminGateInvites} />
      <Route path={"/admin/members"} component={AdminMembers} />
      <Route path={"/trial-locked"} component={TrialLocked} />
      <Route path={"/join/landscape"} component={JoinLandscape} />
      <Route path={"/join/qr"} component={JoinQr} />
      <Route path={"/install-ios"} component={InstallIos} />
      <Route path={"/pwa/install"} component={InstallIos} />
      <Route path={"/pwa/ios"} component={InstallIos} />
      <Route path={"/tasting"} component={TastingEntry} />
      <Route path={"/risk-management"} component={RiskManagement} />
      <Route path={"/risk-briefing"} component={RiskBriefing} />
      <Route path={"/risk-glossary"} component={RiskGlossary} />
      <Route path={"/admin/responsive"} component={AdminResponsive} />
      <Route path={"/admin/dev"} component={AdminDev} />
      <Route path={"/admin/analytics/themes"} component={AdminAnalyticsThemes} />
      <Route path={"/admin/settings"} component={AdminSettings} />
      <Route path={"/admin/playbook"} component={AdminPlaybook} />
      <Route path={"/login"} component={Login} />
      <Route path={"/auth/callback"} component={AuthCallback} />
      <Route path={"/cascade-demo"} component={CascadeDemo} />
      <Route path={"/copilot-mockup"} component={CopilotMockup} />
      <Route path={"/branding-mockup"} component={BrandingMockup} />
      <Route path={"/onboarding-mockup"} component={OnboardingMockup} />
      <Route path={"/onboarding"} component={Onboarding} />
      <Route path={"/privacy"} component={Privacy} />
      <Route path={"/terms"} component={Terms} />
      <Route path={"/refund"} component={Refund} />
      <Route path={"/quiz"} component={Quiz} />
      <Route path={"/site-map"} component={SiteMapPage} />
      <Route path={"/try"} component={Try} />
      <Route path={"/ask"} component={Ask} />
      {/* /join — cold-call target (renders FoundingPartners).
          /founding-partners — kept as alias so any URLs Rich has already sent
          keep working. /referral — the winery→winery invite flow (formerly
          served at /join). Route order matters: exact matches first. */}
      <Route path={"/join"} component={FoundingPartners} />
      <Route path={"/founding-partners"} component={FoundingPartners} />
      <Route path={"/referral"} component={Referral} />
      <Route path={"/call-playbook"} component={CallPlaybook} />
      <Route path={"/todo"} component={Todo} />
      <Route path={"/roadmap"} component={Todo} />
      <Route path={"/app"}><Redirect to="/free-run" /></Route>
      <Route path={"/api/oauth/callback"} component={OAuthCallback} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
    </Suspense>
    </>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

// GlobalThemeToggle removed (Feb 2026, Rich) — no more user-facing theme
// picker. Theme is now auto-switched by time of day via AutoThemeByTime.

// ── AutoThemeByTime + Weather ────────────────────────────────────────
// Rich, Feb 2026: "remove and stop asking about try parchment etc; just
// change as per the model; time of day, weather in meteor app etc". This
// mounts once at app root, computes theme by local clock, fetches weather
// via Open-Meteo (free, no API key, worldwide) and applies both as
// data-attributes on <html>. CSS in index.css responds with subtle
// accent shifts — warmer amber on clear days, cooler greys on rain, more
// contrast on storms. Refreshes every 30 min.
//
// Location strategy: browser geolocation if the visitor has already
// granted permission (never prompts), fallback to Hunter Valley (Pokolbin)
// NSW (-32.78, 151.29) as a sensible default for a wine-industry app.
function AutoThemeByTime() {
  useEffect(() => {
    // Dev-only override: if window.__ownologyThemeOverride is set to a
    // non-empty string, use it as themeId and skip both time-of-day and
    // weather auto-mapping. Set by ThemePicker (bottom-left floating pill).
    // Feb 2026, Rich —
    // added because the auto-theme was flipping erratically on his dev
    // server while iterating on component colours.
    const override = typeof window !== "undefined"
      ? ((window as unknown as { __ownologyThemeOverride?: string }).__ownologyThemeOverride ?? "")
      : "";
    // Map Open-Meteo weathercode → coarse weather bucket
    // https://open-meteo.com/en/docs — WMO weather interpretation codes
    function codeToBucket(code: number | undefined): "clear" | "cloudy" | "rain" | "storm" {
      if (code === undefined) return "clear";
      if (code === 0 || code === 1) return "clear";
      if (code === 2 || code === 3 || code === 45 || code === 48) return "cloudy";
      if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return "rain";
      if (code >= 95 && code <= 99) return "storm";
      if (code >= 71 && code <= 77) return "cloudy"; // snow → treat as heavy overcast
      return "clear";
    }

    async function fetchWeather(lat: number, lon: number): Promise<"clear" | "cloudy" | "rain" | "storm"> {
      try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=weather_code&timezone=auto`;
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) return "clear";
        const data = await res.json();
        return codeToBucket(data?.current?.weather_code);
      } catch { return "clear"; }
    }

    function getPosition(): Promise<{ lat: number; lon: number }> {
      // Fallback: Hunter Valley, Pokolbin (NSW wine region)
      const fallback = { lat: -32.78, lon: 151.29 };
      // Never PROMPT for permission — only use it if already granted.
      // This keeps landing UX friction-free per Rich's "stop asking" ask.
      if (typeof navigator === "undefined" || !navigator.permissions || !navigator.geolocation) {
        return Promise.resolve(fallback);
      }
      return navigator.permissions.query({ name: "geolocation" as PermissionName }).then((result) => {
        if (result.state !== "granted") return fallback;
        return new Promise((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
            () => resolve(fallback),
            { timeout: 3000 },
          );
        });
      }).catch(() => fallback);
    }

    async function apply() {
      const hour = new Date().getHours();
      const timeThemeId = (hour >= 20 || hour < 8) ? "soft-cellar" : "parchment";
      const themeId = override || timeThemeId;
      try {
        window.localStorage.setItem("ownology-theme", themeId);
        window.dispatchEvent(new CustomEvent("ownology:theme", { detail: themeId }));
        const root = document.documentElement;
        if (themeId === "soft-cellar") root.classList.add("dark");
        else root.classList.remove("dark");

        const { lat, lon } = await getPosition();
        const weather = await fetchWeather(lat, lon);
        root.dataset.weather = weather;
      } catch { /* ignore */ }
    }
    apply();
    const interval = setInterval(apply, 30 * 60 * 1000);
    // Listen for dev override changes so the picker's clicks apply instantly
    const handler = () => apply();
    if (typeof window !== "undefined") window.addEventListener("ownology:dev-theme-override", handler);
    return () => {
      clearInterval(interval);
      if (typeof window !== "undefined") window.removeEventListener("ownology:dev-theme-override", handler);
    };
  }, []);
  return null;
}

/** Floating theme picker — bottom-left, minimal footprint. Rich, Feb 2026:
 *  productised from the earlier dev-only picker after auto-theme kept flipping
 *  erratically for real visitors. Choices persist in localStorage so a
 *  returning visitor keeps their preferred palette. "Auto" means: fall back
 *  to time-of-day + weather-derived theme via Open-Meteo (the default).
 *
 *  Placement: bottom-left. Deliberately away from Skip intro (bottom-right of
 *  hero), the scroll chevron (bottom-centre of hero), and the nav pills
 *  (top-right). No collisions.
 */
const THEME_STORAGE_KEY = "ownology:theme-override";

function ThemePicker() {
  const [current, setCurrent] = useState<string>(() => {
    if (typeof window === "undefined") return "auto";
    try {
      const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
      if (stored) return stored;
    } catch { /* ignore */ }
    return ((window as unknown as { __ownologyThemeOverride?: string }).__ownologyThemeOverride ?? "auto");
  });
  const [open, setOpen] = useState(false);

  // On mount, hydrate window override from localStorage so the auto-theme
  // logic in AutoThemeByTime picks it up immediately (avoids a flash of the
  // weather-derived theme before user's saved preference is applied).
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
      if (stored && stored !== "auto") {
        (window as unknown as { __ownologyThemeOverride?: string }).__ownologyThemeOverride = stored;
        window.dispatchEvent(new CustomEvent("ownology:dev-theme-override"));
      }
    } catch { /* ignore */ }
  }, []);

  function set(v: string) {
    const val = v === "auto" ? "" : v;
    (window as unknown as { __ownologyThemeOverride?: string }).__ownologyThemeOverride = val;
    setCurrent(v);
    try {
      if (v === "auto") window.localStorage.removeItem(THEME_STORAGE_KEY);
      else window.localStorage.setItem(THEME_STORAGE_KEY, v);
    } catch { /* localStorage disabled — non-fatal */ }
    window.dispatchEvent(new CustomEvent("ownology:dev-theme-override"));
  }

  const themes = [
    { id: "auto", label: "Auto · time + weather" },
    { id: "parchment", label: "Parchment · day" },
    { id: "soft-cellar", label: "Soft Cellar · night" },
  ];

  return (
    <div
      data-testid="theme-picker"
      style={{
        position: "fixed",
        bottom: 20,
        left: 20,
        zIndex: 40, // below modals (50+) but above hero content
        fontFamily: "'Fira Code',monospace",
      }}
    >
      {open ? (
        <div style={{ background: "var(--ow-bg-base)", border: "1px solid var(--ow-amber)", borderRadius: 6, padding: "0.6rem", boxShadow: "0 8px 24px oklch(0 0 0 / 0.4)", minWidth: 200, backdropFilter: "blur(8px)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
            <span style={{ fontSize: "0.62rem", letterSpacing: "0.14em", color: "var(--ow-amber)", textTransform: "uppercase", fontWeight: 700 }}>Theme</span>
            <button type="button" onClick={() => setOpen(false)} style={{ background: "transparent", border: "none", color: "var(--ow-text-lo)", cursor: "pointer", fontSize: "0.85rem", lineHeight: 1 }} aria-label="Close theme picker">×</button>
          </div>
          {themes.map((t) => (
            <button
              key={t.id}
              type="button"
              data-testid={`theme-${t.id}`}
              onClick={() => set(t.id)}
              style={{
                display: "block",
                width: "100%",
                padding: "0.4rem 0.6rem",
                marginBottom: 4,
                background: current === t.id ? "var(--ow-amber)" : "transparent",
                color: current === t.id ? "oklch(0.10 0.008 60)" : "var(--ow-text-mid)",
                border: current === t.id ? "1px solid var(--ow-amber)" : "1px solid var(--ow-bg-inset)",
                borderRadius: 4,
                fontFamily: "'Fira Code',monospace",
                fontSize: "0.72rem",
                textAlign: "left",
                cursor: "pointer",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      ) : (
        <button
          type="button"
          data-testid="theme-picker-toggle"
          onClick={() => setOpen(true)}
          aria-label="Change theme"
          title="Change theme"
          style={{
            background: "color-mix(in oklch, var(--ow-bg-base) 70%, transparent)",
            color: "var(--ow-amber)",
            border: "1px solid color-mix(in oklch, var(--ow-amber) 45%, transparent)",
            borderRadius: 999,
            padding: "0.4rem 0.75rem",
            cursor: "pointer",
            fontFamily: "'Fira Code',monospace",
            fontSize: "0.62rem",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            boxShadow: "0 4px 12px oklch(0 0 0 / 0.25)",
            backdropFilter: "blur(6px)",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          {/* Palette icon — 3 dots in a triangle, no emoji per house style */}
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden="true">
            <circle cx="5.5" cy="2.5" r="1.4" fill="currentColor" />
            <circle cx="2.5" cy="7.5" r="1.4" fill="currentColor" />
            <circle cx="8.5" cy="7.5" r="1.4" fill="currentColor" />
          </svg>
          Theme
        </button>
      )}
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="dark"
        // switchable
      >
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
            <SiteFooter />
            <PwaInstallBanner />
            {/* GlobalThemeToggle removed (Feb 2026, Rich) — auto-theme via AutoThemeByTime handles this now. */}
            <UserMenu />
            {/* ThemeSuggestion removed (Feb 2026, Rich) — no more "Try Parchment for now?" prompts. */}
            {/* Floating theme picker — bottom-left, persistent, localStorage-backed.
                Productised from the earlier dev-only picker (Feb 2026, Rich). */}
            <ThemePicker />
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
