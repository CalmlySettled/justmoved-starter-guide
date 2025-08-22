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
      "dental care": ["dentist", "dental office", "dental clinic", "dental practice"],
      "vision care": ["optometrist", "eye doctor", "vision center", "optical shop"],
      "urgent care": ["urgent care", "walk-in clinic", "immediate care", "urgent care center"],
      "specialty care": ["specialist", "medical specialist", "specialty clinic", "specialized medicine"],
      "mental health": ["therapist", "counselor", "mental health clinic", "psychology practice", "psychiatrist"],
      "pharmacy": ["pharmacy", "drugstore", "prescription", "CVS", "Walgreens", "Rite Aid"],
      "primary care": ["family doctor", "primary care physician", "family medicine", "general practitioner"],
      "pediatric": ["pediatrician", "children's doctor", "pediatric clinic", "kids doctor"]
    },
    "Parks and recreation": {
      "dog parks": ["dog park", "pet park", "off-leash park", "dog run"],
      "playgrounds": ["playground", "children's park", "family park", "kids playground"],
      "hiking trails": ["hiking trail", "nature trail", "walking trail", "hiking path"],
      "sports facilities": ["sports complex", "recreation center", "gym", "athletic facility"],
      "community centers": ["community center", "recreation center", "civic center"],
      "swimming": ["public pool", "swimming pool", "aquatic center", "community pool"],
      "tennis": ["tennis court", "tennis club", "tennis facility"],
      "basketball": ["basketball court", "public court", "outdoor court"]
    },
    "Grocery stores": {
      "organic": ["organic grocery", "natural foods", "health food store", "whole foods", "organic market"],
      "international": ["international grocery", "ethnic market", "specialty foods", "asian market", "hispanic market"],
      "specialty": ["specialty grocery", "gourmet market", "artisan foods", "upscale grocery"],
      "bulk": ["bulk foods", "warehouse store", "wholesale grocery", "costco", "sam's club"],
      "budget": ["discount grocery", "affordable grocery", "budget supermarket", "walmart", "aldi"],
      "convenience": ["convenience store", "corner store", "7-eleven", "quick mart"]
    },
    "Restaurants": {
      "family-friendly": ["family restaurant", "kid-friendly restaurant", "family dining", "children welcome"],
      "fine dining": ["fine dining", "upscale restaurant", "gourmet restaurant", "haute cuisine"],
      "fast casual": ["fast casual", "quick service restaurant", "counter service"],
      "takeout": ["takeout restaurant", "delivery restaurant", "to-go food"],
      "vegan": ["vegan restaurant", "plant-based restaurant", "vegan food"],
      "vegetarian": ["vegetarian restaurant", "vegetarian friendly", "veggie restaurant"],
      "gluten-free": ["gluten-free restaurant", "celiac-friendly", "gluten-free menu"],
      "pizza": ["pizza restaurant", "pizzeria", "pizza place"],
      "chinese": ["chinese restaurant", "chinese food", "chinese cuisine"],
      "italian": ["italian restaurant", "italian food", "italian cuisine"],
      "mexican": ["mexican restaurant", "mexican food", "taco shop"],
      "breakfast": ["breakfast restaurant", "brunch", "breakfast spot", "morning dining"],
      "coffee": ["coffee shop", "cafe", "coffee house", "espresso bar"]
    },
    "Fitness": {
      "yoga": ["yoga studio", "yoga class", "hot yoga", "yoga center"],
      "pilates": ["pilates studio", "pilates class", "reformer pilates"],
      "crossfit": ["crossfit gym", "crossfit box", "functional fitness"],
      "swimming": ["swimming pool", "lap pool", "aquatic center", "swim lessons"],
      "martial arts": ["martial arts", "karate", "taekwondo", "jiu jitsu", "boxing gym"],
      "dance": ["dance studio", "dance classes", "ballroom dancing", "dance lessons"],
      "rock climbing": ["climbing gym", "rock climbing", "bouldering", "indoor climbing"],
      "traditional gym": ["gym", "fitness center", "health club", "weight room"]
    },
    "Personal Care": {
      "hair salon": ["hair salon", "beauty salon", "hair stylist", "hairdresser"],
      "barbershop": ["barbershop", "barber", "men's haircut", "traditional barber"],
      "nail salon": ["nail salon", "manicure", "pedicure", "nail care"],
      "spa": ["spa", "day spa", "massage therapy", "wellness spa"],
      "skincare": ["skincare clinic", "facial spa", "esthetician", "dermatology spa"],
      "massage": ["massage therapy", "therapeutic massage", "deep tissue massage"],
      "eyebrow": ["eyebrow threading", "brow bar", "eyebrow waxing", "microblading"]
    },
    "Shopping": {
      "clothing": ["clothing store", "fashion boutique", "apparel store", "dress shop"],
      "electronics": ["electronics store", "best buy", "tech store", "computer store"],
      "home goods": ["home goods", "furniture store", "home decor", "housewares"],
      "books": ["bookstore", "book shop", "library", "used books"],
      "sporting goods": ["sporting goods", "sports equipment", "athletic gear", "outdoor gear"],
      "jewelry": ["jewelry store", "jeweler", "fine jewelry", "watch repair"],
      "shoes": ["shoe store", "footwear", "athletic shoes", "boot store"]
    },
    "Banking": {
      "banks": ["bank", "credit union", "financial institution", "chase bank", "bank of america"],
      "atm": ["atm", "cash machine", "automated teller"],
      "investment": ["investment advisor", "financial planning", "wealth management"]
    },
    "Auto services": {
      "repair": ["auto repair", "car repair", "mechanic", "automotive service"],
      "oil change": ["oil change", "quick lube", "jiffy lube", "valvoline instant oil"],
      "car wash": ["car wash", "detailing", "auto wash", "hand car wash"],
      "gas station": ["gas station", "fuel", "gasoline", "petrol station"],
      "tires": ["tire shop", "tire service", "tire installation", "tire repair"]
    },
    "Entertainment": {
      "movies": ["movie theater", "cinema", "movie theatre", "film screening"],
      "bowling": ["bowling alley", "bowling center", "ten pin bowling"],
      "arcade": ["arcade", "game room", "video games", "pinball"],
      "mini golf": ["mini golf", "miniature golf", "putt putt", "golf course"],
      "bars": ["bar", "pub", "cocktail lounge", "sports bar", "dive bar"],
      "live music": ["live music venue", "concert hall", "music club", "jazz club"]
    }
  };

  return searchMap[category]?.[filter] || [filter];
};

const searchGooglePlaces = async (searchTerms: string[], location: string, radius: number = 10000): Promise<Business[]> => {
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
          const business: Business = {
            place_id: place.place_id,
            name: place.name,
            address: place.formatted_address || '',
            description: `${place.types?.join(', ') || ''} - ${place.name}`,
            rating: place.rating,
            features: place.types || [],
            latitude: place.geometry?.location?.lat,
            longitude: place.geometry?.location?.lng,
            image: place.photos?.[0] ? 
              `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${place.photos[0].photo_reference}&key=${apiKey}` : 
              undefined
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