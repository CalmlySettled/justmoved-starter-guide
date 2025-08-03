// Frontend API optimization utilities for cost reduction

interface CacheItem {
  data: any;
  timestamp: number;
  expiry: number;
}

class APICache {
  private cache = new Map<string, CacheItem>();
  private readonly DEFAULT_TTL = 15 * 60 * 1000; // 15 minutes

  set(key: string, data: any, ttl: number = this.DEFAULT_TTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expiry: Date.now() + ttl
    });
  }

  get(key: string): any | null {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }
    
    return item.data;
  }

  clear(): void {
    this.cache.clear();
  }

  // Generate smart cache key based on location precision
  generateLocationKey(lat: number, lng: number, radius: number = 5000): string {
    // Round coordinates to reduce cache misses for nearby locations
    const precision = radius > 10000 ? 2 : 3;
    const roundedLat = Number(lat.toFixed(precision));
    const roundedLng = Number(lng.toFixed(precision));
    return `location_${roundedLat}_${roundedLng}_${radius}`;
  }

  // Generate cache key for category searches
  generateCategoryKey(category: string, locationKey: string): string {
    return `category_${category}_${locationKey}`;
  }
}

// Rate limiting for frontend API calls
class RateLimiter {
  private requests = new Map<string, number[]>();
  private readonly WINDOW_SIZE = 60000; // 1 minute
  private readonly MAX_REQUESTS = 10; // per minute per user

  canMakeRequest(userId: string): boolean {
    const now = Date.now();
    const userRequests = this.requests.get(userId) || [];
    
    // Remove old requests
    const recentRequests = userRequests.filter(time => now - time < this.WINDOW_SIZE);
    
    if (recentRequests.length >= this.MAX_REQUESTS) {
      return false;
    }
    
    // Add current request
    recentRequests.push(now);
    this.requests.set(userId, recentRequests);
    
    return true;
  }
}

// Singleton instances
export const apiCache = new APICache();
export const rateLimiter = new RateLimiter();

// Cache-first API call wrapper
export async function cachedApiCall<T>(
  cacheKey: string,
  apiCall: () => Promise<T>,
  ttl?: number
): Promise<T> {
  // Check cache first
  const cached = apiCache.get(cacheKey);
  if (cached) {
    console.log(`Cache hit for key: ${cacheKey}`);
    return cached;
  }

  // Make API call
  console.log(`Cache miss for key: ${cacheKey}, making API call`);
  const result = await apiCall();
  
  // Cache result
  apiCache.set(cacheKey, result, ttl);
  
  return result;
}

// Batch request helper
export function batchRequests<T>(
  requests: Array<() => Promise<T>>,
  batchSize: number = 3,
  delay: number = 100
): Promise<T[]> {
  return new Promise(async (resolve) => {
    const results: T[] = [];
    
    for (let i = 0; i < requests.length; i += batchSize) {
      const batch = requests.slice(i, i + batchSize);
      const batchResults = await Promise.all(batch.map(req => req()));
      results.push(...batchResults);
      
      // Add delay between batches to respect rate limits
      if (i + batchSize < requests.length) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    resolve(results);
  });
}

// Location precision helper
export function optimizeLocationPrecision(lat: number, lng: number, radiusKm: number = 5): { lat: number; lng: number } {
  // Reduce precision for larger search areas to improve cache hits
  const precision = radiusKm > 10 ? 2 : radiusKm > 5 ? 3 : 4;
  
  return {
    lat: Number(lat.toFixed(precision)),
    lng: Number(lng.toFixed(precision))
  };
}