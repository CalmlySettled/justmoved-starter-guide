import { useCallback, useRef } from 'react';

interface CacheEntry {
  data: any;
  timestamp: number;
  expiry: number;
}

class RequestCacheManager {
  private static instance: RequestCacheManager;
  private cache: Map<string, CacheEntry> = new Map();
  private readonly DEFAULT_TTL = 1800000; // 30 minutes
  private readonly CLEANUP_INTERVAL = 600000; // 10 minutes

  static getInstance(): RequestCacheManager {
    if (!RequestCacheManager.instance) {
      RequestCacheManager.instance = new RequestCacheManager();
      // Start periodic cleanup
      setInterval(() => {
        RequestCacheManager.instance.cleanup();
      }, RequestCacheManager.instance.CLEANUP_INTERVAL);
    }
    return RequestCacheManager.instance;
  }

  private generateCacheKey(type: string, params: any): string {
    // Normalize coordinates for better cache hits
    if (params.latitude && params.longitude) {
      params = {
        ...params,
        latitude: Number(params.latitude.toFixed(3)),
        longitude: Number(params.longitude.toFixed(3))
      };
    }
    
    return `${type}-${JSON.stringify(params)}`;
  }

  get(type: string, params: any): any | null {
    const key = this.generateCacheKey(type, params);
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return null;
    }

    console.log(`💰 CACHE HIT: ${type} - saved API call cost!`);
    return entry.data;
  }

  set(type: string, params: any, data: any, ttl: number = this.DEFAULT_TTL): void {
    const key = this.generateCacheKey(type, params);
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expiry: Date.now() + ttl
    });
    console.log(`💾 CACHED: ${type} for ${Math.round(ttl / 60000)} minutes`);
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiry) {
        this.cache.delete(key);
      }
    }
  }

  clearAll(): void {
    this.cache.clear();
  }

  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
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