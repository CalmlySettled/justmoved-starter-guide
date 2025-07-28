import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import OnboardingQuiz from "./pages/OnboardingQuiz";
import Recommendations from "./pages/Recommendations";
import Dashboard from "./pages/Dashboard";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import Features from "./pages/Features";
import HowItWorks from "./pages/HowItWorks";
import FAQ from "./pages/FAQ";
import Explore from "./pages/Explore";
import Favorites from "./pages/Favorites";
import Profile from "./pages/Profile";
import AccountSettings from "./pages/AccountSettings";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/explore" element={<Explore />} />
            <Route path="/favorites" element={<Favorites />} />
            <Route path="/features" element={<Features />} />
            <Route path="/how-it-works" element={<HowItWorks />} />
            <Route path="/faq" element={<FAQ />} />
            <Route path="/onboarding" element={<OnboardingQuiz />} />
            <Route path="/recommendations" element={<Recommendations />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/account-settings" element={<AccountSettings />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
