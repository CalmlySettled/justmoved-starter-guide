import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { useSessionTimeout } from "@/hooks/useSessionTimeout";
import { useAuth } from "@/hooks/useAuth";
import { usePropertyManagerAuth } from "@/hooks/usePropertyManagerAuth";
import { useEffect } from "react";
import ScrollToTop from "@/components/ScrollToTop";
import { MicroSurveyProvider } from "@/components/MicroSurveyProvider";
import { AnalyticsProvider } from "@/components/AnalyticsProvider";

// Pages
import Index from "@/pages/Index";
import Auth from "@/pages/Auth";
import Profile from "@/pages/Profile";
import Explore from "@/pages/Explore";
import Popular from "@/pages/Popular";
import PopularCategory from "@/pages/PopularCategory";
import Favorites from "@/pages/Favorites";
import PropertyManagerLanding from "@/pages/PropertyManagerLanding";
import PropertyManager from "@/pages/PropertyManager";
import PropertyManagerContact from "@/pages/PropertyManagerContact";
import PropertyManagerInquiries from "@/pages/PropertyManagerInquiries";
import TenantWelcome from "@/pages/TenantWelcome";
import AdminDashboard from "@/pages/AdminDashboard";
import Analytics from "@/pages/Analytics";
import VerifyEmail from "@/pages/VerifyEmail";
import ResetPassword from "@/pages/ResetPassword";
import AboutUs from "@/pages/AboutUs";
import FAQ from "@/pages/FAQ";
import Features from "@/pages/Features";
import HowItWorks from "@/pages/HowItWorks";
import Sitemap from "@/pages/Sitemap";
import Events from "@/pages/Events";
import NotFound from "@/pages/NotFound";

import { ProtectedRoute } from "@/components/ProtectedRoute";

const queryClient = new QueryClient();

function PropertyManagerRedirectGuard({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { isPropertyManager, loading } = usePropertyManagerAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user && isPropertyManager) {
      const currentPath = window.location.pathname;
      const pmRoutes = ['/property-manager', '/property-manager/dashboard'];
      
      // If PM is on a regular user route, redirect them to their dashboard
      if (!pmRoutes.includes(currentPath) && !currentPath.startsWith('/property-manager/') && 
          !currentPath.startsWith('/auth') && !currentPath.startsWith('/verify-email') && 
          !currentPath.startsWith('/reset-password')) {
        console.log('🚫 Property Manager trying to access regular user route, redirecting to dashboard');
        navigate('/property-manager/dashboard', { replace: true });
      }
    }
  }, [user, isPropertyManager, loading, navigate]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>;
  }

  return <>{children}</>;
}

const AppContent = () => {
  useSessionTimeout();
  
  return (
    <BrowserRouter>
      <ScrollToTop />
      <PropertyManagerRedirectGuard>
        <MicroSurveyProvider>
          <AnalyticsProvider>
          <Routes>
              {/* Public routes */}
              <Route path="/" element={<ProtectedRoute requireRegularUser><Index /></ProtectedRoute>} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/verify-email" element={<VerifyEmail />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/property-manager" element={<PropertyManagerLanding />} />
              <Route path="/property-manager/contact" element={<PropertyManagerContact />} />
              <Route path="/about" element={<AboutUs />} />
              <Route path="/faq" element={<FAQ />} />
              <Route path="/features" element={<Features />} />
              <Route path="/how-it-works" element={<HowItWorks />} />
              <Route path="/sitemap" element={<Sitemap />} />

              {/* Regular user routes - blocked for Property Managers */}
              <Route path="/profile" element={<ProtectedRoute requireRegularUser><Profile /></ProtectedRoute>} />
              <Route path="/explore" element={<ProtectedRoute requireRegularUser><Explore /></ProtectedRoute>} />
              <Route path="/popular" element={<ProtectedRoute requireRegularUser><Popular /></ProtectedRoute>} />
              <Route path="/popular/:category" element={<ProtectedRoute requireRegularUser><PopularCategory /></ProtectedRoute>} />
              <Route path="/favorites" element={<ProtectedRoute requireRegularUser><Favorites /></ProtectedRoute>} />
              <Route path="/events" element={<ProtectedRoute requireRegularUser><Events /></ProtectedRoute>} />

              {/* Property manager routes */}
              <Route path="/property-manager/dashboard" element={<ProtectedRoute requirePropertyManager><PropertyManager /></ProtectedRoute>} />

              {/* Tenant routes */}
              <Route path="/tenant-welcome" element={<TenantWelcome />} />

              {/* Admin routes */}
              <Route path="/admin" element={<ProtectedRoute requireAdmin><AdminDashboard /></ProtectedRoute>} />
              <Route path="/admin/property-manager-inquiries" element={<ProtectedRoute requireAdmin><PropertyManagerInquiries /></ProtectedRoute>} />
              <Route path="/admin/analytics" element={<ProtectedRoute requireAdmin><Analytics /></ProtectedRoute>} />
              
              {/* Legacy redirects */}
              <Route path="/property-managers" element={<Navigate to="/property-manager" replace />} />
              <Route path="/property-manager-contact" element={<Navigate to="/property-manager/contact" replace />} />
              <Route path="/welcome/:token" element={<Navigate to="/tenant-welcome" replace />} />
              <Route path="/onboarding" element={<Navigate to="/explore" replace />} />
              <Route path="/admin/ai-dashboard" element={<Navigate to="/admin" replace />} />
              <Route path="/admin/property-inquiries" element={<Navigate to="/admin/property-manager-inquiries" replace />} />
              
              {/* Catch all */}
              <Route path="*" element={<NotFound />} />
          </Routes>
          </AnalyticsProvider>
        </MicroSurveyProvider>
      </PropertyManagerRedirectGuard>
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