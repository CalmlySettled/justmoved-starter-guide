import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.0';
import { handleExploreMode, handlePopularMode, handleStandardMode } from './api-handlers.ts';
import { RequestBody } from './types.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Rate limiting setup
const rateLimiter = new Map();
const RATE_LIMIT = 20;
const RATE_WINDOW = 60000;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Initialize Supabase client
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Rate limiting check
    const clientIP = req.headers.get('x-forwarded-for') || 'unknown';
    const now = Date.now();
    const userLimit = rateLimiter.get(clientIP);
    
    if (userLimit) {
      if (now < userLimit.resetTime) {
        if (userLimit.count >= RATE_LIMIT) {
          console.warn(`Rate limit exceeded for IP: ${clientIP}`);
          return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
            status: 429,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        userLimit.count++;
      } else {
        rateLimiter.set(clientIP, { count: 1, resetTime: now + RATE_WINDOW });
      }
    } else {
      rateLimiter.set(clientIP, { count: 1, resetTime: now + RATE_WINDOW });
    }

    const requestBody: RequestBody = await req.json();
    console.log('Request received:', JSON.stringify(requestBody, null, 2));
    
    // Route to appropriate handler
    if (requestBody.exploreMode) {
      return await handleExploreMode(supabase, requestBody);
    } else if (requestBody.popularMode) {
      return await handlePopularMode(supabase, requestBody);
    } else {
      return await handleStandardMode(supabase, requestBody);
    }
    
  } catch (error: any) {
    console.error('Error in generate-recommendations function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
});