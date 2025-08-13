import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { usePropertyManagerAuth } from '@/hooks/usePropertyManagerAuth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  requirePropertyManager?: boolean;
}

export const ProtectedRoute = ({ children, requireAdmin = false, requirePropertyManager = false }: ProtectedRouteProps) => {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading, error: adminError } = useAdminAuth();
  const { isPropertyManager, loading: pmLoading, error: pmError } = usePropertyManagerAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Don't redirect while still loading
    if (authLoading) return;

    // If no user, redirect to auth with source context
    if (!user) {
      const currentPath = window.location.pathname;
      if (currentPath === '/property-manager') {
        navigate('/auth?from=property-manager', { replace: true });
      } else {
        navigate('/auth', { replace: true });
      }
      return;
    }

    // If admin required, check admin status after admin loading is complete
    if (requireAdmin && !adminLoading) {
      if (adminError || !isAdmin) {
        // Redirect non-admin users to home page
        navigate('/', { replace: true });
        return;
      }
    }

    // If property manager required, check PM status after PM loading is complete
    if (requirePropertyManager && !pmLoading) {
      if (pmError || !isPropertyManager) {
        // Redirect non-PM users to home page
        navigate('/', { replace: true });
        return;
      }
    }
  }, [user, isAdmin, isPropertyManager, authLoading, adminLoading, pmLoading, adminError, pmError, requireAdmin, requirePropertyManager, navigate]);

  // Show loading while checking authentication
  if (authLoading || (requireAdmin && adminLoading) || (requirePropertyManager && pmLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Don't render if user not authenticated
  if (!user) {
    return null;
  }

  // Don't render if admin required but user is not admin
  if (requireAdmin && (adminError || !isAdmin)) {
    return null;
  }

  // Don't render if property manager required but user is not property manager
  if (requirePropertyManager && (pmError || !isPropertyManager)) {
    return null;
  }

  return <>{children}</>;
};