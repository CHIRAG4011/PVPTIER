import { Switch, Route } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth";
import { SiteSettingsProvider } from "@/lib/site-settings";

import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Leaderboard from "@/pages/leaderboard";
import PlayerProfile from "@/pages/player-profile";
import Login from "@/pages/login";
import Register from "@/pages/register";
import SubmitMatch from "@/pages/submit";
import CreateMatch from "@/pages/create-match";
import MyChallenges from "@/pages/my-challenges";
import Tickets from "@/pages/tickets";
import TicketDetail from "@/pages/ticket-detail";
import Announcements from "@/pages/announcements";
import Settings from "@/pages/settings";
import ForgotPassword from "@/pages/forgot-password";
import ResetPassword from "@/pages/reset-password";
import OAuthCallback from "@/pages/oauth-callback";

// Admin
import AdminDashboard from "@/pages/admin/dashboard";
import AdminUsers from "@/pages/admin/users";
import AdminPlayers from "@/pages/admin/players";
import AdminSubmissions from "@/pages/admin/submissions";
import AdminTickets from "@/pages/admin/tickets";
import AdminSeasons from "@/pages/admin/seasons";
import AdminAnnouncements from "@/pages/admin/announcements";
import AdminLogs from "@/pages/admin/logs";
import AdminSettings from "@/pages/admin/settings";
import AdminRoles from "@/pages/admin/roles";
import AdminMatches from "@/pages/admin/matches";
import AdminTierTests from "@/pages/admin/tiertests";
import TierTest from "@/pages/tier-test";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/leaderboard" component={Leaderboard} />
      <Route path="/player/:id" component={PlayerProfile} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/submit" component={SubmitMatch} />
      <Route path="/create-match" component={CreateMatch} />
      <Route path="/my-challenges" component={MyChallenges} />
      <Route path="/tickets" component={Tickets} />
      <Route path="/tickets/:id" component={TicketDetail} />
      <Route path="/announcements" component={Announcements} />
      <Route path="/settings" component={Settings} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route path="/oauth/callback" component={OAuthCallback} />

      <Route path="/admin" component={AdminDashboard} />
      <Route path="/admin/users" component={AdminUsers} />
      <Route path="/admin/players" component={AdminPlayers} />
      <Route path="/admin/submissions" component={AdminSubmissions} />
      <Route path="/admin/tickets" component={AdminTickets} />
      <Route path="/admin/seasons" component={AdminSeasons} />
      <Route path="/admin/announcements" component={AdminAnnouncements} />
      <Route path="/admin/logs" component={AdminLogs} />
      <Route path="/admin/settings" component={AdminSettings} />
      <Route path="/admin/roles" component={AdminRoles} />
      <Route path="/admin/matches" component={AdminMatches} />
      <Route path="/admin/tier-tests" component={AdminTierTests} />

      <Route path="/tier-test" component={TierTest} />

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SiteSettingsProvider>
          <TooltipProvider>
            <Router />
            <Toaster />
          </TooltipProvider>
        </SiteSettingsProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
