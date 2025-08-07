import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface BusinessDetails {
  website: string | null;
  phone: string | null;
  opening_hours: string[] | null;
  business_status: string | null;
  fetched_at: string;
}

interface UseBusinessDetailsReturn {
  getBusinessDetails: (placeId: string, businessName: string) => Promise<BusinessDetails | null>;
  loadingStates: Record<string, boolean>;
  detailsCache: Record<string, BusinessDetails>;
  clearCache: () => void;
}

export const useBusinessDetails = (): UseBusinessDetailsReturn => {
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});
  const [detailsCache, setDetailsCache] = useState<Record<string, BusinessDetails>>({});

  const getBusinessDetails = useCallback(async (placeId: string, businessName: string): Promise<BusinessDetails | null> => {
    // Return cached data if available
    if (detailsCache[placeId]) {
      return detailsCache[placeId];
    }

    // Prevent duplicate requests
    if (loadingStates[placeId]) {
      return null;
    }

    setLoadingStates(prev => ({ ...prev, [placeId]: true }));

    try {
      const { data, error } = await supabase.functions.invoke('get-business-details', {
        body: { place_id: placeId, business_name: businessName }
      });

      if (error) {
        console.error('Error fetching business details:', error);
        return null;
      }

      const details = data as BusinessDetails;
      
      // Cache the results
      setDetailsCache(prev => ({ ...prev, [placeId]: details }));
      
      return details;
    } catch (error) {
      console.error('Error in getBusinessDetails:', error);
      return null;
    } finally {
      setLoadingStates(prev => ({ ...prev, [placeId]: false }));
    }
  }, [detailsCache, loadingStates]);

  const clearCache = useCallback(() => {
    setDetailsCache({});
    setLoadingStates({});
  }, []);

  return {
    getBusinessDetails,
    loadingStates,
    detailsCache,
    clearCache
  };
};