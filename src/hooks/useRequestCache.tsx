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
    // Normalize coordinates for better cache hits (~2 mile precision)
    if (params.latitude && params.longitude) {
      params = {
        ...params,
        latitude: Math.round(params.latitude / 0.02) * 0.02,
        longitude: Math.round(params.longitude / 0.02) * 0.02
      };
    }
    
    const cacheKey = `${type}-${JSON.stringify(params)}`;
    console.log(`🔑 CACHE KEY GENERATED:`, {
      type,
      originalParams: arguments[1], // Keep original params for debugging
      normalizedParams: params,
      finalKey: cacheKey,
      keyLength: cacheKey.length
    });
    
    return cacheKey;
  }

  get(type: string, params: any): any | null {
    const key = this.generateCacheKey(type, params);
    const entry = this.cache.get(key);
    
    if (!entry) {
      console.log(`❌ CACHE MISS: ${type}`, {
        key,
        reason: 'Entry not found',
        availableKeys: Array.from(this.cache.keys()),
        cacheSize: this.cache.size
      });
      return null;
    }

    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      console.log(`⏰ CACHE EXPIRED: ${type}`, {
        key,
        expiredAt: new Date(entry.expiry).toISOString(),
        now: new Date().toISOString()
      });
      return null;
    }

    console.log(`💰 CACHE HIT: ${type}`, {
      key,
      dataSize: Array.isArray(entry.data) ? entry.data.length : 'not-array',
      cachedAt: new Date(entry.timestamp).toISOString(),
      expiresAt: new Date(entry.expiry).toISOString()
    });
    return entry.data;
  }

  set(type: string, params: any, data: any, ttl: number = this.DEFAULT_TTL): void {
    const key = this.generateCacheKey(type, params);
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expiry: Date.now() + ttl
    });
    console.log(`💾 CACHED: ${type}`, {
      key,
      dataSize: Array.isArray(data) ? data.length : 'not-array',
      ttlMinutes: Math.round(ttl / 60000),
      expiresAt: new Date(Date.now() + ttl).toISOString(),
      totalCacheSize: this.cache.size
    });
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

  // New function to check backend cache via edge function
  const checkBackendCache = useCallback(async (coordinates: { lat: number; lng: number }, categories: string[]) => {
    try {
      console.log(`🔍 CHECKING BACKEND CACHE via edge function:`, {
        coordinates,
        categories
      });

      const response = await fetch('https://ghbnvodnnxgxkiufcael.supabase.co/functions/v1/check-cache', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          coordinates,
          categories
        })
      });

      if (!response.ok) {
        console.error('❌ BACKEND CACHE CHECK FAILED:', response.status);
        return null;
      }

      const result = await response.json();
      
      if (result.cached && result.data) {
        console.log(`💰 BACKEND CACHE HIT via edge function!`, {
          categories: Object.keys(result.data),
          cacheAge: result.cacheAge,
          fuzzy: result.fuzzy || false
        });
        return result.data;
      }

      console.log(`❌ BACKEND CACHE MISS via edge function`, {
        coordinates,
        categories
      });
      return null;
    } catch (error) {
      console.error('❌ BACKEND CACHE CHECK ERROR:', error);
      return null;
    }
  }, []);

  return { getCached, setCached, clearCache, getCacheStats, checkBackendCache };
}