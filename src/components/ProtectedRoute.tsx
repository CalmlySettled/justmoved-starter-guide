import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { usePropertyManagerAuth } from '@/hooks/usePropertyManagerAuth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  requirePropertyManager?: boolean;
  requireRegularUser?: boolean;
}

export const ProtectedRoute = ({ children, requireAdmin = false, requirePropertyManager = false, requireRegularUser = false }: ProtectedRouteProps) => {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading, error: adminError } = useAdminAuth();
  const { isPropertyManager, loading: pmLoading, error: pmError } = usePropertyManagerAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const currentPath = window.location.pathname;
    console.log('🛡️ ProtectedRoute - Check:', { 
      currentPath,
      user: !!user, 
      authLoading, 
      requireAdmin, 
      requirePropertyManager,
      requireRegularUser,
      isAdmin,
      isPropertyManager,
      adminLoading,
      pmLoading,
      adminError,
      pmError
    });

    // Don't redirect while still loading
    if (authLoading) {
      console.log('🛡️ ProtectedRoute - Auth loading, waiting...');
      return;
    }

    // If no user, redirect to auth with source context
    if (!user) {
      console.log('🛡️ ProtectedRoute - No user, redirecting to auth');
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
        console.log('🛡️ ProtectedRoute - Admin required but user not admin, redirecting home');
        navigate('/', { replace: true });
        return;
      }
    }

    // If property manager required, check PM status after PM loading is complete
    if (requirePropertyManager && !pmLoading) {
      if (pmError || !isPropertyManager) {
        console.log('🛡️ ProtectedRoute - Property manager required but user not PM:', { pmError, isPropertyManager });
        console.log('🛡️ ProtectedRoute - Redirecting to home');
        navigate('/', { replace: true });
        return;
      } else {
        console.log('✅ ProtectedRoute - Property manager verified, allowing access');
      }
    }

    // If regular user required, check user is NOT a property manager
    if (requireRegularUser && !pmLoading) {
      if (isPropertyManager) {
        console.log('🛡️ ProtectedRoute - Regular user required but user is PM, redirecting to PM dashboard');
        navigate('/property-manager/dashboard', { replace: true });
        return;
      }
    }
  }, [user, isAdmin, isPropertyManager, authLoading, adminLoading, pmLoading, adminError, pmError, requireAdmin, requirePropertyManager, requireRegularUser, navigate]);

  // Show loading while checking authentication
  if (authLoading || (requireAdmin && adminLoading) || (requirePropertyManager && pmLoading) || (requireRegularUser && pmLoading)) {
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

  // Don't render if regular user required but user is property manager
  if (requireRegularUser && isPropertyManager) {
    return null;
  }

  return <>{children}</>;
};