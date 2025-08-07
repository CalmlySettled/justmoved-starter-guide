import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAdminAuth } from '@/hooks/useAdminAuth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export const ProtectedRoute = ({ children, requireAdmin = false }: ProtectedRouteProps) => {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading, error } = useAdminAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Don't redirect while still loading
    if (authLoading) return;

    // If no user, redirect to auth
    if (!user) {
      navigate('/auth', { replace: true });
      return;
    }

    // If admin required, check admin status after admin loading is complete
    if (requireAdmin && !adminLoading) {
      if (error || !isAdmin) {
        // Redirect non-admin users to home page
        navigate('/', { replace: true });
        return;
      }
    }
  }, [user, isAdmin, authLoading, adminLoading, error, requireAdmin, navigate]);

  // Show loading while checking authentication
  if (authLoading || (requireAdmin && adminLoading)) {
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
  if (requireAdmin && (error || !isAdmin)) {
    return null;
  }

  return <>{children}</>;
};