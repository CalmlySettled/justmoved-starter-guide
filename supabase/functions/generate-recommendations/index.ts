import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const YELP_API_KEY = Deno.env.get('YELP_API_KEY');
const FOURSQUARE_API_KEY = Deno.env.get('FOURSQUARE_API_KEY');

interface QuizResponse {
  zipCode: string;
  householdType: string;
  priorities: string[];
  transportationStyle: string;
  budgetPreference: string;
  lifeStage: string;
  settlingTasks: string[];
}

interface Business {
  name: string;
  address: string;
  description: string;
  phone: string;
  features: string[];
  hours?: string;
  website?: string;
}

// Helper function to get coordinates from zip code
async function getCoordinatesFromZip(zipCode: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const response = await fetch(`https://api.zippopotam.us/us/${zipCode}`);
    if (response.ok) {
      const data = await response.json();
      return {
        lat: parseFloat(data.places[0].latitude),
        lng: parseFloat(data.places[0].longitude)
      };
    }
  } catch (error) {
    console.error('Error getting coordinates from zip:', error);
  }
  return null;
}

// Yelp API search function
async function searchYelp(category: string, coordinates: { lat: number; lng: number }): Promise<Business[]> {
  if (!YELP_API_KEY) {
    console.error('Yelp API key not found');
    return [];
  }

  try {
    const response = await fetch(
      `https://api.yelp.com/v3/businesses/search?term=${encodeURIComponent(category)}&latitude=${coordinates.lat}&longitude=${coordinates.lng}&limit=10&sort_by=rating`,
      {
        headers: {
          'Authorization': `Bearer ${YELP_API_KEY}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Yelp API error: ${response.status}`);
    }

    const data = await response.json();
    
    return data.businesses.map((business: any) => ({
      name: business.name,
      address: `${business.location.address1}, ${business.location.city}, ${business.location.state} ${business.location.zip_code}`,
      description: business.categories.map((cat: any) => cat.title).join(', '),
      phone: business.phone || '',
      features: [
        business.rating ? `${business.rating} stars` : '',
        business.price || '',
        business.is_closed ? 'Closed' : 'Open',
        ...(business.categories.map((cat: any) => cat.title))
      ].filter(Boolean),
      hours: business.hours?.[0]?.open ? 'See website for hours' : undefined,
      website: business.url
    }));
  } catch (error) {
    console.error('Error fetching from Yelp:', error);
    return [];
  }
}

// Foursquare API search function
async function searchFoursquare(category: string, coordinates: { lat: number; lng: number }): Promise<Business[]> {
  if (!FOURSQUARE_API_KEY) {
    console.error('Foursquare API key not found');
    return [];
  }

  try {
    const response = await fetch(
      `https://api.foursquare.com/v3/places/search?query=${encodeURIComponent(category)}&ll=${coordinates.lat},${coordinates.lng}&limit=10&sort=RATING`,
      {
        headers: {
          'Authorization': FOURSQUARE_API_KEY,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Foursquare API error: ${response.status}`);
    }

    const data = await response.json();
    
    return data.results.map((place: any) => ({
      name: place.name,
      address: `${place.location.formatted_address}`,
      description: place.categories.map((cat: any) => cat.name).join(', '),
      phone: place.tel || '',
      features: [
        place.rating ? `${place.rating}/10 rating` : '',
        ...(place.categories.map((cat: any) => cat.name)),
        place.chains?.[0]?.name ? 'Chain' : 'Local'
      ].filter(Boolean),
      website: place.website
    }));
  } catch (error) {
    console.error('Error fetching from Foursquare:', error);
    return [];
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { quizResponse }: { quizResponse: QuizResponse } = await req.json();
    
    console.log('Generating recommendations for:', quizResponse);

    // Get coordinates from zip code
    const coordinates = await getCoordinatesFromZip(quizResponse.zipCode);
    if (!coordinates) {
      throw new Error('Could not get coordinates for the provided zip code');
    }

    // Generate recommendations based on user priorities
    const recommendations = await generateRecommendations(quizResponse, coordinates);

    console.log('Generated recommendations keys:', Object.keys(recommendations));

    return new Response(
      JSON.stringify({ recommendations }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error('Error in generate-recommendations function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
});

async function generateRecommendations(quizResponse: QuizResponse, coordinates: { lat: number; lng: number }) {
  const recommendations: { [key: string]: Business[] } = {};
  
  // Map user priorities to search terms and API choices
  const priorityMap: { [key: string]: { term: string; api: 'yelp' | 'foursquare' } } = {
    "grocery stores": { term: "grocery stores", api: "yelp" },
    "grocery": { term: "grocery stores", api: "yelp" },
    "food": { term: "grocery stores", api: "yelp" },
    "shopping": { term: "grocery stores", api: "yelp" },
    "fitness options": { term: "fitness gyms", api: "foursquare" },
    "fitness": { term: "fitness gyms", api: "foursquare" },
    "gym": { term: "fitness gyms", api: "foursquare" },
    "exercise": { term: "fitness gyms", api: "foursquare" },
    "health": { term: "fitness gyms", api: "foursquare" },
    "faith communities": { term: "churches religious", api: "foursquare" },
    "church": { term: "churches religious", api: "foursquare" },
    "religious": { term: "churches religious", api: "foursquare" },
    "spiritual": { term: "churches religious", api: "foursquare" },
    "worship": { term: "churches religious", api: "foursquare" }
  };

  // For each user priority, search for businesses
  for (const priority of quizResponse.priorities) {
    const priorityLower = priority.toLowerCase();
    
    // Check for direct matches or partial matches
    for (const [key, config] of Object.entries(priorityMap)) {
      if (priorityLower.includes(key) || key.includes(priorityLower)) {
        let businesses: Business[] = [];
        
        if (config.api === 'yelp') {
          businesses = await searchYelp(config.term, coordinates);
        } else {
          businesses = await searchFoursquare(config.term, coordinates);
        }
        
        if (businesses.length > 0) {
          recommendations[priority] = businesses;
        }
        break;
      }
    }
  }

  // If no specific matches found, add some default categories
  if (Object.keys(recommendations).length === 0) {
    const [groceryStores, fitnessOptions, faithCommunities] = await Promise.all([
      searchYelp("grocery stores", coordinates),
      searchFoursquare("fitness gyms", coordinates),
      searchFoursquare("churches religious", coordinates)
    ]);

    if (groceryStores.length > 0) recommendations["grocery stores"] = groceryStores;
    if (fitnessOptions.length > 0) recommendations["fitness options"] = fitnessOptions;
    if (faithCommunities.length > 0) recommendations["faith communities"] = faithCommunities;
  }

  return recommendations;
}