import { useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { getDemoBusinesses, getAllDemoCategories, DemoBusiness } from '@/data/demoBusinesses';

// Hartford, CT coordinates for demo
const DEMO_LOCATION = {
  latitude: 41.7658,
  longitude: -72.6734,
  city: 'Hartford',
  state: 'CT'
};

export const useDemoMode = () => {
  const { user } = useAuth();
  
  // User is in demo mode if they are not authenticated
  const isDemoMode = !user;
  
  const getDemoLocation = useCallback(() => {
    return DEMO_LOCATION;
  }, []);
  
  const getDemoCacheKey = useCallback((type: string, params: any) => {
    // Create special demo cache keys that are shared across all demo users
    const baseKey = `DEMO_${type}_${JSON.stringify(params)}`;
    return baseKey;
  }, []);

  // Get static demo businesses for a category - ZERO API CALLS
  const getDemoBusinessesForCategory = useCallback((searchTerm: string): DemoBusiness[] => {
    return getDemoBusinesses(searchTerm);
  }, []);

  // Get all demo categories for Popular page - ZERO API CALLS
  const getAllDemoCategoriesData = useCallback(() => {
    return getAllDemoCategories();
  }, []);
  
  return {
    isDemoMode,
    getDemoLocation,
    getDemoCacheKey,
    getDemoBusinessesForCategory,
    getAllDemoCategoriesData,
    DEMO_LOCATION
  };
};