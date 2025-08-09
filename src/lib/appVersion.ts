// App Version Management
// Increment this version when you need to invalidate all caches
export const APP_VERSION = '1.0.1';

// Version types for different cache invalidation strategies
export type CacheInvalidationType = 'major' | 'minor' | 'ui-only' | 'data-only';

export interface VersionConfig {
  version: string;
  buildDate: string;
  cacheStrategy: {
    frontend: boolean;
    backend: boolean;
    localStorage: boolean;
  };
}

// Current version configuration
export const VERSION_CONFIG: VersionConfig = {
  version: APP_VERSION,
  buildDate: new Date().toISOString(),
  cacheStrategy: {
    frontend: true,
    backend: true,
    localStorage: true
  }
};

// Utility to get versioned cache key
export function getVersionedCacheKey(baseKey: string, includeVersion: boolean = true): string {
  return includeVersion ? `v${APP_VERSION}-${baseKey}` : baseKey;
}

// Check if stored version matches current version
export function isVersionCurrent(storedVersion?: string): boolean {
  return storedVersion === APP_VERSION;
}

// Clear version-specific localStorage entries
export function clearVersionedStorage(): void {
  const keysToRemove: string[] = [];
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (key.startsWith('v') && key.includes('-'))) {
      // Check if it's an old version key
      const versionMatch = key.match(/^v([^-]+)-/);
      if (versionMatch && versionMatch[1] !== APP_VERSION) {
        keysToRemove.push(key);
      }
    }
  }
  
  keysToRemove.forEach(key => localStorage.removeItem(key));
}

// Initialize version checking
export function initializeVersionCheck(): void {
  const STORAGE_VERSION_KEY = 'app_version';
  const storedVersion = localStorage.getItem(STORAGE_VERSION_KEY);
  
  if (!isVersionCurrent(storedVersion)) {
    console.log(`📱 APP VERSION UPDATE: ${storedVersion || 'unknown'} → ${APP_VERSION}`);
    clearVersionedStorage();
    localStorage.setItem(STORAGE_VERSION_KEY, APP_VERSION);
    
    // Optionally show user notification about updates
    console.log('🔄 Cache cleared for app update');
  }
}