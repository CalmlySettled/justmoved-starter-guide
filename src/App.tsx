import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { useSessionTimeout } from "@/hooks/useSessionTimeout";
import Index from "./pages/Index";
import OnboardingQuiz from "./pages/OnboardingQuiz";
import Recommendations from "./pages/Recommendations";
import Dashboard from "./pages/Dashboard";
import Auth from "./pages/Auth";
import VerifyEmail from "./pages/VerifyEmail";
import NotFound from "./pages/NotFound";
import Features from "./pages/Features";
import HowItWorks from "./pages/HowItWorks";
import FAQ from "./pages/FAQ";
import Explore from "./pages/Explore";
import Popular from "./pages/Popular";
import Favorites from "./pages/Favorites";
import Profile from "./pages/Profile";
import AccountSettings from "./pages/AccountSettings";
import PopularCategory from "./pages/PopularCategory";
import ResetPassword from "./pages/ResetPassword";

const queryClient = new QueryClient();

const AppContent = () => {
  useSessionTimeout();
  
  return (
    <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/explore" element={<Explore />} />
            <Route path="/popular" element={<Popular />} />
            <Route path="/popular/:category" element={<PopularCategory />} />
            <Route path="/favorites" element={<Favorites />} />
            <Route path="/features" element={<Features />} />
            <Route path="/how-it-works" element={<HowItWorks />} />
            <Route path="/faq" element={<FAQ />} />
            <Route path="/onboarding" element={<OnboardingQuiz />} />
            <Route path="/recommendations" element={<Recommendations />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/auth/confirm" element={<Auth />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/account-settings" element={<AccountSettings />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AppContent />
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
