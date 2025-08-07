import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { place_id, business_name } = await req.json();

    if (!place_id) {
      throw new Error('place_id is required');
    }

    console.log(`Fetching details for business: ${business_name}, place_id: ${place_id}`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check cache first
    const cacheKey = `details_${place_id}`;
    const { data: cachedData } = await supabase
      .from('recommendations_cache')
      .select('recommendations')
      .eq('cache_key', cacheKey)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (cachedData) {
      console.log(`Returning cached details for ${business_name}`);
      return new Response(JSON.stringify(cachedData.recommendations), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch from Google Places Details API
    const googleApiKey = Deno.env.get('GOOGLE_PLACES_API_KEY');
    if (!googleApiKey) {
      throw new Error('Google Places API key not configured');
    }

    const fields = 'website,formatted_phone_number,opening_hours,business_status';
    const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place_id}&fields=${fields}&key=${googleApiKey}`;
    
    console.log(`Making Google Places Details API call for ${business_name}`);
    const response = await fetch(detailsUrl);
    const data = await response.json();

    if (data.status !== 'OK') {
      console.error(`Google Places API error for ${business_name}:`, data.status);
      throw new Error(`Google Places API error: ${data.status}`);
    }

    const result = data.result;
    const businessDetails = {
      website: result.website || null,
      phone: result.formatted_phone_number || null,
      opening_hours: result.opening_hours?.weekday_text || null,
      business_status: result.business_status || null,
      fetched_at: new Date().toISOString()
    };

    // Cache the results for 180 days
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 180);

    await supabase
      .from('recommendations_cache')
      .upsert({
        cache_key: cacheKey,
        recommendations: businessDetails,
        expires_at: expiresAt.toISOString(),
        created_at: new Date().toISOString()
      });

    console.log(`Successfully fetched and cached details for ${business_name}`);

    return new Response(JSON.stringify(businessDetails), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in get-business-details function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      details: null 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});