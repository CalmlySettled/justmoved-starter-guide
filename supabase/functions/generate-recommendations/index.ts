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
  existingPriorities?: string[]; // Add this to track existing priorities
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

// Removed hardcoded brand logos - using pure API + category fallback system
// All image logic now handled by frontend for better consistency and scaling

// Simplified function - no brand logo logic, pure API approach
function getBrandLogo(businessName: string): string | null {
  // Brand logos removed - frontend handles all image logic now
  return null;
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

// Google Places API integration

// Helper function to check if a business is actually consumer-facing retail
function isRetailConsumerBusiness(place: any, category: string): boolean {
  const name = place.name.toLowerCase();
  const types = place.types || [];
  const typesString = types.join(' ').toLowerCase();
  
  // Exclude obvious B2B/wholesale businesses for grocery category
  if (category.includes('grocery')) {
    // Exclude wholesale distributors, suppliers, and B2B operations
    const excludeKeywords = [
      'wholesale', 'distributor', 'distribution', 'supplier', 'supply',
      'foods llc', 'foods inc', 'food service', 'food services', 
      'foodservice', 'catering', 'restaurant supply', 'commercial',
      'industrial', 'manufacturing', 'processor', 'processing'
    ];
    
    if (excludeKeywords.some(keyword => name.includes(keyword))) {
      console.log(`→ Excluding B2B business: ${place.name}`);
      return false;
    }
    
    // Must have retail-oriented types for grocery
    const retailTypes = [
      'grocery_or_supermarket', 'supermarket', 'convenience_store',
      'store', 'establishment'
    ];
    
    const hasRetailType = retailTypes.some(type => types.includes(type));
    if (!hasRetailType) {
      console.log(`→ Excluding non-retail business: ${place.name} (types: ${types.join(', ')})`);
      return false;
    }
  }
  
  // Exclude businesses that are clearly not consumer retail
  const generalExcludeKeywords = [
    'wholesale', 'distributor', 'b2b', 'commercial only',
    'trade only', 'professional only', 'licensed professionals'
  ];
  
  if (generalExcludeKeywords.some(keyword => name.includes(keyword) || typesString.includes(keyword))) {
    console.log(`→ Excluding non-consumer business: ${place.name}`);
    return false;
  }
  
  // Must have a reasonable rating count (indicates consumer traffic)
  if (place.user_ratings_total !== undefined && place.user_ratings_total < 5) {
    console.log(`→ Excluding business with low review count: ${place.name} (${place.user_ratings_total} reviews)`);
    return false;
  }
  
  return true;
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

    // Filter and convert Google Places results to Business objects with photos and details
    const businesses = await Promise.all(
      data.results
        .filter((place: any) => isRetailConsumerBusiness(place, category))
        .slice(0, 10)
        .map(async (place: any) => {
          // Use Google's photo API if available, otherwise no image
          let imageUrl = '';
          let website = '';
          let phone = '';
          
          if (place.photos && place.photos.length > 0) {
            const photoReference = place.photos[0].photo_reference;
            imageUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photoReference}&key=${googleApiKey}`;
            console.log(`→ Using Google photo for: ${place.name}`);
          } else {
            console.log(`→ No image available for: ${place.name}`);
          }

          // Fetch place details for website and phone
          if (place.place_id) {
            try {
              const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&fields=website,formatted_phone_number&key=${googleApiKey}`;
              const detailsResponse = await fetch(detailsUrl);
              
              if (detailsResponse.ok) {
                const detailsData = await detailsResponse.json();
                if (detailsData.result) {
                  website = detailsData.result.website || '';
                  phone = detailsData.result.formatted_phone_number || '';
                  if (website) {
                    console.log(`→ Found website for ${place.name}: ${website}`);
                  }
                }
              }
            } catch (error) {
              console.log(`→ Could not fetch details for: ${place.name}`);
            }
          }

          return {
            name: place.name,
            address: place.vicinity || '',
            description: place.types?.join(', ') || '',
            phone: phone,
            features: generateFeaturesFromGoogleData(place),
            latitude: place.geometry?.location?.lat,
            longitude: place.geometry?.location?.lng,
            distance_miles: undefined, // Will calculate later
            website: website,
            image_url: imageUrl
          };
        })
    );

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

// Simplified business search using only Google Places API
async function searchBusinesses(category: string, coordinates: { lat: number; lng: number }): Promise<Business[]> {
  console.log(`Searching for "${category}" businesses near ${coordinates.lat}, ${coordinates.lng}`);
  
  // Use only Google Places API
  const businesses = await searchGooglePlaces(category, coordinates.lat, coordinates.lng);
  console.log(`Google Places found ${businesses.length} businesses`);
  
  // Calculate distances for businesses that don't have them
  businesses.forEach(business => {
    if (business.latitude && business.longitude && !business.distance_miles) {
      business.distance_miles = calculateDistance(
        coordinates.lat, coordinates.lng,
        business.latitude, business.longitude
      );
    }
  });
  
  // Sort by distance
  businesses.sort((a, b) => (a.distance_miles || 999) - (b.distance_miles || 999));
  
  // Return exactly 6 results for consistency
  return businesses.slice(0, 6);
}

// Handle dynamic filtering for specific business types
async function handleDynamicFilter(quizResponse: any, dynamicFilter: any) {
  const { category, filter, coordinates } = dynamicFilter;
  
  console.log(`Fetching additional ${filter} results for ${category}`);
  
  // Define specific search terms for dynamic filters
  const filterSearchTerms: { [key: string]: string } = {
    'urgent care': 'urgent care',
    'walk-in': 'walk in clinic',
    'specialists': 'medical specialists',
    'emergency': 'emergency room hospital',
    'family practice': 'family medicine primary care',
    'pediatrics': 'pediatrician children doctor',
    'organic options': 'organic grocery natural foods',
    'budget-friendly': 'discount grocery affordable',
    'group classes': 'group fitness classes',
    'personal training': 'personal trainer fitness',
    '24-hour access': '24 hour gym fitness',
    'cardio machines': 'cardio gym fitness center',
    'strength training': 'weight lifting gym strength'
  };
  
  const searchTerm = filterSearchTerms[filter.toLowerCase()] || filter;
  console.log(`Using search term: "${searchTerm}" for filter: "${filter}"`);
  
  try {
    // Fetch specific businesses for this filter
    const businesses = await searchGooglePlaces(searchTerm, coordinates.lat, coordinates.lng);
    console.log(`Found ${businesses.length} businesses for filter "${filter}"`);
    
    // Return the specific filtered results
    const recommendations = {
      [category]: businesses
    };
    
    return new Response(
      JSON.stringify({ recommendations }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
    
  } catch (error) {
    console.error('Error in dynamic filter:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch filtered results' }),
      { 
        status: 500, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestBody = await req.json();
    console.log('Generating recommendations for:', JSON.stringify(requestBody, null, 2));
    
    const { quizResponse, dynamicFilter, exploreMode, latitude, longitude, categories } = requestBody;
    
    // Handle explore mode requests
    if (exploreMode) {
      if (!latitude || !longitude || !categories) {
        return new Response(JSON.stringify({ error: 'Explore mode requires latitude, longitude, and categories' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const coordinates = { lat: latitude, lng: longitude };
      const recommendations: { [key: string]: Business[] } = {};
      
      for (const category of categories) {
        console.log(`Exploring category: "${category}"`);
        const businesses = await searchBusinesses(category, coordinates);
        recommendations[category] = businesses;
        console.log(`Found ${businesses.length} businesses for "${category}"`);
      }
      
      return new Response(JSON.stringify({ recommendations }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // If dynamic filter is provided, fetch additional specific results
    if (dynamicFilter) {
      console.log('Dynamic filter requested:', JSON.stringify(dynamicFilter, null, 2));
      return await handleDynamicFilter(quizResponse, dynamicFilter);
    }

    // Handle regular quiz-based requests
    if (!quizResponse || !quizResponse.address) {
      return new Response(JSON.stringify({ error: 'Quiz response with address is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

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
    "pharmacy": "medical health",
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
    "events": "community centers",
    "home improvement / hardware stores": "hardware stores",
    "home improvement": "hardware stores",
    "hardware stores": "hardware stores",
    "hardware": "hardware stores",
    "tools": "hardware stores",
    "building supplies": "hardware stores",
    "home depot": "hardware stores",
    "lowes": "hardware stores",
    "improvement": "hardware stores",
    "dmv / government services": "government offices",
    "dmv": "government offices",
    "government services": "government offices",
    "government": "government offices",
    "city hall": "government offices",
    "town hall": "government offices",
    "motor vehicle": "government offices",
    "registry": "government offices",
    "municipal": "government offices"
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

  // Only add default categories if user has no priorities at all AND no existing priorities
  // If they specified priorities or have existing ones, don't add defaults
  const hasAnyPriorities = quizResponse.priorities.length > 0 || (quizResponse.existingPriorities && quizResponse.existingPriorities.length > 0);
  
  if (Object.keys(recommendations).length === 0 && !hasAnyPriorities) {
    console.log('No priorities specified and no existing priorities, adding default categories');
    
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
  } else if (quizResponse.existingPriorities && quizResponse.existingPriorities.length > 0) {
    console.log(`User has existing priorities: ${quizResponse.existingPriorities.join(', ')}, not adding defaults`);
  }

  return recommendations;
}