import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('🧹 Starting cache cleanup...');

    // Clear recommendations cache (especially recent entries that might have wrong location data)
    const { error: recError } = await supabaseClient
      .from('recommendations_cache')
      .delete()
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()); // Last 24 hours

    if (recError) {
      console.error('Error clearing recommendations cache:', recError);
    } else {
      console.log('✅ Cleared recent recommendations cache entries');
    }

    // Clear business cache (especially recent entries that might have wrong location data)
    const { error: bizError } = await supabaseClient
      .from('business_cache')
      .delete()
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()); // Last 24 hours

    if (bizError) {
      console.error('Error clearing business cache:', bizError);
    } else {
      console.log('✅ Cleared recent business cache entries');
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Cache cleared successfully',
        cleared_time: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Cache cleanup error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});