import { useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface AnalyticsEvent {
  eventType: string;
  eventCategory: string;
  eventData?: Record<string, any>;
}

interface SessionData {
  sessionId: string;
  startTime: number;
  pageViews: number;
  recommendationsViewed: number;
  recommendationsClicked: number;
  favoritesAdded: number;
}

export const useAnalytics = (triggerSurveyCheck?: (eventType: string, eventData: Record<string, any>) => void) => {
  const { user } = useAuth();
  const sessionData = useRef<SessionData | null>(null);
  const lastActivityTime = useRef<number>(Date.now());

  // Generate or retrieve session ID
  const getSessionId = useCallback(() => {
    if (!sessionData.current) {
      const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionData.current = {
        sessionId,
        startTime: Date.now(),
        pageViews: 0,
        recommendationsViewed: 0,
        recommendationsClicked: 0,
        favoritesAdded: 0,
      };
      
      // Create session in database
      if (user) {
        supabase.from('user_sessions').insert({
          session_id: sessionId,
          user_id: user.id,
          started_at: new Date().toISOString(),
          user_agent: navigator.userAgent,
        }).then((result) => {
          if (result.error) {
            console.error('Failed to create session:', result.error);
          }
        });
      }
    }
    return sessionData.current.sessionId;
  }, [user]);

  // Track analytics event
  const trackEvent = useCallback(async (event: AnalyticsEvent) => {
    try {
      const sessionId = getSessionId();
      lastActivityTime.current = Date.now();

      // Insert event into database
      await supabase.from('user_activity_events').insert({
        user_id: user?.id || null,
        session_id: sessionId,
        event_type: event.eventType,
        event_category: event.eventCategory,
        event_data: event.eventData || {},
        page_url: window.location.href,
        user_agent: navigator.userAgent,
      });

      // Update session counters
      if (sessionData.current) {
        switch (event.eventType) {
          case 'page_view':
            sessionData.current.pageViews++;
            break;
          case 'recommendation_view':
            sessionData.current.recommendationsViewed++;
            break;
          case 'recommendation_click':
            sessionData.current.recommendationsClicked++;
            break;
          case 'favorite_added':
            sessionData.current.favoritesAdded++;
            break;
        }
      }
    } catch (error) {
      console.error('Failed to track analytics event:', error);
    }
  }, [user, getSessionId]);

  // Track page view
  const trackPageView = useCallback((category: string, additionalData?: Record<string, any>) => {
    trackEvent({
      eventType: 'page_view',
      eventCategory: category,
      eventData: {
        category,
        path: window.location.pathname,
        ...additionalData,
      },
    });
  }, [trackEvent]);

  // Track recommendation interaction
  const trackRecommendationClick = useCallback((businessName: string, category: string, additionalData?: Record<string, any>) => {
    trackEvent({
      eventType: 'recommendation_click',
      eventCategory: category,
      eventData: {
        business_name: businessName,
        category,
        ...additionalData,
      },
    });
  }, [trackEvent]);

  // Track favorite action
  const trackFavoriteAction = useCallback((businessName: string, category: string, action: 'added' | 'removed') => {
    trackEvent({
      eventType: action === 'added' ? 'favorite_added' : 'favorite_removed',
      eventCategory: category,
      eventData: {
        business_name: businessName,
        category,
        action,
      },
    });
  }, [trackEvent]);

  // Track search action
  const trackSearch = useCallback((query: string, category?: string, resultsCount?: number) => {
    trackEvent({
      eventType: 'search',
      eventCategory: category || 'general',
      eventData: {
        query,
        category,
        results_count: resultsCount,
      },
    });
  }, [trackEvent]);

  // Track button/UI interaction
  const trackUIInteraction = useCallback((element: string, action: string, category: string = 'ui', additionalData?: Record<string, any>) => {
    trackEvent({
      eventType: 'ui_interaction',
      eventCategory: category,
      eventData: {
        element,
        action,
        ...additionalData,
      },
    });
  }, [trackEvent]);

  // Track directions click (key conversion event)
  const trackDirectionsClick = useCallback((businessName: string, address: string, category?: string) => {
    trackEvent({
      eventType: 'directions_clicked',
      eventCategory: category || 'general',
      eventData: {
        business_name: businessName,
        address,
        category,
        conversion_type: 'directions',
      },
    });
  }, [trackEvent]);

  // Track website request (conversion intent)
  const trackWebsiteRequest = useCallback((businessName: string, category?: string, success?: boolean) => {
    trackEvent({
      eventType: 'website_requested',
      eventCategory: category || 'general',
      eventData: {
        business_name: businessName,
        category,
        success,
        conversion_type: 'website_request',
      },
    });
  }, [trackEvent]);

  // Track website visit (strong conversion signal)
  const trackWebsiteVisit = useCallback((businessName: string, websiteUrl: string, category?: string) => {
    trackEvent({
      eventType: 'website_visited',
      eventCategory: category || 'general',
      eventData: {
        business_name: businessName,
        website_url: websiteUrl,
        category,
        conversion_type: 'website_visit',
      },
    });
  }, [trackEvent]);

  // End session when component unmounts or user leaves
  const endSession = useCallback(async () => {
    if (sessionData.current && user) {
      const duration = Math.floor((Date.now() - sessionData.current.startTime) / 1000);
      
      try {
        await supabase
          .from('user_sessions')
          .update({
            ended_at: new Date().toISOString(),
            duration_seconds: duration,
            page_views: sessionData.current.pageViews,
            recommendations_viewed: sessionData.current.recommendationsViewed,
            recommendations_clicked: sessionData.current.recommendationsClicked,
            favorites_added: sessionData.current.favoritesAdded,
          })
          .eq('session_id', sessionData.current.sessionId);
      } catch (error) {
        console.error('Failed to end session:', error);
      }
    }
  }, [user]);

  // Set up session management
  useEffect(() => {
    // Initialize session
    getSessionId();

    // Handle page visibility change
    const handleVisibilityChange = () => {
      if (document.hidden) {
        endSession();
      } else {
        // Restart session if coming back after being hidden for more than 30 minutes
        if (lastActivityTime.current < Date.now() - 30 * 60 * 1000) {
          sessionData.current = null;
          getSessionId();
        }
      }
    };

    // Handle beforeunload
    const handleBeforeUnload = () => {
      endSession();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      endSession();
    };
  }, [getSessionId, endSession]);

  return {
    trackEvent,
    trackPageView,
    trackRecommendationClick,
    trackFavoriteAction,
    trackSearch,
    trackUIInteraction,
    trackDirectionsClick,
    trackWebsiteRequest,
    trackWebsiteVisit,
    sessionId: sessionData.current?.sessionId,
  };
};