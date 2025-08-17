import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Hartford, CT coordinates for demo
const DEMO_COORDINATES = { lat: 41.7658, lng: -72.6734 };

// Categories to pre-populate for demo
const DEMO_CATEGORIES = [
  'coffee shops',
  'fitness gyms', 
  'grocery stores',
  'parks recreation',
  'junk removal',
  'personal care',
  'pharmacies',
  'gas stations',
  'doctors',
  'internet providers',
  'banks',
  'hardware stores',
  'furniture stores',
  'cleaning services',
  'DMV',
  'post offices',
  'veterinarians',
  'daycares'
];

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('🚀 Starting demo cache population for Hartford, CT');

    // Check if demo data already exists
    const { data: existingDemo, error: checkError } = await supabase
      .from('recommendations_cache')
      .select('id')
      .like('cache_key', 'DEMO_%')
      .limit(1);

    if (checkError) {
      console.error('Error checking existing demo data:', checkError);
      throw checkError;
    }

    if (existingDemo && existingDemo.length > 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Demo data already exists',
          cached: true 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    }

    const results = [];
    
    // Populate each category
    for (const category of DEMO_CATEGORIES) {
      try {
        console.log(`📍 Populating demo data for: ${category}`);
        
        // Call the existing generate-recommendations function
        const { data: recommendations, error: recError } = await supabase.functions.invoke(
          'generate-recommendations',
          {
            body: {
              coordinates: DEMO_COORDINATES,
              categories: [category],
              userId: null // No user for demo data
            }
          }
        );

        if (recError) {
          console.error(`Error generating recommendations for ${category}:`, recError);
          continue;
        }

        if (recommendations && recommendations.length > 0) {
          // Create demo cache entry with far future expiration
          const demoKey = `DEMO_explore_${category.replace(/\s+/g, '_')}`;
          const expireDate = new Date();
          expireDate.setFullYear(expireDate.getFullYear() + 10); // 10 years from now

          const { error: cacheError } = await supabase
            .from('recommendations_cache')
            .insert({
              cache_key: demoKey,
              user_coordinates: `(${DEMO_COORDINATES.lat},${DEMO_COORDINATES.lng})`,
              categories: [category],
              recommendations: recommendations,
              expires_at: expireDate.toISOString(),
              user_id: null,
              privacy_level: 'demo'
            });

          if (cacheError) {
            console.error(`Error caching demo data for ${category}:`, cacheError);
          } else {
            console.log(`✅ Cached demo data for ${category}: ${recommendations.length} businesses`);
            results.push({
              category,
              businesses: recommendations.length,
              cached: true
            });
          }
        }
      } catch (error) {
        console.error(`Error processing ${category}:`, error);
        results.push({
          category,
          error: error.message,
          cached: false
        });
      }
    }

    console.log('🎉 Demo cache population completed');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Demo cache populated successfully',
        results,
        demoLocation: 'Hartford, CT',
        totalCategories: DEMO_CATEGORIES.length
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in populate-demo-cache:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});