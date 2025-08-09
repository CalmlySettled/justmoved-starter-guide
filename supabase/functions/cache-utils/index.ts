import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Get app version from request or use default
function getAppVersion(headers: Headers): string {
  return headers.get('x-app-version') || '1.0.0';
}

// Generate versioned cache key for backend
function generateVersionedCacheKey(baseKey: string, version: string): string {
  return `v${version}-${baseKey}`;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { action, data } = await req.json();
    const appVersion = getAppVersion(req.headers);

    switch (action) {
      case 'clear-old-versions': {
        // Clear old version entries from recommendations_cache
        const { error } = await supabase
          .from('recommendations_cache')
          .delete()
          .not('cache_key', 'like', `v${appVersion}-%`);

        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true, clearedVersion: appVersion }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'update-cache-version': {
        const { coordinates, categories, cacheData } = data;
        
        // Generate old and new cache keys
        const baseKey = `${coordinates.lat.toFixed(4)},${coordinates.lng.toFixed(4)}-${categories.sort().join(',')}`;
        const versionedKey = generateVersionedCacheKey(baseKey, appVersion);

        // Update cache with versioned key
        const { error } = await supabase
          .from('recommendations_cache')
          .upsert({
            cache_key: versionedKey,
            user_coordinates: `(${coordinates.lat},${coordinates.lng})`,
            categories: categories,
            recommendations: cacheData,
            preferences: {},
            expires_at: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000).toISOString() // 120 days
          });

        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true, cacheKey: versionedKey }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'get-version-stats': {
        // Get cache statistics by version
        const { data: cacheEntries, error } = await supabase
          .from('recommendations_cache')
          .select('cache_key, created_at')
          .gte('expires_at', new Date().toISOString());

        if (error) throw error;

        const versionStats = cacheEntries.reduce((acc: any, entry: any) => {
          const versionMatch = entry.cache_key.match(/^v([^-]+)-/);
          const version = versionMatch ? versionMatch[1] : 'unversioned';
          
          if (!acc[version]) acc[version] = 0;
          acc[version]++;
          
          return acc;
        }, {});

        return new Response(
          JSON.stringify({ 
            success: true, 
            versionStats, 
            currentVersion: appVersion,
            totalEntries: cacheEntries.length 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

  } catch (error) {
    console.error('Cache utils error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});