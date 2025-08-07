import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Starting cache cleanup job...');
    
    // Background cleanup task
    EdgeRuntime.waitUntil((async () => {
      // Clean expired recommendations cache
      const { data: expiredRec, error: recError } = await supabaseClient
        .from('recommendations_cache')
        .delete()
        .lt('expires_at', new Date().toISOString());
        
      if (recError) {
        console.error('Error cleaning recommendations cache:', recError);
      } else {
        console.log(`Cleaned ${expiredRec?.length || 0} expired recommendation entries`);
      }
      
      // Clean expired business cache
      const { data: expiredBus, error: busError } = await supabaseClient
        .from('business_cache')
        .delete()
        .lt('expires_at', new Date().toISOString());
        
      if (busError) {
        console.error('Error cleaning business cache:', busError);
      } else {
        console.log(`Cleaned ${expiredBus?.length || 0} expired business entries`);
      }
      
      // Get final stats
      const { data: stats } = await supabaseClient.rpc('get_cache_stats');
      console.log('Cleanup complete. Cache stats:', stats);
    })());

    return new Response(JSON.stringify({ 
      message: 'Cache cleanup initiated',
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in cleanup-cache:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});