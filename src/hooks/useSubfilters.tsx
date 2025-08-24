import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Business {
  name: string;
  address: string;
  description: string;
  phone?: string;
  website?: string;
  image_url?: string;
  features: string[];
  latitude: number;
  longitude: number;
  distance_miles: number;
  place_id?: string;
}

interface FilterRequest {
  category: string;
  filter: string;
  location: string;
  radius?: number;
  userId?: string;
}

export const useSubfilters = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const fetchFilteredBusinesses = useCallback(async (
    category: string, 
    subfilter: string, 
    userLocation?: string, 
    userId?: string
  ): Promise<Business[]> => {
    if (!userLocation) {
      toast({
        title: "Location Required",
        description: "Please set your location to see filtered recommendations.",
        variant: "destructive"
      });
      return [];
    }

    setIsLoading(true);
    
    try {
      const filterRequest: FilterRequest = {
        category: category, // Use exact category name, don't convert to lowercase
        filter: subfilter,
        location: userLocation,
        radius: 10000, // 10km default
        userId
      };

      console.log('Sending filter request:', filterRequest);
      
      const { data, error } = await supabase.functions.invoke('filter-recommendations', {
        body: filterRequest
      });

      console.log('Filter response:', data);

      if (error) {
        console.error('Filter recommendations error:', error);
        toast({
          title: "Error Loading Recommendations",
          description: "Unable to load filtered recommendations. Please try again.",
          variant: "destructive"
        });
        return [];
      }

      // Parse the dynamic response format - edge function returns { "Category - Filter": businesses[] }
      console.log('Raw filter response data:', data);
      const businesses = data ? Object.values(data)[0] as Business[] : [];
      console.log('Extracted businesses:', businesses);
      return businesses || [];
    } catch (error) {
      console.error('Error fetching filtered businesses:', error);
      toast({
        title: "Network Error",
        description: "Unable to connect to recommendation service. Please check your connection.",
        variant: "destructive"
      });
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  return {
    fetchFilteredBusinesses,
    isLoading
  };
};