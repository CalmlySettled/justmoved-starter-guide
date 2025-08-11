import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAnalytics } from '@/hooks/useAnalytics';
import { useMicroSurveyContext } from './MicroSurveyProvider';

const routeCategories: Record<string, string> = {
  '/': 'home',
  '/explore': 'explore',
  '/popular': 'popular',
  '/favorites': 'favorites',
  '/features': 'features',
  '/how-it-works': 'how-it-works',
  '/faq': 'faq',
  '/about': 'about',
  '/auth': 'auth',
  '/profile': 'profile',
  '/admin/ai-dashboard': 'admin',
  '/admin/analytics': 'admin',
};

export const AnalyticsProvider = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const { triggerSurveyCheck } = useMicroSurveyContext();
  const { trackPageView } = useAnalytics(triggerSurveyCheck);

  useEffect(() => {
    // Track page view whenever route changes
    const pathname = location.pathname;
    const category = routeCategories[pathname] || 
                    (pathname.startsWith('/popular/') ? 'popular-category' : 'other');
    
    trackPageView(category, {
      page: pathname,
      search: location.search,
      hash: location.hash,
    });
  }, [location, trackPageView]);

  return <>{children}</>;
};