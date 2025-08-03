import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Force deployment refresh - function ready for sub-filtering

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FilterRequest {
  category: string;
  filter: string;
  location?: string;
  radius?: number;
  userId?: string;
}

interface Business {
  place_id: string;
  name: string;
  address: string;
  description: string;
  phone?: string;
  website?: string;
  features: string[];
  rating?: number;
  review_count?: number;
  hours?: string;
  image?: string;
  latitude?: number;
  longitude?: number;
}

const getFilterSearchTerms = (category: string, filter: string): string[] => {
  const searchMap: Record<string, Record<string, string[]>> = {
    "Medical care": {
      "dental care": ["dentist", "dental office", "dental clinic"],
      "vision care": ["optometrist", "eye doctor", "vision center"],
      "urgent care": ["urgent care", "walk-in clinic", "immediate care"],
      "specialty care": ["specialist", "medical specialist", "specialty clinic"],
      "mental health": ["therapist", "counselor", "mental health clinic"],
      "pharmacy": ["pharmacy", "drugstore", "prescription"]
    },
    "Parks and recreation": {
      "dog parks": ["dog park", "pet park", "off-leash park"],
      "playgrounds": ["playground", "children's park", "family park"],
      "hiking trails": ["hiking trail", "nature trail", "walking trail"],
      "sports facilities": ["sports complex", "recreation center", "gym"],
      "community centers": ["community center", "recreation center"]
    },
    "Grocery stores": {
      "organic": ["organic grocery", "natural foods", "health food store"],
      "international": ["international grocery", "ethnic market", "specialty foods"],
      "specialty": ["specialty grocery", "gourmet market", "artisan foods"],
      "bulk": ["bulk foods", "warehouse store", "wholesale grocery"]
    },
    "Restaurants": {
      "family-friendly": ["family restaurant", "kid-friendly restaurant"],
      "fine dining": ["fine dining", "upscale restaurant", "gourmet restaurant"],
      "fast casual": ["fast casual", "quick service restaurant"],
      "takeout": ["takeout restaurant", "delivery restaurant"],
      "dietary restrictions": ["gluten-free restaurant", "vegan restaurant", "allergen-friendly"]
    }
  };

  return searchMap[category]?.[filter] || [filter];
};

// Generate session token for cost optimization
function generateSessionToken(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

const searchGooglePlaces = async (searchTerms: string[], location: string, radius: number = 10000): Promise<Business[]> => {
  const apiKey = Deno.env.get('GOOGLE_PLACES_API_KEY');
  if (!apiKey) {
    throw new Error('Google Places API key not configured');
  }

  // COST OPTIMIZATION: Generate session token
  const sessionToken = generateSessionToken();
  console.log(`Using session token for cost optimization: ${sessionToken.substring(0, 8)}...`);

  const businesses: Business[] = [];
  
  // COST OPTIMIZATION: Use FieldMask to only request essential fields
  const nearbySearchFields = 'place_id,name,vicinity,geometry,rating,user_ratings_total,types,photos,price_level,opening_hours';

  for (const term of searchTerms) {
    try {
      const searchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(`${term} near ${location}`)}&radius=${radius}&fields=${nearbySearchFields}&sessiontoken=${sessionToken}&key=${apiKey}`;
      
      const response = await fetch(searchUrl);
      const data = await response.json();
      
      if (data.results) {
        for (const place of data.results.slice(0, 8)) { // COST REDUCTION: Reduced from 10 to 8
          // COST OPTIMIZATION: Only get photos for highly rated businesses
          let imageUrl = '';
          if (place.photos && place.photos.length > 0 && (place.rating || 0) >= 4.0) {
            const photoReference = place.photos[0].photo_reference;
            imageUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=300&photoreference=${photoReference}&sessiontoken=${sessionToken}&key=${apiKey}`;
          }

          const business: Business = {
            place_id: place.place_id,
            name: place.name,
            address: place.formatted_address || place.vicinity || '',
            description: `${place.types?.join(', ') || ''} - ${place.name}`,
            rating: place.rating,
            features: place.types || [],
            latitude: place.geometry?.location?.lat,
            longitude: place.geometry?.location?.lng,
            image: imageUrl
          };
          
          // Avoid duplicates
          if (!businesses.find(b => b.place_id === business.place_id)) {
            businesses.push(business);
          }
        }
      }
    } catch (error) {
      console.error(`Error searching for ${term}:`, error);
    }
  }
  
  return businesses.slice(0, 15); // COST REDUCTION: Reduced from 20 to 15
};

const getCachedResults = async (supabase: any, cacheKey: string): Promise<Business[] | null> => {
  const { data } = await supabase
    .from('recommendations_cache')
    .select('cached_data')
    .eq('cache_key', cacheKey)
    .gt('expires_at', new Date().toISOString())
    .single();
    
  return data?.cached_data || null;
};

const cacheResults = async (supabase: any, cacheKey: string, results: Business[]) => {
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 2); // Cache for 2 hours
  
  await supabase
    .from('recommendations_cache')
    .upsert({
      cache_key: cacheKey,
      cached_data: results,
      expires_at: expiresAt.toISOString()
    });
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const { category, filter, location, radius = 10000, userId }: FilterRequest = await req.json();
    
    if (!category || !filter) {
      throw new Error('Category and filter are required');
    }

    const cacheKey = `filter_${category}_${filter}_${location}_${radius}`;
    
    // Check cache first
    let businesses = await getCachedResults(supabaseClient, cacheKey);
    
    if (!businesses) {
      console.log(`Cache miss for ${cacheKey}, fetching from API`);
      
      if (!location) {
        throw new Error('Location is required for new searches');
      }
      
      const searchTerms = getFilterSearchTerms(category, filter);
      businesses = await searchGooglePlaces(searchTerms, location, radius);
      
      // Cache the results
      await cacheResults(supabaseClient, cacheKey, businesses);
    } else {
      console.log(`Cache hit for ${cacheKey}`);
    }

    // Format the response with sub-category name
    const subCategoryName = `${category} - ${filter.charAt(0).toUpperCase() + filter.slice(1)}`;
    const response = {
      [subCategoryName]: businesses
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in filter-recommendations:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});