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
      // Removed toast with subtle styling
      toast({
        title: "💔 Removed from favorites",
        description: "You can add it back anytime",
        duration: 2000,
        className: "border-l-4 border-l-destructive bg-gradient-card",
      });
      return;
    }

    // Smart logic for "added" toasts
    if (currentCount <= 5) {
      // Full toast with action button for first 5 favorites - celebratory!
      toast({
        title: "❤️ Added to favorites!",
        description: "Great choice! Building your local favorites collection",
        duration: 2500,
        className: "border-l-4 border-l-secondary bg-gradient-card shadow-soft",
        action: (
          <button 
            onClick={() => navigate('/favorites')}
            className="inline-flex h-9 shrink-0 items-center justify-center rounded-lg bg-gradient-accent px-4 text-sm font-semibold text-accent-foreground transition-all duration-200 hover:scale-105 hover:shadow-glow focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            View Collection
          </button>
        ),
      });
    } else if (currentCount <= 10) {
      // Quick toast, no action for favorites 6-10 - more subtle
      toast({
        title: "❤️ Favorited!",
        description: "Added to your collection",
        duration: 1500,
        className: "border-l-4 border-l-primary bg-card shadow-soft",
      });
    }
    // No toast after 10 favorites - user understands the pattern
  }, [user, incrementFavoritesCount, initializeSession, toast, navigate]);

  return {
    showFavoriteToast,
    getCurrentFavoritesCount: () => sessionRef.current?.favoritesAdded || 0
  };
};