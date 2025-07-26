import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface QuizResponse {
  address: string;
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
  latitude?: number;
  longitude?: number;
  distance_miles?: number;
  image_url?: string;
}

// Helper function to get coordinates from address using OpenStreetMap Nominatim
async function getCoordinatesFromAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const encodedAddress = encodeURIComponent(address);
    const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}&limit=1`, {
      headers: {
        'User-Agent': 'CalmlySettled/1.0'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data && data.length > 0) {
        return {
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon)
        };
      }
    }
  } catch (error) {
    console.error('Error getting coordinates from address:', error);
  }
  return null;
}

// Calculate distance between two points using Haversine formula
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3959; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c;
  return Math.round(distance * 10) / 10; // Round to 1 decimal place
}

// Yelp API integration
async function searchYelpBusinesses(
  category: string, 
  latitude: number, 
  longitude: number, 
  radius: number = 10000
): Promise<Business[]> {
  const yelpApiKey = Deno.env.get('YELP_API_KEY');
  if (!yelpApiKey) {
    console.error('Yelp API key not found');
    return [];
  }

  try {
    const yelpCategoryMap: { [key: string]: string } = {
      "grocery stores": "grocery",
      "fitness gyms": "fitness",
      "churches religious": "religiousorgs",
      "medical health": "health",
      "schools education": "education",
      "parks recreation": "parks",
      "public transportation": "publictransport",
      "parks trails": "hiking",
      "restaurants cafes": "restaurants",
      "community centers": "community_service"
    };

    const yelpCategory = yelpCategoryMap[category] || category;
    
    const url = new URL('https://api.yelp.com/v3/businesses/search');
    url.searchParams.append('latitude', latitude.toString());
    url.searchParams.append('longitude', longitude.toString());
    url.searchParams.append('categories', yelpCategory);
    url.searchParams.append('radius', radius.toString());
    url.searchParams.append('limit', '20');
    url.searchParams.append('sort_by', 'distance');

    console.log(`Searching Yelp for category "${yelpCategory}" at coordinates ${latitude}, ${longitude}`);

    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${yelpApiKey}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      console.error(`Yelp API error: ${response.status} ${response.statusText}`);
      return [];
    }

    const data = await response.json();
    console.log(`Yelp returned ${data.businesses?.length || 0} businesses`);

    return (data.businesses || []).map((business: any) => {
      const imageUrl = business.image_url || business.photos?.[0] || '';
      console.log(`Business: ${business.name}, Image URL: ${imageUrl}, Raw image_url: ${business.image_url}, Photos: ${JSON.stringify(business.photos)}`);
      
      return {
        name: business.name,
        address: business.location?.display_address?.join(', ') || '',
        description: business.categories?.map((cat: any) => cat.title).join(', ') || '',
        phone: business.phone || '',
        features: generateFeaturesFromYelpData(business),
        latitude: business.coordinates?.latitude,
        longitude: business.coordinates?.longitude,
        distance_miles: business.distance ? Math.round((business.distance * 0.000621371) * 10) / 10 : undefined,
        website: business.url,
        image_url: imageUrl
      };
    });

  } catch (error) {
    console.error('Error fetching from Yelp API:', error);
    return [];
  }
}

// Google Places API integration (enhanced fallback with photo support)
async function searchGooglePlaces(
  category: string,
  latitude: number,
  longitude: number,
  radius: number = 5000
): Promise<Business[]> {
  const googleApiKey = Deno.env.get('GOOGLE_PLACES_API_KEY');
  if (!googleApiKey) {
    console.log('Google Places API key not found, skipping Google search');
    return [];
  }

  try {
    console.log(`Searching Google Places for category "${category}" at coordinates ${latitude}, ${longitude}`);
    
    // First, do a nearby search to get places
    const searchUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${latitude},${longitude}&radius=${radius}&type=establishment&keyword=${encodeURIComponent(category)}&key=${googleApiKey}`;
    
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'CalmlySettled/1.0'
      }
    });

    if (!response.ok) {
      console.error('Google Places API error:', response.status, response.statusText);
      return [];
    }

    const data = await response.json();
    console.log(`Google Places returned ${data.results?.length || 0} businesses`);

    if (!data.results || data.results.length === 0) {
      return [];
    }

    // Convert Google Places results to Business objects with photos
    const businesses = await Promise.all(data.results.slice(0, 10).map(async (place: any) => {
      let imageUrl = '';
      
      // Get photo from Google Places Photo API if available
      if (place.photos && place.photos.length > 0) {
        const photoReference = place.photos[0].photo_reference;
        imageUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photoReference}&key=${googleApiKey}`;
      }

      console.log(`Google Business: ${place.name}, Image URL: ${imageUrl}, Rating: ${place.rating || 'N/A'}`);

      return {
        name: place.name,
        address: place.vicinity || '',
        description: place.types?.join(', ') || '',
        phone: '', // Phone requires additional details call
        features: generateFeaturesFromGoogleData(place),
        latitude: place.geometry?.location?.lat,
        longitude: place.geometry?.location?.lng,
        distance_miles: undefined, // Will calculate later
        website: '',
        image_url: imageUrl
      };
    }));

    return businesses.filter(b => b.name && b.address);

  } catch (error) {
    console.error('Error fetching from Google Places API:', error);
    return [];
  }
}

// Generate features based on Yelp business data
function generateFeaturesFromYelpData(business: any): string[] {
  const features: string[] = [];
  
  // Rating-based features
  if (business.rating >= 4.0) {
    features.push('High Ratings');
  }
  
  // Price-based features
  if (business.price) {
    if (business.price === '$' || business.price === '$$') {
      features.push('Budget-Friendly');
    } else if (business.price === '$$$$') {
      features.push('Premium');
    }
  }

  // Chain vs Local
  const chainKeywords = ['starbucks', 'mcdonald', 'subway', 'walmart', 'target', 'safeway', 'kroger', 'whole foods', 'planet fitness', 'la fitness', 'anytime fitness'];
  const isChain = chainKeywords.some(keyword => 
    business.name.toLowerCase().includes(keyword)
  );
  
  if (isChain) {
    features.push('Chain');
  } else {
    features.push('Local');
  }

  // Category-specific features
  if (business.categories) {
    const categoryTitles = business.categories.map((cat: any) => cat.title.toLowerCase());
    
    // Grocery store features
    if (categoryTitles.some((title: string) => title.includes('organic'))) {
      features.push('Organic Options');
    }
    
    // Fitness features
    if (categoryTitles.some((title: string) => title.includes('yoga'))) {
      features.push('Yoga Classes');
    }
    if (categoryTitles.some((title: string) => title.includes('personal training'))) {
      features.push('Personal Training');
    }
    
    // Religious features
    if (categoryTitles.some((title: string) => title.includes('catholic'))) {
      features.push('Catholic');
    }
    if (categoryTitles.some((title: string) => title.includes('baptist'))) {
      features.push('Baptist');
    }
    if (categoryTitles.some((title: string) => title.includes('methodist'))) {
      features.push('Methodist');
    }
  }

  // Accessibility and convenience features
  if (business.transactions?.includes('pickup')) {
    features.push('Pickup Available');
  }
  if (business.transactions?.includes('delivery')) {
    features.push('Delivery Available');
  }

  return features.length > 0 ? features : ['Local Business'];
}

// Helper function to generate features from Google Places data
function generateFeaturesFromGoogleData(place: any): string[] {
  const features: string[] = [];
  
  if (place.rating && place.rating >= 4.0) {
    features.push('High Ratings');
  }
  
  if (place.price_level !== undefined) {
    if (place.price_level <= 2) {
      features.push('Budget-Friendly');
    } else if (place.price_level >= 3) {
      features.push('Premium');
    }
  }
  
  if (place.opening_hours?.open_now) {
    features.push('Open Now');
  }
  
  if (place.types?.includes('meal_takeaway') || place.types?.includes('meal_delivery')) {
    features.push('Takeout Available');
  }
  
  // Always add Local for community feel
  features.push('Local');
  
  return features;
}

// Enhanced business search that tries Google Places first, Yelp as fallback
async function searchBusinesses(category: string, coordinates: { lat: number; lng: number }): Promise<Business[]> {
  console.log(`Searching for "${category}" businesses near ${coordinates.lat}, ${coordinates.lng}`);
  
  // Try Google Places FIRST (better coverage and image quality)
  let businesses = await searchGooglePlaces(category, coordinates.lat, coordinates.lng);
  console.log(`Google Places found ${businesses.length} businesses`);
  
  // If we don't get enough results from Google Places, use Yelp as fallback
  if (businesses.length < 8) {
    console.log(`Only found ${businesses.length} businesses from Google Places, trying Yelp as fallback`);
    const yelpBusinesses = await searchYelpBusinesses(category, coordinates.lat, coordinates.lng);
    
    // Merge results, but avoid duplicates by name and address similarity
    const existingBusinesses = new Set(
      businesses.map(b => `${b.name.toLowerCase()}_${b.address.toLowerCase().substring(0, 20)}`)
    );
    
    const newYelpBusinesses = yelpBusinesses.filter(b => {
      const identifier = `${b.name.toLowerCase()}_${b.address.toLowerCase().substring(0, 20)}`;
      return !existingBusinesses.has(identifier);
    });
    
    businesses = [...businesses, ...newYelpBusinesses];
    console.log(`Combined total: ${businesses.length} businesses (${newYelpBusinesses.length} from Yelp fallback)`);
  } else {
    console.log(`Google Places provided sufficient results (${businesses.length}), skipping Yelp`);
  }
  
  // Calculate distances for businesses that don't have them
  businesses.forEach(business => {
    if (business.latitude && business.longitude && !business.distance_miles) {
      business.distance_miles = calculateDistance(
        coordinates.lat, coordinates.lng,
        business.latitude, business.longitude
      );
    }
  });
  
  // Sort by distance if we have distance data
  businesses.sort((a, b) => (a.distance_miles || 999) - (b.distance_miles || 999));
  
  // Limit to top 10 results
  return businesses.slice(0, 10);
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { quizResponse }: { quizResponse: QuizResponse } = await req.json();
    
    console.log('Generating recommendations for:', quizResponse);

    // Get coordinates from address
    const coordinates = await getCoordinatesFromAddress(quizResponse.address);
    if (!coordinates) {
      throw new Error('Could not get coordinates for the provided address');
    }

    console.log(`Found coordinates: ${coordinates.lat}, ${coordinates.lng}`);

    // Generate recommendations based on user priorities
    const recommendations = await generateRecommendations(quizResponse, coordinates);

    console.log('Generated recommendations categories:', Object.keys(recommendations));

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
  
  // Map user priorities to search terms that work with APIs
  const priorityMap: { [key: string]: string } = {
    "grocery stores": "grocery stores",
    "grocery": "grocery stores", 
    "food": "grocery stores",
    "shopping": "grocery stores",
    "medical care": "medical health",
    "medical": "medical health",
    "healthcare": "medical health",
    "doctors": "medical health",
    "clinics": "medical health",
    "fitness options": "fitness gyms",
    "fitness": "fitness gyms",
    "gym": "fitness gyms", 
    "exercise": "fitness gyms",
    "health": "fitness gyms",
    "schools": "schools education",
    "school": "schools education",
    "education": "schools education",
    "elementary": "schools education",
    "high school": "schools education",
    "parks": "parks recreation",
    "park": "parks recreation",
    "recreation": "parks recreation",
    "outdoor": "parks recreation",
    "faith communities": "churches religious",
    "church": "churches religious",
    "religious": "churches religious",
    "spiritual": "churches religious",
    "worship": "churches religious",
    "public transit / commute info": "public transportation",
    "public transit": "public transportation",
    "commute": "public transportation",
    "transportation": "public transportation",
    "transit": "public transportation",
    "bus": "public transportation",
    "train": "public transportation",
    "green space / trails": "parks trails",
    "green space": "parks trails",
    "trails": "parks trails",
    "hiking": "parks trails",
    "nature": "parks trails",
    "restaurants / coffee shops": "restaurants cafes",
    "restaurants": "restaurants cafes",
    "coffee shops": "restaurants cafes",
    "dining": "restaurants cafes",
    "food": "restaurants cafes",
    "social events or community groups": "community centers",
    "social events": "community centers",
    "community groups": "community centers",
    "community": "community centers",
    "events": "community centers"
  };

  console.log('User priorities received:', quizResponse.priorities);

  // For each user priority, search for real businesses using APIs
  for (const priority of quizResponse.priorities) {
    const priorityLower = priority.toLowerCase();
    console.log(`Processing priority: "${priority}"`);
    
    // Check for direct matches or partial matches
    let foundMatch = false;
    for (const [key, searchTerm] of Object.entries(priorityMap)) {
      if (priorityLower.includes(key) || key.includes(priorityLower)) {
        console.log(`Found match for "${priority}" with search term "${searchTerm}"`);
        foundMatch = true;
        
        const businesses = await searchBusinesses(searchTerm, coordinates);
        console.log(`Found ${businesses.length} real businesses for "${searchTerm}"`);
        
        if (businesses.length > 0) {
          recommendations[priority] = businesses;
          console.log(`Added ${businesses.length} businesses to recommendations for "${priority}"`);
        }
        break;
      }
    }
    
    if (!foundMatch) {
      console.log(`No match found for priority: "${priority}"`);
    }
  }

  // If no specific matches found, add some default categories
  if (Object.keys(recommendations).length === 0) {
    console.log('No priority matches found, adding default categories');
    
    const defaultCategories = [
      { name: "Grocery stores", searchTerm: "grocery stores" },
      { name: "Fitness options", searchTerm: "fitness gyms" },
      { name: "Faith communities", searchTerm: "churches religious" },
      { name: "Medical care", searchTerm: "medical health" },
      { name: "Schools", searchTerm: "schools education" },
      { name: "Parks", searchTerm: "parks recreation" }
    ];
    
    for (const category of defaultCategories) {
      const businesses = await searchBusinesses(category.searchTerm, coordinates);
      if (businesses.length > 0) {
        recommendations[category.name] = businesses;
      }
    }
  }

  return recommendations;
}