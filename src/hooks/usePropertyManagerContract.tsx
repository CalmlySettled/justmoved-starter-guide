import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface PropertyManagerContractState {
  isPropertyManager: boolean;
  contractStatus: 'pending' | 'active' | 'suspended' | null;
  loading: boolean;
  error: string | null;
}

export const usePropertyManagerContract = (): PropertyManagerContractState => {
  const { user, loading: authLoading } = useAuth();
  const [isPropertyManager, setIsPropertyManager] = useState(false);
  const [contractStatus, setContractStatus] = useState<'pending' | 'active' | 'suspended' | null>(null);
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
        setContractStatus(null);
        setLoading(false);
        return;
      }

      try {
        console.log('🔍 PM Contract - Checking role and contract for user:', user.id);
        setLoading(true);
        setError(null);

        const { data, error: queryError } = await supabase
          .from('user_roles')
          .select('role, contract_status')
          .eq('user_id', user.id)
          .eq('role', 'property_manager')
          .single();

        console.log('🔍 PM Contract - Query result:', { data, error: queryError });

        if (queryError) {
          if (queryError.code === 'PGRST116') {
            // No rows found - user is not a property manager
            console.log('✅ PM Contract - User is not a property manager');
            setIsPropertyManager(false);
            setContractStatus(null);
          } else {
            console.error('❌ PM Contract - Query Error:', queryError);
            setError('Failed to verify role');
            setIsPropertyManager(false);
            setContractStatus(null);
          }
        } else {
          console.log('✅ PM Contract - Setting property manager status:', data);
          setIsPropertyManager(true);
          setContractStatus(data.contract_status as 'pending' | 'active' | 'suspended');
        }
      } catch (err) {
        console.error('❌ PM Contract - Exception:', err);
        setError('Failed to verify role');
        setIsPropertyManager(false);
        setContractStatus(null);
      } finally {
        setLoading(false);
        console.log('🔍 PM Contract - Check complete');
      }
    };

    checkPropertyManagerContract();
  }, [user, authLoading]);

  return { isPropertyManager, contractStatus, loading, error };
};