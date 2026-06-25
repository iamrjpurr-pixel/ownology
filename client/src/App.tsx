import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, Redirect, useLocation } from "wouter";
import { useEffect } from "react";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import ThemeToggle from "@/components/ThemeToggle";
import Home from "./pages/Home";
import WhyOwnology from "./pages/WhyOwnology";
import ForInnoVintUsers from "./pages/ForInnoVintUsers";
import ForVintraceUsers from "./pages/ForVintraceUsers";
import Blog from "./pages/Blog";
import BlogArticle from "./pages/BlogArticle";
import Regulations from "./pages/Regulations";
import RegulatoryLinks from "./pages/RegulatoryLinks";
import Compliance from "./pages/Compliance";
import FreeRun from "./pages/FreeRun";
import ThePress from "./pages/ThePress";
import Pricing from "./pages/Pricing";
import Merch from "./pages/Merch";
import MerchSuccess from "./pages/MerchSuccess";
import MerchCancel from "./pages/MerchCancel";
import CampaignMetrics from "./pages/CampaignMetrics";
import Orders from "./pages/Orders";
import Admin from "./pages/Admin";
import QuickEntry from "./pages/QuickEntry";
import CellarTasks from "./pages/CellarTasks";
import HomeWineryKit from "./pages/HomeWineryKit";
import ForHomeWinemakers from "./pages/ForHomeWinemakers";
import DIYKnowledge from "./pages/DIYKnowledge";
import HomeWinemakerTroubleshooting from "./pages/HomeWinemakerTroubleshooting";
import HomeWinemakerGlossary from "./pages/HomeWinemakerGlossary";
import CompetitiveAdvantage from "./pages/CompetitiveAdvantage";
import Preview from "./pages/Preview";
import AdminLeads from "./pages/AdminLeads";
import AdminComplianceDoctrine from "./pages/AdminComplianceDoctrine";
import AdminVintageIntelligence from "./pages/AdminVintageIntelligence";
import AdminWbs from "./pages/AdminWbs";
import AdminTrinity from "./pages/AdminTrinity";
import FoundingMemberSuccess from "./pages/FoundingMemberSuccess";
import OAuthCallback from "./pages/OAuthCallback";
import ProductionDashboard from "./pages/ProductionDashboard";
import BuildIndex from "./pages/BuildIndex";
import Vineyard from "./pages/Vineyard";
import PwaInstallBanner from "./components/PwaInstallBanner";
import Knowledge from "./pages/Knowledge";
import Guide from "./pages/Guide";
import Import from "./pages/Import";
import Waitlist from "./pages/Waitlist";
import VineReference from "./pages/VineReference";
import Resume from "./pages/Resume";
import WorkModeLayout from "@/components/WorkModeLayout";


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
    <WorkModeLayout title="Dashboard" activeTab="more">
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
function KnowledgePage() {
  return (
    <WorkModeLayout title="Knowledge">
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
      <Route path={"/founding-member/success"} component={FoundingMemberSuccess} />
      <Route path={"/dashboard"} component={DashboardPage} />
      <Route path={"/vineyard"} component={Vineyard} />
      <Route path={"/build-index"} component={BuildIndex} />
      <Route path={"/knowledge"} component={KnowledgePage} />
      <Route path={"/knowledge/*"} component={KnowledgePage} />
      <Route path={"/guide"} component={Guide} />
      <Route path={"/import"} component={ImportPage} />
      <Route path={"/waitlist"} component={Waitlist} />
      <Route path={"/reference/vine"} component={VineReference} />
      <Route path={"/resume"} component={Resume} />
      <Route path={"/app"}><Redirect to="/free-run" /></Route>
      <Route path={"/api/oauth/callback"} component={OAuthCallback} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
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
