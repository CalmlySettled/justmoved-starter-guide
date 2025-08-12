import { useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import { logSecurityEvent } from '@/lib/security';

interface SessionValidationResult {
  valid: boolean;
  security_score: number;
  session_id: string;
}

export const useSecureSession = () => {
  const { user, session } = useAuth();

  const validateSession = useCallback(async () => {
    if (!session?.access_token) return;

    try {
      const sessionId = session.access_token.slice(-8); // Last 8 chars as session ID
      const userAgent = navigator.userAgent;
      const ipAddress = '127.0.0.1'; // Placeholder - real IP would come from server

      const { data, error } = await supabase.rpc('validate_session_security', {
        p_session_id: sessionId,
        p_user_agent: userAgent,
        p_ip_address: ipAddress
      }) as { data: SessionValidationResult | null, error: any };

      if (error) {
        console.error('Session validation error:', error);
        logSecurityEvent('session_validation_error', { error: error.message });
        return;
      }

      if (data && !data.valid) {
        logSecurityEvent('session_security_warning', {
          security_score: data.security_score,
          session_id: data.session_id
        });
        
        // Consider additional actions for low security scores
        if (data.security_score < 50) {
          console.warn('Session security score is critically low:', data.security_score);
        }
      }
    } catch (error) {
      console.error('Session validation failed:', error);
      logSecurityEvent('session_validation_failed', { error: String(error) });
    }
  }, [session]);

  const logCacheAccess = useCallback(async (cacheType: string, pattern: string, metadata = {}) => {
    if (!user) return;

    try {
      await supabase.rpc('log_cache_access', {
        p_cache_type: cacheType,
        p_access_pattern: pattern,
        p_metadata: {
          user_id: user.id,
          timestamp: new Date().toISOString(),
          ...metadata
        }
      });
    } catch (error) {
      console.warn('Failed to log cache access:', error);
    }
  }, [user]);

  // Validate session on mount and periodically
  useEffect(() => {
    if (user && session) {
      validateSession();
      
      // Validate session every 5 minutes
      const interval = setInterval(validateSession, 5 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [user, session, validateSession]);

  return {
    validateSession,
    logCacheAccess
  };
};