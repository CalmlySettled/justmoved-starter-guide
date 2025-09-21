import { useEffect } from 'react';
import { initializeVersionCheck, VERSION_CONFIG } from '@/lib/appVersion';
import { useRequestCache } from './useRequestCache';
import { useToast } from './use-toast';

export function useVersionCheck() {
  const { clearOldVersions } = useRequestCache();
  const { toast } = useToast();

  useEffect(() => {
    // Initialize version checking on app load
    const wasUpdated = localStorage.getItem('app_version') !== VERSION_CONFIG.version;
    
    initializeVersionCheck();
    
    // Clear old version caches from memory
    clearOldVersions();
    
    // Also clear localStorage cache entries with empty data
    try {
      const keys = Object.keys(localStorage);
      let clearedCount = 0;
      
      keys.forEach(key => {
        if (key.startsWith('cache_')) {
          try {
            const item = JSON.parse(localStorage.getItem(key) || '{}');
            if (item.data) {
              // Check if cache data is empty or invalid
              const hasValidData = item.data && 
                typeof item.data === 'object' &&
                Object.keys(item.data).length > 0 &&
                Object.values(item.data).some((businesses: any) => 
                  Array.isArray(businesses) && businesses.length > 0
                );
                
              if (!hasValidData) {
                localStorage.removeItem(key);
                clearedCount++;
              }
            }
          } catch (e) {
            // Remove corrupted cache entries
            localStorage.removeItem(key);
            clearedCount++;
          }
        }
      });
      
      if (clearedCount > 0) {
        console.log(`🧹 Cleared ${clearedCount} empty or invalid cache entries`);
      }
    } catch (error) {
      console.warn('Error clearing empty cache entries:', error);
    }
    
    // Show update notification if version changed
    if (wasUpdated && localStorage.getItem('app_version') === VERSION_CONFIG.version) {
      toast({
        title: "App Updated",
        description: "You're now using the latest version with new features and improvements!",
      });
    }
  }, [clearOldVersions, toast]);

  return {
    currentVersion: VERSION_CONFIG.version,
    buildDate: VERSION_CONFIG.buildDate
  };
}