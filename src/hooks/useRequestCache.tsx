import { useCallback, useRef } from 'react';
import { getVersionedCacheKey, APP_VERSION } from '@/lib/appVersion';

interface CacheEntry {
  data: any;
  timestamp: number;
  expiry: number;
}

class RequestCacheManager {
  private static instance: RequestCacheManager;
  private cache: Map<string, CacheEntry> = new Map(); // User-specific data only
  public readonly DEFAULT_TTL = 1800000; // 30 minutes
  public readonly GEOGRAPHIC_TTL = 2592000000; // 30 days
  private readonly CLEANUP_INTERVAL = 600000; // 10 minutes
  private readonly LOCAL_STORAGE_PREFIX = 'geo_cache_';
  private readonly MAX_LOCAL_STORAGE_SIZE = 50; // Max number of geographic entries
  private currentUserId: string | null = null;

  static getInstance(): RequestCacheManager {
    if (!RequestCacheManager.instance) {
      RequestCacheManager.instance = new RequestCacheManager();
      // Hydrate geographic cache from localStorage on startup
      RequestCacheManager.instance.hydrateFromLocalStorage();
      // Start periodic cleanup for both memory and localStorage
      setInterval(() => {
        RequestCacheManager.instance.cleanup();
        RequestCacheManager.instance.cleanupLocalStorage();
      }, RequestCacheManager.instance.CLEANUP_INTERVAL);
    }
    return RequestCacheManager.instance;
  }

  private generateCacheKey(type: string, params: any, isGeographic: boolean): string {
    console.log(`🔍 GENERATE CACHE KEY ENTRY:`, {
      type,
      isGeographic,
      isGeographicType: typeof isGeographic,
      isGeographicValue: String(isGeographic),
      currentUserId: this.currentUserId,
      paramsKeys: Object.keys(params || {})
    });

    // ASSERTION: Geographic data should NEVER get user-prefixed keys
    if (isGeographic && this.currentUserId) {
      console.warn(`⚠️ POTENTIAL ISSUE: Geographic data (${type}) being processed with user ID present. This might create user-specific keys for shared data.`);
    }

    // Deep clone and normalize parameters for deterministic key generation
    const normalizedParams = this.normalizeParams(params);
    
    const baseKey = `${type}-${this.deterministicStringify(normalizedParams)}`;
    const versionedKey = getVersionedCacheKey(baseKey);
    
    // Geographic data is shared across all users, personal data is user-specific
    const finalKey = isGeographic 
      ? versionedKey  // No user prefix for geographic data
      : this.currentUserId 
        ? `user:${this.currentUserId}:${versionedKey}`
        : `anon:${versionedKey}`;

    // ASSERTION: Verify geographic data doesn't get user prefix
    if (isGeographic && (finalKey.startsWith('user:') || finalKey.startsWith('anon:'))) {
      console.error(`❌ CRITICAL ERROR: Geographic data got user-prefixed key!`, {
        type,
        isGeographic,
        finalKey,
        shouldBeShared: true
      });
      throw new Error(`Geographic cache key incorrectly prefixed: ${finalKey}`);
    }

    // ASSERTION: Verify non-geographic data gets proper prefix when user exists
    if (!isGeographic && this.currentUserId && !finalKey.startsWith('user:')) {
      console.error(`❌ CRITICAL ERROR: Personal data didn't get user prefix!`, {
        type,
        isGeographic,
        finalKey,
        shouldHaveUserPrefix: true
      });
    }
    
    console.log(`🔑 CACHE KEY GENERATED:`, {
      type,
      isGeographic,
      version: APP_VERSION,
      userId: this.currentUserId,
      originalParams: arguments[1],
      normalizedParams: normalizedParams,
      baseKey,
      versionedKey,
      finalKey,
      keyLength: finalKey.length,
      isSharedKey: !finalKey.includes('user:') && !finalKey.includes('anon:')
    });
    
    return finalKey;
  }

  private normalizeParams(params: any): any {
    if (!params) return {};
    
    const normalized = { ...params };
    
    // Normalize coordinates for consistent cache hits (~2 mile precision)
    if (normalized.latitude && normalized.longitude) {
      normalized.latitude = Math.round(normalized.latitude / 0.02) * 0.02;
      normalized.longitude = Math.round(normalized.longitude / 0.02) * 0.02;
    }
    
    // Sort arrays for consistent ordering
    if (normalized.categories && Array.isArray(normalized.categories)) {
      normalized.categories = [...normalized.categories].sort();
    }
    
    // Sort any other arrays that might exist
    Object.keys(normalized).forEach(key => {
      if (Array.isArray(normalized[key]) && key !== 'coordinates') {
        normalized[key] = [...normalized[key]].sort();
      }
    });
    
    return normalized;
  }

  private deterministicStringify(obj: any): string {
    if (obj === null || obj === undefined) return 'null';
    if (typeof obj !== 'object') return String(obj);
    if (Array.isArray(obj)) {
      return '[' + obj.map(item => this.deterministicStringify(item)).join(',') + ']';
    }
    
    // Sort object keys for consistent ordering
    const sortedKeys = Object.keys(obj).sort();
    const parts = sortedKeys.map(key => 
      `"${key}":${this.deterministicStringify(obj[key])}`
    );
    
    return '{' + parts.join(',') + '}';
  }

  setCurrentUserId(userId: string | null): void {
    this.currentUserId = userId;
    console.log(`👤 CURRENT USER SET:`, { userId });
  }

  get(type: string, params: any, isGeographic: boolean): any | null {
    const key = this.generateCacheKey(type, params, isGeographic);
    let entry: CacheEntry | undefined;

    if (isGeographic) {
      // Check localStorage for geographic data
      entry = this.getFromLocalStorage(key);
    } else {
      // Check memory for user-specific data
      entry = this.cache.get(key);
    }
    
    if (!entry) {
      // Enhanced debugging for cache misses
      const storageType = isGeographic ? 'localStorage' : 'memory';
      const availableKeys = isGeographic 
        ? this.getLocalStorageKeys() 
        : Array.from(this.cache.keys());
      const similarKeys = availableKeys.filter(k => k.includes(type));
      
      console.log(`❌ CACHE MISS (${storageType}): ${type}`, {
        key,
        keyLength: key.length,
        reason: 'Entry not found',
        storageType,
        availableKeys: availableKeys.slice(0, 10), // Limit for readability
        similarKeys,
        cacheSize: isGeographic ? availableKeys.length : this.cache.size,
        normalizedParams: this.normalizeParams(params)
      });
      
      // Log potential key matches for debugging
      if (similarKeys.length > 0) {
        console.log(`🔍 SIMILAR KEYS FOUND (${storageType}):`, {
          type,
          requestedKey: key,
          similarKeys: similarKeys.slice(0, 5), // Limit for readability
          keyComparison: similarKeys.slice(0, 3).map(sk => ({
            key: sk,
            matches: sk === key,
            difference: this.compareKeys(key, sk)
          }))
        });
      }
      
      return null;
    }

    if (Date.now() > entry.expiry) {
      if (isGeographic) {
        this.removeFromLocalStorage(key);
      } else {
        this.cache.delete(key);
      }
      console.log(`⏰ CACHE EXPIRED (${isGeographic ? 'localStorage' : 'memory'}): ${type}`, {
        key,
        expiredAt: new Date(entry.expiry).toISOString(),
        now: new Date().toISOString()
      });
      return null;
    }

    console.log(`💰 CACHE HIT (${isGeographic ? 'localStorage' : 'memory'}): ${type}`, {
      key,
      dataSize: Array.isArray(entry.data) ? entry.data.length : 'not-array',
      cachedAt: new Date(entry.timestamp).toISOString(),
      expiresAt: new Date(entry.expiry).toISOString(),
      shared: isGeographic
    });
    return entry.data;
  }

  set(type: string, params: any, data: any, isGeographic: boolean, ttl: number = this.DEFAULT_TTL): void {
    const key = this.generateCacheKey(type, params, isGeographic);
    const entry: CacheEntry = {
      data,
      timestamp: Date.now(),
      expiry: Date.now() + ttl
    };

    if (isGeographic) {
      // Store geographic data in localStorage (shared across sessions/users)
      this.setToLocalStorage(key, entry);
    } else {
      // Store user-specific data in memory (session-only)
      this.cache.set(key, entry);
    }

    const storageType = isGeographic ? 'localStorage' : 'memory';
    const totalSize = isGeographic 
      ? this.getLocalStorageKeys().length 
      : this.cache.size;

    console.log(`💾 CACHED (${storageType}): ${type}`, {
      version: APP_VERSION,
      key,
      dataSize: Array.isArray(data) ? data.length : 'not-array',
      ttlMinutes: Math.round(ttl / 60000),
      ttlDays: Math.round(ttl / (24 * 60 * 60 * 1000)),
      expiresAt: new Date(Date.now() + ttl).toISOString(),
      totalCacheSize: totalSize,
      shared: isGeographic,
      persistentAcrossSessions: isGeographic
    });
  }

  private cleanup(): void {
    const now = Date.now();
    // Clean up memory cache (user-specific data)
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiry) {
        this.cache.delete(key);
      }
    }
  }

  private cleanupLocalStorage(): void {
    // Clean up expired geographic data from localStorage
    const keys = this.getLocalStorageKeys();
    let cleanedCount = 0;

    keys.forEach(key => {
      const entry = this.getFromLocalStorage(key);
      if (entry && Date.now() > entry.expiry) {
        this.removeFromLocalStorage(key);
        cleanedCount++;
      }
    });

    if (cleanedCount > 0) {
      console.log(`🧹 LOCALSTORAGE CLEANUP: ${cleanedCount} expired entries removed`);
    }

    // Implement LRU eviction if we exceed max size
    this.enforceLRULimit();
  }

  private hydrateFromLocalStorage(): void {
    const keys = this.getLocalStorageKeys();
    console.log(`🌊 HYDRATING GEOGRAPHIC CACHE: Found ${keys.length} localStorage entries`);
  }

  private getFromLocalStorage(key: string): CacheEntry | undefined {
    try {
      const item = localStorage.getItem(this.LOCAL_STORAGE_PREFIX + key);
      if (!item) return undefined;
      
      const entry = JSON.parse(item) as CacheEntry;
      return entry;
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      return undefined;
    }
  }

  private setToLocalStorage(key: string, entry: CacheEntry): void {
    try {
      localStorage.setItem(this.LOCAL_STORAGE_PREFIX + key, JSON.stringify(entry));
    } catch (error) {
      console.error('Error writing to localStorage:', error);
      // If localStorage is full, clean up and try again
      this.enforceLRULimit();
      try {
        localStorage.setItem(this.LOCAL_STORAGE_PREFIX + key, JSON.stringify(entry));
      } catch (retryError) {
        console.error('Failed to write to localStorage after cleanup:', retryError);
      }
    }
  }

  private removeFromLocalStorage(key: string): void {
    try {
      localStorage.removeItem(this.LOCAL_STORAGE_PREFIX + key);
    } catch (error) {
      console.error('Error removing from localStorage:', error);
    }
  }

  private getLocalStorageKeys(): string[] {
    const keys: string[] = [];
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.LOCAL_STORAGE_PREFIX)) {
          keys.push(key.substring(this.LOCAL_STORAGE_PREFIX.length));
        }
      }
    } catch (error) {
      console.error('Error reading localStorage keys:', error);
    }
    return keys;
  }

  private enforceLRULimit(): void {
    const keys = this.getLocalStorageKeys();
    if (keys.length <= this.MAX_LOCAL_STORAGE_SIZE) return;

    // Get all entries with their timestamps
    const entries = keys.map(key => ({
      key,
      entry: this.getFromLocalStorage(key)
    })).filter(item => item.entry);

    // Sort by timestamp (oldest first)
    entries.sort((a, b) => a.entry!.timestamp - b.entry!.timestamp);

    // Remove oldest entries until we're under the limit
    const toRemove = entries.length - this.MAX_LOCAL_STORAGE_SIZE;
    for (let i = 0; i < toRemove; i++) {
      this.removeFromLocalStorage(entries[i].key);
    }

    console.log(`🗑️ LRU EVICTION: Removed ${toRemove} oldest geographic cache entries`);
  }

  clearAll(): void {
    // Clear memory cache
    this.cache.clear();
    
    // Clear geographic cache from localStorage
    const keys = this.getLocalStorageKeys();
    keys.forEach(key => this.removeFromLocalStorage(key));
    
    console.log(`🧹 ALL CACHE CLEARED for version ${APP_VERSION}: ${keys.length} localStorage + memory entries`);
  }

  // Clear only old version entries
  clearOldVersions(): void {
    const currentVersionPrefix = `v${APP_VERSION}-`;
    
    // Clear old versions from memory
    const memoryKeysToDelete: string[] = [];
    for (const [key] of this.cache.entries()) {
      if (key.startsWith('v') && key.includes('-') && !key.startsWith(currentVersionPrefix)) {
        memoryKeysToDelete.push(key);
      }
    }
    memoryKeysToDelete.forEach(key => this.cache.delete(key));
    
    // Clear old versions from localStorage
    const localStorageKeysToDelete: string[] = [];
    const allLocalKeys = this.getLocalStorageKeys();
    for (const key of allLocalKeys) {
      if (key.startsWith('v') && key.includes('-') && !key.startsWith(currentVersionPrefix)) {
        localStorageKeysToDelete.push(key);
      }
    }
    localStorageKeysToDelete.forEach(key => this.removeFromLocalStorage(key));
    
    const totalCleared = memoryKeysToDelete.length + localStorageKeysToDelete.length;
    console.log(`🧹 OLD VERSION CACHE CLEARED: ${totalCleared} entries removed (${memoryKeysToDelete.length} memory + ${localStorageKeysToDelete.length} localStorage)`);
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

  private compareKeys(key1: string, key2: string): string {
    if (key1 === key2) return 'identical';
    if (key1.length !== key2.length) return `length differs: ${key1.length} vs ${key2.length}`;
    
    // Find first difference
    for (let i = 0; i < Math.min(key1.length, key2.length); i++) {
      if (key1[i] !== key2[i]) {
        return `differs at position ${i}: '${key1.substring(i-5, i+5)}' vs '${key2.substring(i-5, i+5)}'`;
      }
    }
    
    return 'unknown difference';
  }

  getStats(): { size: number; keys: string[]; localStorage: { size: number; keys: string[] } } {
    const localKeys = this.getLocalStorageKeys();
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
      localStorage: {
        size: localKeys.length,
        keys: localKeys
      }
    };
  }
}

export function useRequestCache() {
  const cacheManager = useRef(RequestCacheManager.getInstance());

  const getCached = useCallback((type: string, params: any, isGeographic: boolean) => {
    console.log(`🔍 getCached called:`, { type, isGeographic, params });
    return cacheManager.current.get(type, params, isGeographic);
  }, []);

  const setCached = useCallback((type: string, params: any, data: any, isGeographic: boolean, ttl?: number) => {
    console.log(`🔧 setCached called:`, { type, isGeographic, ttl, params });
    const finalTtl = isGeographic ? cacheManager.current.GEOGRAPHIC_TTL : (ttl || cacheManager.current.DEFAULT_TTL);
    cacheManager.current.set(type, params, data, isGeographic, finalTtl);
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