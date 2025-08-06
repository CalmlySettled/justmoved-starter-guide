import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.0';

// Geographic coordinate rounding for better cache efficiency
function roundCoordinates(lat: number, lng: number): { lat: number, lng: number } {
  return {
    lat: Math.round(lat * 33.33) / 33.33,
    lng: Math.round(lng * 33.33) / 33.33
  };
}

// Simplified cache key generation
export function generateSimpleCacheKey(lat: number, lng: number, categories: string[], mode: 'popular' | 'explore' = 'explore'): string {
  const roundedCoords = roundCoordinates(lat, lng);
  const sortedCategories = categories.sort().join('_');
  return `${mode}_${roundedCoords.lat.toFixed(3)}_${roundedCoords.lng.toFixed(3)}_${sortedCategories}`;
}

// Cache recommendations
export async function cacheRecommendations(
  supabase: any,
  cacheKey: string,
  recommendations: any,
  lat: number,
  lng: number,
  categories: string[],
  daysToCache: number = 180
): Promise<void> {
  try {
    const roundedCoords = roundCoordinates(lat, lng);
    await supabase
      .from('recommendations_cache')
      .insert({
        cache_key: cacheKey,
        recommendations: recommendations,
        user_coordinates: `(${roundedCoords.lat},${roundedCoords.lng})`,
        categories: categories,
        expires_at: new Date(Date.now() + daysToCache * 24 * 60 * 60 * 1000).toISOString()
      });
    console.log(`💾 Cached recommendations for ${daysToCache} days`);
  } catch (error) {
    console.error('Failed to cache recommendations:', error);
    // Don't throw error to prevent caching failures from breaking the API
  }
}

// Get cached recommendations
export async function getCachedRecommendations(
  supabase: any,
  cacheKey: string
): Promise<any> {
  try {
    const { data: cachedData } = await supabase
      .from('recommendations_cache')
      .select('recommendations, created_at')
      .eq('cache_key', cacheKey)
      .gt('expires_at', new Date().toISOString())
      .single();
    
    return cachedData?.recommendations || null;
  } catch (error) {
    console.log('No cached data found:', error);
    return null;
  }
}