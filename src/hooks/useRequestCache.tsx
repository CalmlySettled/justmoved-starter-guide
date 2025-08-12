import { useCallback, useRef } from 'react';
import { getVersionedCacheKey, APP_VERSION } from '@/lib/appVersion';

interface CacheEntry {
  data: any;
  timestamp: number;
  expiry: number;
}

class RequestCacheManager {
  private static instance: RequestCacheManager;
  private cache: Map<string, CacheEntry> = new Map();
  public readonly DEFAULT_TTL = 1800000; // 30 minutes
  public readonly GEOGRAPHIC_TTL = 2592000000; // 30 days
  private readonly CLEANUP_INTERVAL = 600000; // 10 minutes
  private currentUserId: string | null = null;

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

  private generateCacheKey(type: string, params: any, isGeographic: boolean = false): string {
    // Normalize coordinates for better cache hits (~2 mile precision)
    if (params.latitude && params.longitude) {
      params = {
        ...params,
        latitude: Math.round(params.latitude / 0.02) * 0.02,
        longitude: Math.round(params.longitude / 0.02) * 0.02
      };
    }
    
    const baseKey = `${type}-${JSON.stringify(params)}`;
    const versionedKey = getVersionedCacheKey(baseKey);
    
    // Geographic data is shared across all users, personal data is user-specific
    const finalKey = isGeographic 
      ? versionedKey  // No user prefix for geographic data
      : this.currentUserId 
        ? `user:${this.currentUserId}:${versionedKey}`
        : `anon:${versionedKey}`;
    
    console.log(`🔑 CACHE KEY GENERATED:`, {
      type,
      isGeographic,
      version: APP_VERSION,
      userId: this.currentUserId,
      originalParams: arguments[1],
      normalizedParams: params,
      baseKey,
      versionedKey,
      finalKey,
      keyLength: finalKey.length
    });
    
    return finalKey;
  }

  setCurrentUserId(userId: string | null): void {
    this.currentUserId = userId;
    console.log(`👤 CURRENT USER SET:`, { userId });
  }

  get(type: string, params: any, isGeographic: boolean = false): any | null {
    const key = this.generateCacheKey(type, params, isGeographic);
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

  set(type: string, params: any, data: any, ttl: number = this.DEFAULT_TTL, isGeographic: boolean = false): void {
    const key = this.generateCacheKey(type, params, isGeographic);
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expiry: Date.now() + ttl
    });
    console.log(`💾 VERSIONED CACHED: ${type}`, {
      version: APP_VERSION,
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
    console.log(`🧹 ALL CACHE CLEARED for version ${APP_VERSION}`);
  }

  // Clear only old version entries
  clearOldVersions(): void {
    const currentVersionPrefix = `v${APP_VERSION}-`;
    const keysToDelete: string[] = [];
    
    for (const [key] of this.cache.entries()) {
      if (key.startsWith('v') && key.includes('-') && !key.startsWith(currentVersionPrefix)) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.cache.delete(key));
    console.log(`🧹 OLD VERSION CACHE CLEARED: ${keysToDelete.length} entries removed`);
  }

  // Clear cache for a specific user
  clearUserCache(userId: string | null): void {
    const userPrefix = userId ? `user:${userId}:` : 'anon:';
    const keysToDelete: string[] = [];
    
    for (const [key] of this.cache.entries()) {
      if (key.startsWith(userPrefix)) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.cache.delete(key));
    console.log(`🧹 USER CACHE CLEARED:`, { 
      userId, 
      entriesRemoved: keysToDelete.length,
      totalCacheSize: this.cache.size 
    });
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

  const getCached = useCallback((type: string, params: any, isGeographic: boolean = false) => {
    return cacheManager.current.get(type, params, isGeographic);
  }, []);

  const setCached = useCallback((type: string, params: any, data: any, ttl?: number, isGeographic: boolean = false) => {
    const finalTtl = isGeographic ? cacheManager.current.GEOGRAPHIC_TTL : (ttl || cacheManager.current.DEFAULT_TTL);
    cacheManager.current.set(type, params, data, finalTtl, isGeographic);
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

  const clearOldVersions = useCallback(() => {
    cacheManager.current.clearOldVersions();
  }, []);

  const clearUserCache = useCallback((userId: string | null) => {
    cacheManager.current.clearUserCache(userId);
  }, []);

  const setCurrentUserId = useCallback((userId: string | null) => {
    cacheManager.current.setCurrentUserId(userId);
  }, []);

  return { getCached, setCached, clearCache, getCacheStats, checkBackendCache, clearOldVersions, clearUserCache, setCurrentUserId };
}