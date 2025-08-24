import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Function to calculate distance between two points
const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 3959; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { userLocation, categories }: { 
      userLocation: string; 
      categories: string[];
    } = await req.json()

    if (!userLocation || !categories || !Array.isArray(categories)) {
      return new Response(
        JSON.stringify({ error: 'User location and categories are required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Parse user coordinates
    const [userLat, userLng] = userLocation.split(',').map(Number);
    if (isNaN(userLat) || isNaN(userLng)) {
      return new Response(
        JSON.stringify({ error: 'Invalid coordinates format' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log(`🔍 CHECKING MANUAL CURATION for location: ${userLocation}, categories: ${categories.join(', ')}`);

    // Find properties within a reasonable distance (5 miles) that have manual curation
    const { data: properties, error: propertiesError } = await supabase
      .from('properties')
      .select('id, latitude, longitude, curation_status, total_curated_places')
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)
      .eq('curation_status', 'completed')
      .gt('total_curated_places', 0);

    if (propertiesError) {
      console.error('Error fetching properties:', propertiesError);
      return new Response(
        JSON.stringify({ manual_curation_found: false }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find the closest property with curation within 5 miles
    let closestProperty = null;
    let closestDistance = Infinity;

    for (const property of properties || []) {
      const distance = calculateDistance(userLat, userLng, property.latitude, property.longitude);
      if (distance <= 5 && distance < closestDistance) {
        closestDistance = distance;
        closestProperty = property;
      }
    }

    if (!closestProperty) {
      console.log('❌ No manual curation found within 5 miles');
      return new Response(
        JSON.stringify({ manual_curation_found: false }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`✅ Found manual curation at property ${closestProperty.id}, distance: ${closestDistance.toFixed(2)} miles`);

    // Fetch curated places for the requested categories
    const { data: curatedPlaces, error: curatedError } = await supabase
      .from('curated_property_places')
      .select('*')
      .eq('property_id', closestProperty.id)
      .in('category', categories)
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (curatedError) {
      console.error('Error fetching curated places:', curatedError);
      return new Response(
        JSON.stringify({ manual_curation_found: false }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!curatedPlaces || curatedPlaces.length === 0) {
      console.log('❌ No curated places found for requested categories');
      return new Response(
        JSON.stringify({ manual_curation_found: false }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Transform curated places to match the expected format
    const recommendations: Record<string, any[]> = {};
    
    for (const place of curatedPlaces) {
      if (!recommendations[place.category]) {
        recommendations[place.category] = [];
      }

      recommendations[place.category].push({
        name: place.business_name,
        address: place.business_address,
        phone: place.business_phone,
        website: place.business_website,
        description: place.business_description,
        features: place.business_features || [],
        latitude: place.latitude,
        longitude: place.longitude,
        distance_miles: place.distance_miles,
        place_id: place.place_id,
        photo_url: place.photo_url,
        rating: place.rating,
        subfilter_tags: place.subfilter_tags || [],
        source: 'manual_curation',
        property_distance: closestDistance
      });
    }

    console.log(`💰 MANUAL CURATION SUCCESS: Found ${curatedPlaces.length} curated places for ${Object.keys(recommendations).length} categories`);

    return new Response(
      JSON.stringify({
        manual_curation_found: true,
        property_id: closestProperty.id,
        property_distance_miles: closestDistance,
        recommendations,
        cache_source: 'manual_curation'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in check-manual-curation function:', error);
    return new Response(
      JSON.stringify({ 
        manual_curation_found: false,
        error: 'Internal server error'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
})