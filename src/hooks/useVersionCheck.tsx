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