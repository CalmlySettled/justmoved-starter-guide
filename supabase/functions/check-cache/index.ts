import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Simple coordinate rounding for cache key consistency (~2 mile precision)
function roundCoordinates(lat: number, lng: number): { lat: number; lng: number } {
  return {
    lat: Math.round(lat / 0.02) * 0.02, // Round to nearest 0.02 degrees (~2 mile precision)
    lng: Math.round(lng / 0.02) * 0.02
  };
}

// Generate simplified cache key for backend lookup
function generateSimpleCacheKey(coordinates: { lat: number; lng: number }, categories: string[], version?: string): string {
  const rounded = roundCoordinates(coordinates.lat, coordinates.lng);
  const categoryString = categories.sort().join(',');
  const baseKey = `explore_${rounded.lat.toFixed(2)}_${rounded.lng.toFixed(2)}_${categoryString}`;
  
  return version ? `v${version}-${baseKey}` : baseKey;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { coordinates, categories } = await req.json();
    const appVersion = req.headers.get('x-app-version') || '1.0.0';
    
    if (!coordinates?.lat || !coordinates?.lng || !categories?.length) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with service role to bypass RLS for cache access
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const cacheKey = generateSimpleCacheKey(coordinates, categories, appVersion);
    const roundedCoords = roundCoordinates(coordinates.lat, coordinates.lng);
    
    console.log(`🔍 VERSIONED BACKEND CACHE CHECK:`, {
      cacheKey,
      coordinates,
      roundedCoords,
      categories,
      version: appVersion
    });

    // Check for exact cache match
    const { data: exactMatch, error: exactError } = await supabase
      .from('recommendations_cache')
      .select('recommendations, cache_key, created_at, expires_at')
      .eq('cache_key', cacheKey)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (exactMatch && !exactError) {
      console.log(`💰 BACKEND CACHE HIT FOUND!`, {
        cacheKey: cacheKey.substring(0, 50) + '...',
        cacheAgeHours: Math.floor((new Date().getTime() - new Date(exactMatch.created_at).getTime()) / (1000 * 60 * 60)),
        categories: Object.keys(exactMatch.recommendations || {}),
        expiresAt: exactMatch.expires_at
      });

      // Extract results for requested categories
      const results: any = {};
      for (const category of categories) {
        if (exactMatch.recommendations?.[category]) {
          results[category] = exactMatch.recommendations[category];
        }
      }

      return new Response(
        JSON.stringify({ 
          cached: true, 
          data: results,
          cacheAge: Math.floor((new Date().getTime() - new Date(exactMatch.created_at).getTime()) / (1000 * 60 * 60))
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Try fuzzy geographic matching within region
    const latRange = 0.01; // ~1km range
    const lngRange = 0.01;
    
    const { data: fuzzyMatches, error: fuzzyError } = await supabase
      .from('recommendations_cache')
      .select('recommendations, cache_key, created_at, expires_at')
      .overlaps('categories', categories)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(5);

    if (fuzzyMatches && fuzzyMatches.length > 0 && !fuzzyError) {
      // Find the best geographic match
      for (const match of fuzzyMatches) {
        const results: any = {};
        let hasResults = false;
        
        for (const category of categories) {
          if (match.recommendations?.[category]?.length > 0) {
            results[category] = match.recommendations[category];
            hasResults = true;
          }
        }
        
        if (hasResults) {
          console.log(`💰 BACKEND FUZZY CACHE HIT!`, {
            cacheKey: match.cache_key.substring(0, 50) + '...',
            foundCategories: Object.keys(results),
            cacheAgeHours: Math.floor((new Date().getTime() - new Date(match.created_at).getTime()) / (1000 * 60 * 60))
          });
          
          return new Response(
            JSON.stringify({ 
              cached: true, 
              data: results,
              cacheAge: Math.floor((new Date().getTime() - new Date(match.created_at).getTime()) / (1000 * 60 * 60)),
              fuzzy: true
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }

    console.log(`❌ BACKEND CACHE MISS:`, {
      searchedKey: cacheKey.substring(0, 50) + '...',
      categories,
      coordinates
    });

    return new Response(
      JSON.stringify({ cached: false }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ CACHE CHECK ERROR:', error);
    return new Response(
      JSON.stringify({ error: 'Cache check failed', cached: false }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});