import { useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface SessionData {
  sessionId: string;
  favoritesAdded: number;
}

export const useSmartToast = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  const sessionRef = useRef<SessionData | null>(null);

  // Initialize session data if not exists
  const initializeSession = useCallback(() => {
    if (!sessionRef.current) {
      sessionRef.current = {
        sessionId: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        favoritesAdded: 0
      };
    }
  }, []);

  // Increment favorites count and update session
  const incrementFavoritesCount = useCallback(async () => {
    if (!user) return;
    
    initializeSession();
    if (!sessionRef.current) return;

    sessionRef.current.favoritesAdded += 1;

    // Update session in database
    try {
      await supabase
        .from('user_sessions')
        .upsert({
          session_id: sessionRef.current.sessionId,
          user_id: user.id,
          favorites_added: sessionRef.current.favoritesAdded,
          started_at: new Date().toISOString(),
        });
    } catch (error) {
      console.error('Failed to update session favorites count:', error);
    }
  }, [user, initializeSession]);

  // Smart toast logic based on favorites count
  const showFavoriteToast = useCallback(async (action: 'added' | 'removed') => {
    if (!user) return;
    
    if (action === 'added') {
      await incrementFavoritesCount();
    }

    initializeSession();
    const currentCount = sessionRef.current?.favoritesAdded || 0;

    if (action === 'removed') {
      // Always show removed toast, no action button needed
      toast({
        title: "Removed from favorites",
        duration: 2000,
      });
      return;
    }

    // Smart logic for "added" toasts
    if (currentCount <= 5) {
      // Full toast with action button for first 5 favorites
      toast({
        title: "Added to favorites",
        description: "Business saved to your favorites list",
        duration: 3000,
        action: (
          <button 
            onClick={() => navigate('/favorites')}
            className="inline-flex h-8 shrink-0 items-center justify-center rounded-md border bg-transparent px-3 text-sm font-medium transition-colors hover:bg-secondary focus:outline-none focus:ring-1 focus:ring-ring disabled:pointer-events-none disabled:opacity-50"
          >
            View favorites
          </button>
        ),
      });
    } else if (currentCount <= 10) {
      // Quick toast, no action for favorites 6-10
      toast({
        title: "Added to favorites",
        duration: 1500,
      });
    }
    // No toast after 10 favorites - user understands the pattern
  }, [user, incrementFavoritesCount, initializeSession, toast, navigate]);

  return {
    showFavoriteToast,
    getCurrentFavoritesCount: () => sessionRef.current?.favoritesAdded || 0
  };
};