import { supabase } from "@/integrations/supabase/client";

export const clearLocationCache = async (): Promise<boolean> => {
  try {
    console.log('🧹 Triggering location cache cleanup...');
    
    const { data, error } = await supabase.functions.invoke('clear-location-cache', {
      body: {}
    });
    
    if (error) {
      console.error('Cache clear error:', error);
      return false;
    }
    
    console.log('✅ Location cache cleared:', data);
    return true;
  } catch (error) {
    console.error('Cache clear failed:', error);
    return false;
  }
};

export const formatLocationString = (city?: string, latitude?: number, longitude?: number): string => {
  if (city && (city.includes('Connecticut') || city.includes('CT'))) {
    return city;
  }
  
  if (city) {
    return `${city}, Connecticut`;
  }
  
  if (latitude && longitude) {
    return `${latitude},${longitude}`;
  }
  
  return 'Connecticut';
};