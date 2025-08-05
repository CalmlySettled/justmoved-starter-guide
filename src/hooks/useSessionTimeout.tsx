import { useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';


const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const WARNING_TIME = 5 * 60 * 1000; // 5 minutes before timeout

export function useSessionTimeout() {
  const { user, signOut } = useAuth();

  const resetTimeout = useCallback(() => {
    if (!user) return;

    // Clear existing timeouts
    const existingWarning = localStorage.getItem('session-warning-timeout');
    const existingLogout = localStorage.getItem('session-logout-timeout');
    
    if (existingWarning) {
      clearTimeout(Number(existingWarning));
      localStorage.removeItem('session-warning-timeout');
    }
    
    if (existingLogout) {
      clearTimeout(Number(existingLogout));
      localStorage.removeItem('session-logout-timeout');
    }

    // Set warning timeout
    const warningTimeout = setTimeout(() => {
      // Session warning removed per user request
    }, SESSION_TIMEOUT - WARNING_TIME);

    // Set logout timeout
    const logoutTimeout = setTimeout(async () => {
      // Session expired notification removed per user request
      await signOut();
    }, SESSION_TIMEOUT);

    localStorage.setItem('session-warning-timeout', warningTimeout.toString());
    localStorage.setItem('session-logout-timeout', logoutTimeout.toString());
  }, [user, signOut]);

  useEffect(() => {
    if (!user) return;

    // Initialize timeout on mount
    resetTimeout();

    // Reset timeout on user activity
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    
    const handleActivity = () => {
      resetTimeout();
    };

    events.forEach(event => {
      document.addEventListener(event, handleActivity, true);
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity, true);
      });
      
      // Clean up timeouts
      const existingWarning = localStorage.getItem('session-warning-timeout');
      const existingLogout = localStorage.getItem('session-logout-timeout');
      
      if (existingWarning) {
        clearTimeout(Number(existingWarning));
        localStorage.removeItem('session-warning-timeout');
      }
      
      if (existingLogout) {
        clearTimeout(Number(existingLogout));
        localStorage.removeItem('session-logout-timeout');
      }
    };
  }, [user, resetTimeout]);
}