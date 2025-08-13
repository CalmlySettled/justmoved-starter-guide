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
      console.log('🔍 PropertyManager Auth - Starting check:', { user: !!user, authLoading });
      
      if (authLoading) {
        console.log('🔍 PropertyManager Auth - Auth still loading, waiting...');
        return;
      }
      
      if (!user) {
        console.log('🔍 PropertyManager Auth - No user, setting false');
        setIsPropertyManager(false);
        setLoading(false);
        return;
      }

      try {
        console.log('🔍 PropertyManager Auth - Checking role for user:', user.id);
        setLoading(true);
        setError(null);

        const { data, error: rpcError } = await supabase.rpc('has_role', {
          _user_id: user.id,
          _role: 'property_manager'
        });

        console.log('🔍 PropertyManager Auth - RPC result:', { data, error: rpcError });

        if (rpcError) {
          console.error('❌ PropertyManager Auth - RPC Error:', rpcError);
          setError('Failed to verify role');
          setIsPropertyManager(false);
        } else {
          const isManager = data || false;
          console.log('✅ PropertyManager Auth - Setting property manager status:', isManager);
          setIsPropertyManager(isManager);
        }
      } catch (err) {
        console.error('❌ PropertyManager Auth - Exception:', err);
        setError('Failed to verify role');
        setIsPropertyManager(false);
      } finally {
        setLoading(false);
        console.log('🔍 PropertyManager Auth - Check complete');
      }
    };

    checkPropertyManagerRole();
  }, [user, authLoading]);

  return { isPropertyManager, loading, error };
};