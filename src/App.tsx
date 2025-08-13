import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
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
import Sitemap from "./pages/Sitemap";
import AdminDashboard from "./pages/AdminDashboard";
import Analytics from "./pages/Analytics";
import PropertyManager from "./pages/PropertyManager";
import PropertyManagerContact from "./pages/PropertyManagerContact";
import PropertyManagerInquiries from "./pages/PropertyManagerInquiries";
import TenantWelcome from "./pages/TenantWelcome";
import { AnalyticsProvider } from "@/components/AnalyticsProvider";
import { MicroSurveyProvider } from "@/components/MicroSurveyProvider";
import { ProtectedRoute } from "@/components/ProtectedRoute";

const queryClient = new QueryClient();

const AppContent = () => {
  useSessionTimeout();
  
  return (
    <BrowserRouter>
      <ScrollToTop />
      <MicroSurveyProvider>
        <AnalyticsProvider>
        <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/about" element={<AboutUs />} />
            <Route path="/explore" element={<Explore />} />
            <Route path="/popular" element={<Popular />} />
            <Route path="/popular/:category" element={<PopularCategory />} />
            <Route path="/events" element={<Events />} />
            <Route path="/property-manager" element={
              <ProtectedRoute requirePropertyManager={true}>
                <PropertyManager />
              </ProtectedRoute>
            } />
            <Route path="/property-managers" element={<Navigate to="/property-manager" replace />} />
            <Route path="/property-manager-contact" element={<PropertyManagerContact />} />
            <Route path="/welcome/:token" element={<TenantWelcome />} />
            <Route path="/favorites" element={<Favorites />} />
            <Route path="/features" element={<Features />} />
            <Route path="/how-it-works" element={<HowItWorks />} />
            <Route path="/faq" element={<FAQ />} />
            
            <Route path="/auth" element={<Auth />} />
            <Route path="/auth/confirm" element={<Auth />} />
            
            {/* Redirect old Google search results */}
            <Route path="/onboarding" element={<Navigate to="/explore" replace />} />
            
            <Route path="/profile" element={<Profile />} />
            
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/admin/ai-dashboard" element={
              <ProtectedRoute requireAdmin={true}>
                <AdminDashboard />
              </ProtectedRoute>
            } />
            <Route path="/admin/property-inquiries" element={
              <ProtectedRoute requireAdmin={true}>
                <PropertyManagerInquiries />
              </ProtectedRoute>
            } />
            <Route path="/admin/analytics" element={
              <ProtectedRoute requireAdmin={true}>
                <Analytics />
              </ProtectedRoute>
            } />
            <Route path="/sitemap.xml" element={<Sitemap />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
        </Routes>
        </AnalyticsProvider>
      </MicroSurveyProvider>
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
