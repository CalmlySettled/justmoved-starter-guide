import { useCallback, useRef } from 'react';

interface CacheEntry {
  data: any;
  timestamp: number;
  expiry: number;
}

class RequestCacheManager {
  private static instance: RequestCacheManager;
  private readonly DEFAULT_TTL = 2592000000; // 30 days (was 6 hours)
  private readonly EVENTS_TTL = 604800000; // 7 days for events
  private readonly CATEGORY_TTL = 2592000000; // 30 days for categories  
  private readonly CLEANUP_INTERVAL = 600000; // 10 minutes
  private readonly STORAGE_KEY = 'lovable_request_cache';

  static getInstance(): RequestCacheManager {
    if (!RequestCacheManager.instance) {
      RequestCacheManager.instance = new RequestCacheManager();
      // Start periodic cleanup
      setInterval(() => {
        RequestCacheManager.instance.cleanup();
      }, RequestCacheManager.instance.CLEANUP_INTERVAL);
      // Load cache from localStorage on initialization
      RequestCacheManager.instance.loadFromStorage();
    }
    return RequestCacheManager.instance;
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const parsedData = JSON.parse(stored);
        const now = Date.now();
        
        // Only load non-expired entries
        Object.entries(parsedData).forEach(([key, entry]: [string, any]) => {
          if (entry.expiry > now) {
            // Don't use Map here, work directly with localStorage for persistence
          }
        });
        console.log('💾 LOADED cache from localStorage');
      }
    } catch (error) {
      console.error('Error loading cache from storage:', error);
      localStorage.removeItem(this.STORAGE_KEY);
    }
  }

  private saveToStorage(): void {
    try {
      const cacheData: { [key: string]: CacheEntry } = {};
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        Object.assign(cacheData, JSON.parse(stored));
      }
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(cacheData));
    } catch (error) {
      console.error('Error saving cache to storage:', error);
    }
  }

  private generateCacheKey(type: string, params: any): string {
    // Normalize coordinates to match database cache precision (~3.2km)
    if (params.latitude && params.longitude) {
      params = {
        ...params,
        latitude: Math.round(params.latitude * 33.33) / 33.33, // Match database cache precision
        longitude: Math.round(params.longitude * 33.33) / 33.33
      };
    }
    
    return `${type}-${JSON.stringify(params)}`;
  }

  get(type: string, params: any): any | null {
    const key = this.generateCacheKey(type, params);
    
    try {
      // Check localStorage first for persistence
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const cacheData = JSON.parse(stored);
        const entry = cacheData[key];
        
        if (entry && Date.now() < entry.expiry) {
          console.log(`💰 PERSISTENT CACHE HIT: ${type} - saved API call cost!`);
          return entry.data;
        } else if (entry) {
          // Remove expired entry
          delete cacheData[key];
          localStorage.setItem(this.STORAGE_KEY, JSON.stringify(cacheData));
        }
      }
    } catch (error) {
      console.error('Error reading from cache storage:', error);
    }
    
    return null;
  }

  set(type: string, params: any, data: any, ttl?: number): void {
    const key = this.generateCacheKey(type, params);
    
    // Use intelligent TTL based on data type
    let actualTTL = ttl;
    if (!actualTTL) {
      if (type.includes('events') || type.includes('popular_events')) {
        actualTTL = this.EVENTS_TTL; // 7 days for events
      } else if (type.includes('category') || type.includes('themed_pack')) {
        actualTTL = this.CATEGORY_TTL; // 30 days for categories
      } else {
        actualTTL = this.DEFAULT_TTL; // 30 days default
      }
    }
    
    const entry: CacheEntry = {
      data,
      timestamp: Date.now(),
      expiry: Date.now() + actualTTL
    };
    
    try {
      // Store in localStorage for persistence
      const stored = localStorage.getItem(this.STORAGE_KEY);
      const cacheData = stored ? JSON.parse(stored) : {};
      cacheData[key] = entry;
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(cacheData));
      console.log(`💾 PERSISTENT CACHE: ${type} for ${Math.round(actualTTL / 86400000)} days`);
    } catch (error) {
      console.error('Error saving to cache storage:', error);
    }
  }

  private cleanup(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const cacheData = JSON.parse(stored);
        const now = Date.now();
        let cleaned = false;
        
        // Remove expired entries
        Object.keys(cacheData).forEach(key => {
          if (cacheData[key].expiry < now) {
            delete cacheData[key];
            cleaned = true;
          }
        });
        
        if (cleaned) {
          localStorage.setItem(this.STORAGE_KEY, JSON.stringify(cacheData));
          console.log('🧹 CLEANED expired cache entries');
        }
      }
    } catch (error) {
      console.error('Error during cache cleanup:', error);
    }
  }

  clearAll(): void {
    localStorage.removeItem(this.STORAGE_KEY);
    console.log('🗑️ CLEARED all cache');
  }

  getStats(): { size: number; keys: string[] } {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const cacheData = JSON.parse(stored);
        return {
          size: Object.keys(cacheData).length,
          keys: Object.keys(cacheData)
        };
      }
    } catch (error) {
      console.error('Error getting cache stats:', error);
    }
    return { size: 0, keys: [] };
  }
}

export function useRequestCache() {
  const cacheManager = useRef(RequestCacheManager.getInstance());

  const getCached = useCallback((type: string, params: any) => {
    return cacheManager.current.get(type, params);
  }, []);

  const setCached = useCallback((type: string, params: any, data: any, ttl?: number) => {
    cacheManager.current.set(type, params, data, ttl);
  }, []);

  const clearCache = useCallback(() => {
    cacheManager.current.clearAll();
  }, []);

  const getCacheStats = useCallback(() => {
    return cacheManager.current.getStats();
  }, []);

  return { getCached, setCached, clearCache, getCacheStats };
}