import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { useSessionTimeout } from "@/hooks/useSessionTimeout";
import ScrollToTop from "@/components/ScrollToTop";
import Index from "./pages/Index";
import AboutUs from "./pages/AboutUs";

import Auth from "./pages/Auth";
import VerifyEmail from "./pages/VerifyEmail";
import NotFound from "./pages/NotFound";
import Features from "./pages/Features";
import HowItWorks from "./pages/HowItWorks";
import FAQ from "./pages/FAQ";
import Explore from "./pages/Explore";
import Popular from "./pages/Popular";
import Events from "./pages/Events";
import Favorites from "./pages/Favorites";
import Profile from "./pages/Profile";

import PopularCategory from "./pages/PopularCategory";
import ResetPassword from "./pages/ResetPassword";
import AdminDashboard from "./pages/AdminDashboard";
import Analytics from "./pages/Analytics";
import { AnalyticsProvider } from "@/components/AnalyticsProvider";
import { ProtectedRoute } from "@/components/ProtectedRoute";

const queryClient = new QueryClient();

const AppContent = () => {
  useSessionTimeout();
  
  return (
    <BrowserRouter>
      <ScrollToTop />
      <AnalyticsProvider>
        <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/about" element={<AboutUs />} />
            <Route path="/explore" element={<Explore />} />
            <Route path="/popular" element={<Popular />} />
            <Route path="/popular/:category" element={<PopularCategory />} />
            <Route path="/events" element={<Events />} />
            <Route path="/favorites" element={<Favorites />} />
            <Route path="/features" element={<Features />} />
            <Route path="/how-it-works" element={<HowItWorks />} />
            <Route path="/faq" element={<FAQ />} />
            
            <Route path="/auth" element={<Auth />} />
            <Route path="/auth/confirm" element={<Auth />} />
            
            <Route path="/profile" element={<Profile />} />
            
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/admin/ai-dashboard" element={
              <ProtectedRoute requireAdmin={true}>
                <AdminDashboard />
              </ProtectedRoute>
            } />
            <Route path="/admin/analytics" element={
              <ProtectedRoute requireAdmin={true}>
                <Analytics />
              </ProtectedRoute>
            } />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
        </Routes>
      </AnalyticsProvider>
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
