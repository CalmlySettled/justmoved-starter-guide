import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function useMobileAuth() {
  const { user, session, loading } = useAuth();
  const { toast } = useToast();
  const [isMobile, setIsMobile] = useState(false);
  const [mobileAuthReady, setMobileAuthReady] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  // Detect mobile device
  useEffect(() => {
    const userAgent = navigator.userAgent || navigator.vendor;
    const isMobileDevice = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
    setIsMobile(isMobileDevice);
    console.log('Mobile Debug: Device detection -', { isMobileDevice, userAgent });
  }, []);

  // Mobile-specific session validation
  const validateMobileSession = useCallback(async () => {
    if (!isMobile) {
      setMobileAuthReady(true);
      return true;
    }

    console.log('Mobile Debug: Validating mobile session...');
    
    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      console.log('Mobile Debug: Session validation result:', !!currentSession);
      
      if (currentSession?.user) {
        setMobileAuthReady(true);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Mobile Debug: Session validation failed:', error);
      return false;
    }
  }, [isMobile]);

  // Mobile retry mechanism
  const retryMobileAuth = useCallback(async () => {
    if (!isMobile || retryCount >= 3) return false;
    
    console.log('Mobile Debug: Retrying auth, attempt:', retryCount + 1);
    setRetryCount(prev => prev + 1);
    
    const isValid = await validateMobileSession();
    if (isValid) {
      toast({
        title: "Connected",
        description: "Successfully connected to your account",
      });
      return true;
    }
    
    return false;
  }, [isMobile, retryCount, validateMobileSession, toast]);

  // Initialize mobile auth validation
  useEffect(() => {
    if (loading) return;

    const initializeMobileAuth = async () => {
      if (isMobile) {
        // Give mobile devices extra time to initialize
        await new Promise(resolve => setTimeout(resolve, 2000));
        await validateMobileSession();
      } else {
        setMobileAuthReady(true);
      }
    };

    initializeMobileAuth();
  }, [loading, isMobile, validateMobileSession]);

  return {
    isMobile,
    mobileAuthReady,
    retryMobileAuth,
    canRetry: isMobile && retryCount < 3,
    isAuthenticated: !!user && !!session,
    needsAuth: !loading && !user,
    isLoading: loading || (isMobile && !mobileAuthReady)
  };
}