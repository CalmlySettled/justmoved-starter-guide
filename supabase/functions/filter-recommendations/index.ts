import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Force deployment refresh - function ready for sub-filtering

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Business caching helper with database integration
async function getCachedBusinessDetails(supabase: any, placeId: string, apiKey: string): Promise<{
  phone?: string;
  website?: string;
  hours?: any;
  photoUrl?: string;
} | null> {
  if (!placeId) return null;
  
  // Check business cache first
  const { data: cached } = await supabase
    .from('business_cache')
    .select('phone, website, opening_hours, photo_url')
    .eq('place_id', placeId)
    .gt('expires_at', new Date().toISOString())
    .single();
    
  if (cached) {
    console.log(`Business cache hit for ${placeId}`);
    return {
      phone: cached.phone,
      website: cached.website,
      hours: cached.opening_hours,
      photoUrl: cached.photo_url
    };
  }
  
  console.log(`Business cache miss for ${placeId}, fetching details`);
  
  // Fetch from Google Places Details API
  try {
    const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=formatted_phone_number,website,opening_hours,photos&key=${apiKey}`;
    const response = await fetch(detailsUrl);
    const data = await response.json();
    
    if (data.result) {
      const result = data.result;
      const photoUrl = result.photos?.[0]?.photo_reference 
        ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${result.photos[0].photo_reference}&key=${apiKey}`
        : undefined;
      
      // Cache in database for 180 days
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 180);
      
      await supabase
        .from('business_cache')
        .upsert({
          place_id: placeId,
          phone: result.formatted_phone_number,
          website: result.website,
          opening_hours: result.opening_hours,
          photo_url: photoUrl,
          expires_at: expiresAt.toISOString()
        });
      
      return {
        phone: result.formatted_phone_number,
        website: result.website,
        hours: result.opening_hours,
        photoUrl: photoUrl
      };
    }
  } catch (error) {
    console.error(`Error fetching details for ${placeId}:`, error);
  }
  
  return null;
}

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

const searchGooglePlaces = async (searchTerms: string[], location: string, radius: number = 10000, supabase: any): Promise<Business[]> => {
  const apiKey = Deno.env.get('GOOGLE_PLACES_API_KEY');
  if (!apiKey) {
    throw new Error('Google Places API key not configured');
  }

  const businesses: Business[] = [];
  
  for (const term of searchTerms) {
    try {
      const searchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(`${term} near ${location}`)}&radius=${radius}&key=${apiKey}`;
      
      const response = await fetch(searchUrl);
      const data = await response.json();
      
      if (data.results) {
        for (const place of data.results.slice(0, 10)) {
          // Get cached business details (phone, website, hours, photo)
          const businessDetails = await getCachedBusinessDetails(supabase, place.place_id, apiKey);
          
          const business: Business = {
            place_id: place.place_id,
            name: place.name,
            address: place.formatted_address || '',
            description: `${place.types?.join(', ') || ''} - ${place.name}`,
            rating: place.rating,
            features: place.types || [],
            latitude: place.geometry?.location?.lat,
            longitude: place.geometry?.location?.lng,
            phone: businessDetails?.phone,
            website: businessDetails?.website,
            hours: businessDetails?.hours ? JSON.stringify(businessDetails.hours) : undefined,
            image: businessDetails?.photoUrl || place.photos?.[0]?.photo_reference 
              ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${place.photos[0].photo_reference}&key=${apiKey}`
              : undefined
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
  
  return businesses.slice(0, 20); // Limit results
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
      businesses = await searchGooglePlaces(searchTerms, location, radius, supabaseClient);
      
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