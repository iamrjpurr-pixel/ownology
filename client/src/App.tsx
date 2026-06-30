import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, Redirect, useLocation } from "wouter";
import { lazy, Suspense, useEffect } from "react";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import ThemeToggle from "@/components/ThemeToggle";
import ThemeOnboarding from "@/components/ThemeOnboarding";
import CrushCascade from "@/components/CrushCascade";

// ── EAGER: first-paint-critical + cellar-floor PWA tabs ───────────────────
// Loaded synchronously so the most-trafficked routes render with zero
// network round-trip after the JS shell arrives. Everything else lives
// behind React.lazy() so a winemaker on rural 3G doesn't pay for code
// they may never touch.
import Home from "./pages/Home";
import FreeRun from "./pages/FreeRun";
import ThePress from "./pages/ThePress";
import QuickEntry from "./pages/QuickEntry";
import CellarTasks from "./pages/CellarTasks";
import Today from "./pages/Today";
import Pricing from "./pages/Pricing";
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
const Demo = lazy(() => import("./pages/Demo"));
const Waitlist = lazy(() => import("./pages/Waitlist"));
const VineReference = lazy(() => import("./pages/VineReference"));
const Resume = lazy(() => import("./pages/Resume"));
const Stats = lazy(() => import("./pages/Stats"));
const TankQr = lazy(() => import("./pages/TankQr"));
const VintageCompare = lazy(() => import("./pages/VintageCompare"));
const HiContact = lazy(() => import("./pages/HiContact"));
const AdminContacts = lazy(() => import("./pages/AdminContacts"));
const AdminContactsPipeline = lazy(() => import("./pages/AdminContactsPipeline"));
const AdminMarketingKit = lazy(() => import("./pages/AdminMarketingKit"));
const AdminThemesStats = lazy(() => import("./pages/AdminThemesStats"));
const CascadeDemo = lazy(() => import("./pages/CascadeDemo"));
const CopilotMockup = lazy(() => import("./pages/CopilotMockup"));
const BrandingMockup = lazy(() => import("./pages/BrandingMockup"));
const AdminResponsive = lazy(() => import("./pages/AdminResponsive"));

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
  return (
    <>
    <ThemeOnboarding />
    <CrushCascade />
    <Suspense fallback={<PageLoading />}>
    <Switch>
      <Route path={"/"} component={MobileHomeRoute} />
      <Route path={"/home"} component={Home} />
      <Route path={"/why-ownology"} component={WhyOwnology} />
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
      <Route path={"/free-run"} component={FreeRunPage} />
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
      <Route path={"/demo"} component={Demo} />
      <Route path={"/waitlist"} component={Waitlist} />
      <Route path={"/reference/vine"} component={VineReference} />
      <Route path={"/resume"} component={Resume} />
      <Route path={"/stats"} component={Stats} />
      <Route path={"/tank-qr"} component={TankQr} />
      <Route path={"/the-press/compare"} component={VintageCompare} />
      <Route path={"/hi/:slug"} component={HiContact} />
      <Route path={"/admin/contacts/pipeline"} component={AdminContactsPipeline} />
      <Route path={"/admin/contacts"} component={AdminContacts} />
      <Route path={"/admin/marketing-kit"} component={AdminMarketingKit} />
      <Route path={"/admin/themes-stats"} component={AdminThemesStats} />
      <Route path={"/admin/responsive"} component={AdminResponsive} />
      <Route path={"/cascade-demo"} component={CascadeDemo} />
      <Route path={"/copilot-mockup"} component={CopilotMockup} />
      <Route path={"/branding-mockup"} component={BrandingMockup} />
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

/** GlobalThemeToggle — fixed bottom-right button visible on every page */
function GlobalThemeToggle() {
  return (
    <div
      style={{
        position: "fixed",
        bottom: "calc(1.25rem + env(safe-area-inset-bottom, 0px))",
        right: "1.25rem",
        zIndex: 9999,
        // Avoid overlapping the PWA install banner or mobile bottom tab bar
      }}
    >
      <ThemeToggle compact={false} />
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
        <TooltipProvider>
          <Toaster />
          <Router />
          <PwaInstallBanner />
          <GlobalThemeToggle />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
