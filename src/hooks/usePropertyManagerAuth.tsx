import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface PropertyManagerAuthState {
  isPropertyManager: boolean;
  loading: boolean;
  error: string | null;
}

export const usePropertyManagerAuth = (): PropertyManagerAuthState => {
  const { user, loading: authLoading } = useAuth();
  const [isPropertyManager, setIsPropertyManager] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkPropertyManagerRole = async () => {
      if (authLoading) return;
      
      if (!user) {
        setIsPropertyManager(false);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const { data, error: rpcError } = await supabase.rpc('has_role', {
          _user_id: user.id,
          _role: 'property_manager'
        });

        if (rpcError) {
          console.error('Error checking property manager role:', rpcError);
          setError('Failed to verify role');
          setIsPropertyManager(false);
        } else {
          setIsPropertyManager(data || false);
        }
      } catch (err) {
        console.error('Error in role check:', err);
        setError('Failed to verify role');
        setIsPropertyManager(false);
      } finally {
        setLoading(false);
      }
    };

    checkPropertyManagerRole();
  }, [user, authLoading]);

  return { isPropertyManager, loading, error };
};