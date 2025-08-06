import { generateSimpleCacheKey, getCachedRecommendations, cacheRecommendations } from './cache-manager.ts';
import { RequestBody } from './types.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Handle explore mode requests
export async function handleExploreMode(
  supabase: any,
  requestBody: RequestBody
): Promise<Response> {
  const { latitude, longitude, categories } = requestBody;
  
  if (!latitude || !longitude || !categories?.length) {
    return new Response(JSON.stringify({ error: 'Missing required parameters' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const coordinates = { lat: latitude, lng: longitude };
  const cacheKey = generateSimpleCacheKey(coordinates.lat, coordinates.lng, categories, 'explore');
  
  console.log(`🔍 EXPLORE CACHE LOOKUP: ${cacheKey}`);
  
  // Check for cached results
  const cachedRecommendations = await getCachedRecommendations(supabase, cacheKey);
  
  if (cachedRecommendations) {
    console.log('💰 RETURNING CACHED EXPLORE RESULTS');
    return new Response(JSON.stringify({ recommendations: cachedRecommendations }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  // Generate new recommendations (simplified for now)
  const recommendations = {};
  for (const category of categories) {
    recommendations[category] = []; // Placeholder
  }

  // Cache the results for 180 days
  await cacheRecommendations(supabase, cacheKey, recommendations, latitude, longitude, categories, 180);
  
  return new Response(JSON.stringify({ recommendations }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

// Handle popular mode requests  
export async function handlePopularMode(
  supabase: any,
  requestBody: RequestBody
): Promise<Response> {
  const { latitude, longitude, categories } = requestBody;
  
  if (!latitude || !longitude || !categories?.length) {
    return new Response(JSON.stringify({ error: 'Missing required parameters' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const coordinates = { lat: latitude, lng: longitude };
  const cacheKey = generateSimpleCacheKey(coordinates.lat, coordinates.lng, categories, 'popular');
  
  console.log(`🔍 POPULAR CACHE LOOKUP: ${cacheKey}`);
  
  // Check for cached results
  const cachedRecommendations = await getCachedRecommendations(supabase, cacheKey);
  
  if (cachedRecommendations) {
    console.log('💰 RETURNING CACHED POPULAR RESULTS');
    return new Response(JSON.stringify({ recommendations: cachedRecommendations }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  // Generate new recommendations (simplified for now)
  const recommendations = {};
  for (const category of categories) {
    recommendations[category] = []; // Placeholder  
  }

  // Cache the results for 7 days
  await cacheRecommendations(supabase, cacheKey, recommendations, latitude, longitude, categories, 7);
  
  return new Response(JSON.stringify({ recommendations }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

// Handle standard quiz-based requests
export async function handleStandardMode(
  supabase: any,
  requestBody: RequestBody
): Promise<Response> {
  const { quizResponse, userId } = requestBody;
  
  if (!quizResponse) {
    return new Response(JSON.stringify({ error: 'Missing quiz response' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  console.log('Generating standard recommendations...');
  
  // Simplified recommendation generation
  const recommendations = {
    'Grocery stores': [],
    'Fitness centers': [],
    'Restaurants': []
  };
  
  return new Response(JSON.stringify({
    recommendations,
    fromCache: false,
    costOptimized: true,
    recommendationEngine: 'standard'
  }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders
    }
  });
}