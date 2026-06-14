import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, Redirect } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import WhyOwnology from "./pages/WhyOwnology";
import ForInnoVintUsers from "./pages/ForInnoVintUsers";
import ForVintraceUsers from "./pages/ForVintraceUsers";
import Blog from "./pages/Blog";
import BlogArticle from "./pages/BlogArticle";
import Regulations from "./pages/Regulations";
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
import HomeWinemakerTroubleshooting from "./pages/HomeWinemakerTroubleshooting";
import HomeWinemakerGlossary from "./pages/HomeWinemakerGlossary";
import CompetitiveAdvantage from "./pages/CompetitiveAdvantage";
import Preview from "./pages/Preview";
import AdminLeads from "./pages/AdminLeads";
import AdminComplianceDoctrine from "./pages/AdminComplianceDoctrine";
import FoundingMemberSuccess from "./pages/FoundingMemberSuccess";
import OAuthCallback from "./pages/OAuthCallback";
import ProductionDashboard from "./pages/ProductionDashboard";
import BuildIndex from "./pages/BuildIndex";
import Vineyard from "./pages/Vineyard";
import PwaInstallBanner from "./components/PwaInstallBanner";


function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/home"} component={Home} />
      <Route path={"/why-ownology"} component={WhyOwnology} />
      <Route path={"/for-innovint-users"} component={ForInnoVintUsers} />
      <Route path={"/for-vintrace-users"} component={ForVintraceUsers} />
      <Route path={"/for-home-winemakers"} component={ForHomeWinemakers} />
      <Route path={"/for-home-winemakers/troubleshooting"} component={HomeWinemakerTroubleshooting} />
      <Route path={"/for-home-winemakers/glossary"} component={HomeWinemakerGlossary} />
      <Route path={"/blog"} component={Blog} />
      <Route path={"/blog/:slug"} component={BlogArticle} />
      <Route path={"/regulations"} component={Regulations} />
      <Route path={"/resources"} component={Regulations} />
      <Route path={"/resources/home-winery-kit"} component={HomeWineryKit} />
      <Route path={"/compliance"} component={Compliance} />
      <Route path={"/free-run"} component={FreeRun} />
      <Route path={"/the-press"} component={ThePress} />
      <Route path={"/pricing"} component={Pricing} />
      <Route path={"/merch/success"} component={MerchSuccess} />
      <Route path={"/merch/cancel"} component={MerchCancel} />
      <Route path={"/merch"} component={Merch} />
      <Route path={"/campaign-metrics"} component={CampaignMetrics} />
      <Route path={"/orders"} component={Orders} />
      <Route path={"/admin"} component={Admin} />
      <Route path={"/quick-entry"} component={QuickEntry} />
      <Route path={"/cellar-tasks"} component={CellarTasks} />
      <Route path={"/competitive-advantage"} component={CompetitiveAdvantage} />
      <Route path={"/preview"} component={Preview} />
      <Route path={"/admin/leads"} component={AdminLeads} />
      <Route path={"/admin/compliance-doctrine"} component={AdminComplianceDoctrine} />
      <Route path={"/founding-member/success"} component={FoundingMemberSuccess} />
      <Route path={"/dashboard"} component={ProductionDashboard} />
      <Route path={"/vineyard"} component={Vineyard} />
      <Route path={"/build-index"} component={BuildIndex} />
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
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
