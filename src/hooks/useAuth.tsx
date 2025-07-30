import { useState, useEffect, createContext, useContext } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  signOut: async () => {}
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [authRetryAttempts, setAuthRetryAttempts] = useState(0);

  // Detect mobile devices
  useEffect(() => {
    const detectMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor;
      const isMobileDevice = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
      setIsMobile(isMobileDevice);
      console.log('Mobile Debug: Device detection -', { isMobileDevice, userAgent });
    };
    detectMobile();
  }, []);

  // Mobile-specific session recovery
  const recoverSession = async () => {
    if (!isMobile) return;
    
    console.log('Mobile Debug: Attempting session recovery...');
    try {
      // Force refresh session
      const { data: { session }, error } = await supabase.auth.refreshSession();
      if (error) {
        console.error('Mobile Debug: Session recovery failed:', error);
        return;
      }
      
      if (session) {
        console.log('Mobile Debug: Session recovered successfully');
        setSession(session);
        setUser(session.user);
        setLoading(false);
      }
    } catch (error) {
      console.error('Mobile Debug: Session recovery error:', error);
    }
  };

  useEffect(() => {
    let retryTimeout: NodeJS.Timeout;
    
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Mobile Debug: Auth state changed:', { event, session, isMobile });
        
        // Clear any pending retries
        if (retryTimeout) clearTimeout(retryTimeout);
        
        setSession(session);
        setUser(session?.user ?? null);
        
        // Mobile-specific handling
        if (isMobile) {
          if (event === 'SIGNED_IN' && session) {
            console.log('Mobile Debug: Sign in detected on mobile');
            // Give extra time for mobile session to stabilize
            setTimeout(() => {
              setLoading(false);
            }, 1000);
          } else if (event === 'TOKEN_REFRESHED' && session) {
            console.log('Mobile Debug: Token refreshed on mobile');
            setLoading(false);
          } else if (!session) {
            console.log('Mobile Debug: No session on mobile, setting loading to false');
            setLoading(false);
          }
        } else {
          setLoading(false);
        }
      }
    );

    // THEN check for existing session with retry logic for mobile
    const checkSession = async () => {
      try {
        console.log('Mobile Debug: Initial session check starting...');
        const { data: { session }, error } = await supabase.auth.getSession();
        
        console.log('Mobile Debug: Initial session check result:', { session, error, isMobile });
        
        if (error) {
          console.error('Mobile Debug: Session check error:', error);
          if (isMobile && authRetryAttempts < 3) {
            console.log('Mobile Debug: Retrying session check...', authRetryAttempts + 1);
            setAuthRetryAttempts(prev => prev + 1);
            retryTimeout = setTimeout(checkSession, 2000);
            return;
          }
        }
        
        setSession(session);
        setUser(session?.user ?? null);
        
        // Mobile-specific session handling
        if (isMobile) {
          if (!session && authRetryAttempts < 2) {
            console.log('Mobile Debug: No session found, attempting recovery...');
            await recoverSession();
          } else {
            console.log('Mobile Debug: Setting loading to false after session check');
            setTimeout(() => setLoading(false), 500);
          }
        } else {
          setLoading(false);
        }
      } catch (error) {
        console.error('Mobile Debug: Session check failed:', error);
        setLoading(false);
      }
    };

    checkSession();

    return () => {
      if (retryTimeout) clearTimeout(retryTimeout);
      subscription.unsubscribe();
    };
  }, [isMobile, authRetryAttempts]);

  const signOut = async () => {
    try {
      console.log('Sign out initiated...');
      
      // Explicitly clear local state first
      setUser(null);
      setSession(null);
      
      // Sign out with 'local' scope to clear all local session data
      const { error } = await supabase.auth.signOut({ scope: 'local' });
      if (error) {
        console.error('Sign out error:', error);
        throw error;
      }
      console.log('Sign out successful');
    } catch (error) {
      console.error('Failed to sign out:', error);
      // Even if server sign out fails, clear local state
      setUser(null);
      setSession(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};