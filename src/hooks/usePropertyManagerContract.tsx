import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface PropertyManagerContractState {
  isPropertyManager: boolean;
  loading: boolean;
  error: string | null;
}

export const usePropertyManagerContract = (): PropertyManagerContractState => {
  const { user, loading: authLoading } = useAuth();
  const [isPropertyManager, setIsPropertyManager] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkPropertyManagerContract = async () => {
      console.log('🔍 PM Contract - Starting check:', { user: !!user, authLoading });
      
      if (authLoading) {
        console.log('🔍 PM Contract - Auth still loading, waiting...');
        return;
      }
      
      if (!user) {
        console.log('🔍 PM Contract - No user, setting false');
        setIsPropertyManager(false);
        setLoading(false);
        return;
      }

      try {
        console.log('🔍 PM Contract - Checking role and contract for user:', user.id);
        setLoading(true);
        setError(null);

        const { data, error: queryError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'property_manager')
          .single();

        console.log('🔍 PM Contract - Query result:', { data, error: queryError });

        if (queryError) {
          if (queryError.code === 'PGRST116') {
            // No rows found - user is not a property manager
            console.log('✅ PM Contract - User is not a property manager');
            setIsPropertyManager(false);
          } else {
            console.error('❌ PM Contract - Query Error:', queryError);
            setError('Failed to verify role');
            setIsPropertyManager(false);
          }
        } else {
          console.log('✅ PM Contract - User is a property manager');
          setIsPropertyManager(true);
        }
      } catch (err) {
        console.error('❌ PM Contract - Exception:', err);
        setError('Failed to verify role');
        setIsPropertyManager(false);
      } finally {
        setLoading(false);
        console.log('🔍 PM Contract - Check complete');
      }
    };

    checkPropertyManagerContract();
  }, [user, authLoading]);

  return { isPropertyManager, loading, error };
};