import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';

export interface AdminAuthState {
  isAdmin: boolean;
  loading: boolean;
  error: string | null;
}

export const useAdminAuth = (): AdminAuthState => {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkAdminStatus = async () => {
      console.log('🔍 Checking admin status for user:', user?.id);
      
      if (!user) {
        console.log('❌ No user found, setting isAdmin to false');
        setIsAdmin(false);
        setLoading(false);
        setError(null);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        console.log('🔄 Calling has_role function...');

        // Call the database function to check if user has admin role
        const { data, error } = await supabase.rpc('has_role', {
          _user_id: user.id,
          _role: 'admin'
        });

        console.log('📊 has_role response:', { data, error });

        if (error) {
          console.error('❌ Admin check error:', error);
          setError('Failed to verify admin privileges');
          setIsAdmin(false);
        } else {
          const isAdminResult = data || false;
          console.log('✅ Admin check result:', isAdminResult);
          setIsAdmin(isAdminResult);
        }
      } catch (err) {
        console.error('💥 Unexpected admin check error:', err);
        setError('Unexpected error checking admin privileges');
        setIsAdmin(false);
      } finally {
        setLoading(false);
        console.log('🏁 Admin check completed');
      }
    };

    checkAdminStatus();
  }, [user]);

  return { isAdmin, loading, error };
};