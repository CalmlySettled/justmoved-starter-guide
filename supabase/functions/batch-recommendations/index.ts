import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface BatchRequest {
  id: string;
  type: 'generate-recommendations' | 'filter-recommendations' | 'geocode-address';
  body: any;
}

interface BatchResponse {
  id: string;
  data?: any;
  error?: any;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { requests }: { requests: BatchRequest[] } = await req.json();
    
    if (!Array.isArray(requests) || requests.length === 0) {
      throw new Error('Invalid batch request: requests array is required');
    }

    console.log(`Processing batch of ${requests.length} requests`);

    // Process requests with deduplication
    const processedRequests = new Map<string, Promise<any>>();
    const responses: BatchResponse[] = [];

    for (const request of requests) {
      try {
        // Create a unique key for deduplication
        const requestKey = `${request.type}-${JSON.stringify(request.body)}`;
        
        // Check if we've already processed this exact request
        if (processedRequests.has(requestKey)) {
          console.log(`Reusing result for duplicate request: ${request.id}`);
          const cachedResult = await processedRequests.get(requestKey);
          responses.push({
            id: request.id,
            data: cachedResult.data,
            error: cachedResult.error
          });
          continue;
        }

        // Process new request
        const requestPromise = processRequest(request);
        processedRequests.set(requestKey, requestPromise);
        
        const result = await requestPromise;
        responses.push({
          id: request.id,
          data: result.data,
          error: result.error
        });

      } catch (error) {
        console.error(`Error processing request ${request.id}:`, error);
        responses.push({
          id: request.id,
          error: error.message
        });
      }
    }

    console.log(`Batch processing complete. Original: ${requests.length}, Unique: ${processedRequests.size}`);

    return new Response(
      JSON.stringify({ responses }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Batch processing error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});

async function processRequest(request: BatchRequest): Promise<{ data?: any, error?: any }> {
  try {
    switch (request.type) {
      case 'generate-recommendations':
        return await callGenerateRecommendations(request.body);
      
      case 'filter-recommendations':
        return await callFilterRecommendations(request.body);
      
      case 'geocode-address':
        return await callGeocodeAddress(request.body);
      
      default:
        throw new Error(`Unknown request type: ${request.type}`);
    }
  } catch (error) {
    return { error: error.message };
  }
}

async function callGenerateRecommendations(body: any) {
  const response = await fetch(`${supabaseUrl}/functions/v1/generate-recommendations`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${supabaseServiceKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Generate recommendations failed: ${errorText}`);
  }

  return { data: await response.json() };
}

async function callFilterRecommendations(body: any) {
  const response = await fetch(`${supabaseUrl}/functions/v1/filter-recommendations`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${supabaseServiceKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Filter recommendations failed: ${errorText}`);
  }

  return { data: await response.json() };
}

async function callGeocodeAddress(body: any) {
  const response = await fetch(`${supabaseUrl}/functions/v1/geocode-address`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${supabaseServiceKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Geocode address failed: ${errorText}`);
  }

  return { data: await response.json() };
}