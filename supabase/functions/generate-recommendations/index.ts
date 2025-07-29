import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Rate limiting setup
const rateLimiter = new Map();
const RATE_LIMIT = 20; // requests per window
const RATE_WINDOW = 60000; // 1 minute in milliseconds

interface QuizResponse {
  address: string;
  householdType: string;
  priorities: string[];
  priorityPreferences?: Record<string, string[]>;
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
  rating?: number;
  review_count?: number;
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

// National chain override for major brands within 5 miles
const NATIONAL_CHAIN_OVERRIDE_MILES = 5;

const NATIONAL_CHAINS = [
  // Grocery stores
  'walmart', 'target', 'kroger', 'safeway', 'albertsons', 'vons', 'ralphs', 'whole foods', 'trader joe\'s', 'costco', 'sam\'s club', 'sprouts', 'fresh market', 'publix', 'wegmans', 'stop & shop', 'giant', 'food lion', 'harris teeter', 'smith\'s', 'king soopers', 'fred meyer', 'qfc', 'pavilions', 'smart & final', 'food 4 less', 'ralphs fresh fare',
  // Pharmacies
  'cvs', 'walgreens', 'rite aid', 'duane reade',
  // Home improvement
  'home depot', 'lowes', 'menards', 'ace hardware',
  // Fitness
  'planet fitness', 'la fitness', 'gold\'s gym', '24 hour fitness', 'anytime fitness'
];

// Check if a business is a national chain
function isNationalChain(businessName: string): boolean {
  const name = businessName.toLowerCase();
  return NATIONAL_CHAINS.some(chain => {
    // Handle exact matches and partial matches (e.g., "Trader Joe's Mission Valley" contains "trader joe's")
    return name.includes(chain) || chain.includes(name.split(' ')[0]);
  });
}

// Foursquare Places API integration
async function searchFoursquarePlaces(
  category: string,
  latitude: number,
  longitude: number
): Promise<Business[]> {
  const foursquareApiKey = Deno.env.get('FOURSQUARE_API_KEY');
  if (!foursquareApiKey) {
    console.log('Foursquare API key not found, skipping Foursquare search');
    return [];
  }

  try {
    const radius = 8000; // 8km radius
    const limit = 20;
    
    // Map categories to Foursquare category IDs
    const categoryMap: { [key: string]: string } = {
      'grocery': '17069',
      'supermarket': '17069',
      'medical': '15014',
      'fitness': '18021',
      'restaurant': '13065',
      'coffee': '13034',
      'pharmacy': '17072'
    };
    
    const foursquareCategory = categoryMap[category.toLowerCase()] || '';
    
    let searchUrl = `https://api.foursquare.com/v3/places/search?ll=${latitude},${longitude}&radius=${radius}&limit=${limit}`;
    
    if (foursquareCategory) {
      searchUrl += `&categories=${foursquareCategory}`;
    } else {
      searchUrl += `&query=${encodeURIComponent(category)}`;
    }

    const response = await fetch(searchUrl, {
      headers: {
        'Authorization': foursquareApiKey,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      console.error(`Foursquare API error: ${response.status}`);
      return [];
    }

    const data = await response.json();
    const businesses: Business[] = [];

    if (data.results && Array.isArray(data.results)) {
      for (const place of data.results) {
        try {
          // Get additional details for each place
          const detailsUrl = `https://api.foursquare.com/v3/places/${place.fsq_id}`;
          const detailsResponse = await fetch(detailsUrl, {
            headers: {
              'Authorization': foursquareApiKey,
              'Accept': 'application/json'
            }
          });
          
          if (detailsResponse.ok) {
            const details = await detailsResponse.json();
            
            const business: Business = {
              name: place.name || 'Unknown',
              address: place.location?.formatted_address || 'Address not available',
              description: details.description || place.categories?.[0]?.name || 'Local business',
              phone: details.tel || '',
              features: [
                details.rating ? `${details.rating}/10 rating` : '',
                details.price ? `Price level: ${details.price}` : '',
                place.categories?.[0]?.name || '',
                'Foursquare Verified'
              ].filter(Boolean),
              hours: details.hours?.display || '',
              website: details.website || '',
              latitude: place.geocodes?.main?.latitude,
              longitude: place.geocodes?.main?.longitude,
              image_url: details.photos?.[0]?.prefix + '300x300' + details.photos?.[0]?.suffix || '',
              rating: details.rating,
              review_count: details.stats?.total_checkins || 0
            };

            businesses.push(business);
          }
        } catch (error) {
          console.error('Error fetching Foursquare place details:', error);
        }
      }
    }

    console.log(`Foursquare returned ${businesses.length} businesses for "${category}"`);
    return businesses;
  } catch (error) {
    console.error('Error searching Foursquare Places:', error);
    return [];
  }
}

// Define multiple search strategies for different categories to improve coverage
function getSearchStrategies(category: string): Array<{ keyword?: string; type?: string }> {
  const strategies = [];
  
  if (category.includes('grocery')) {
    strategies.push(
      { keyword: 'grocery stores' },
      { keyword: 'supermarkets' },
      { keyword: 'food markets' },
      { keyword: 'supermarket' },
      { keyword: 'grocery' },
      { keyword: 'food store' },
      { keyword: 'market' },
      { type: 'grocery_or_supermarket' },
      { type: 'supermarket' },
      { type: 'store' }
    );
  } else if (category.includes('medical')) {
    strategies.push(
      { keyword: 'medical clinics' },
      { keyword: 'doctors offices' },
      { keyword: 'urgent care' },
      { keyword: 'family practice' },
      { type: 'doctor' },
      { type: 'hospital' }
    );
  } else if (category.includes('fitness')) {
    strategies.push(
      { keyword: 'fitness gyms' },
      { keyword: 'health clubs' },
      { keyword: 'yoga studios' },
      { keyword: 'pilates studios' },
      { type: 'gym' }
    );
  } else if (category.includes('restaurants') || category.includes('cafes')) {
    strategies.push(
      { keyword: 'restaurants' },
      { keyword: 'coffee shops' },
      { keyword: 'cafes' },
      { type: 'restaurant' },
      { type: 'cafe' }
    );
  } else if (category.includes('hardware')) {
    strategies.push(
      { keyword: 'hardware stores' },
      { keyword: 'home improvement stores' },
      { keyword: 'building supplies' },
      { type: 'hardware_store' },
      { type: 'home_goods_store' }
    );
  } else {
    // Default single strategy for other categories
    strategies.push({ keyword: category });
  }
  
  return strategies;
}

// Google Places API integration (enhanced with dynamic radius and multiple search strategies)
async function searchGooglePlaces(
  category: string,
  latitude: number,
  longitude: number,
  customRadius?: number
): Promise<Business[]> {
  const googleApiKey = Deno.env.get('GOOGLE_PLACES_API_KEY');
  if (!googleApiKey) {
    console.log('Google Places API key not found, skipping Google search');
    return [];
  }

  // Use dynamic radius based on area density
  const radius = customRadius || 8000;
  
  // Define multiple search strategies for different categories
  const searchStrategies = getSearchStrategies(category);
  const allResults = new Set();
  
  try {
    console.log(`🔍 DEBUGGING: Searching Google Places for category "${category}" at coordinates ${latitude}, ${longitude} with ${radius}m radius`);
    
    // Execute multiple search strategies
    for (const strategy of searchStrategies) {
      let searchUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${latitude},${longitude}&radius=${radius}`;
      
      if (strategy.type) {
        searchUrl += `&type=${strategy.type}`;
      }
      if (strategy.keyword) {
        searchUrl += `&keyword=${encodeURIComponent(strategy.keyword)}`;
      }
      searchUrl += `&key=${googleApiKey}`;
      
      console.log(`→ Strategy: ${strategy.keyword || strategy.type}`);
      console.log(`🔍 RAW API URL: ${searchUrl.replace(googleApiKey, 'HIDDEN_KEY')}`);
      
      const response = await fetch(searchUrl, {
        headers: {
          'User-Agent': 'CalmlySettled/1.0'
        }
      });

      if (!response.ok) {
        console.error(`Google Places API error for strategy ${strategy.keyword || strategy.type}: ${response.status}`);
        continue;
      }

      const data = await response.json();
      console.log(`🔍 RAW API RESPONSE for strategy "${strategy.keyword || strategy.type}": ${JSON.stringify({
        status: data.status,
        results_count: data.results?.length || 0,
        results: data.results || []
      })}`);
      console.log(`→ Strategy returned ${data.results?.length || 0} businesses`);

      // Add unique results to our set
      if (data.results && Array.isArray(data.results)) {
        data.results.forEach((place: any) => {
          if (place.name && place.vicinity) {
            allResults.add(JSON.stringify(place));
          }
        });
      }
    }

    // Convert unique results back to objects and process them
    const uniquePlaces = Array.from(allResults).map(result => JSON.parse(result as string));
    console.log(`Combined ${uniquePlaces.length} unique businesses from all strategies`);

    const businesses: Business[] = [];

    for (const place of uniquePlaces) {
      const business: Business = {
        name: place.name || 'Unknown',
        address: place.vicinity || 'Address not available',
        description: place.types?.[0]?.replace(/_/g, ' ') || 'Local business',
        phone: '',
        features: [
          place.rating ? `${place.rating}/5 rating` : '',
          place.user_ratings_total ? `${place.user_ratings_total} reviews` : '',
          place.price_level ? `Price level: ${place.price_level}/4` : '',
          place.types?.[0]?.replace(/_/g, ' ') || '',
          'Google Verified'
        ].filter(Boolean),
        hours: '',
        website: '',
        latitude: place.geometry?.location?.lat,
        longitude: place.geometry?.location?.lng,
        image_url: place.photos?.[0]?.photo_reference ? 
          `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${place.photos[0].photo_reference}&key=${googleApiKey}` : '',
        rating: place.rating,
        review_count: place.user_ratings_total || 0
      };

      businesses.push(business);
    }

    console.log(`Google Places returned ${businesses.length} businesses for "${category}"`);
    return businesses;
  } catch (error) {
    console.error('Error searching Google Places:', error);
    return [];
  }
}

// Combined search function that merges Google and Foursquare results
async function searchAllSources(
  category: string,
  latitude: number,
  longitude: number
): Promise<Business[]> {
  console.log(`🔍 Searching all sources for "${category}" at ${latitude}, ${longitude}`);
  
  // Search both APIs in parallel
  const [googleBusinesses, foursquareBusinesses] = await Promise.all([
    searchGooglePlaces(category, latitude, longitude),
    searchFoursquarePlaces(category, latitude, longitude)
  ]);
  
  console.log(`Google found ${googleBusinesses.length} businesses, Foursquare found ${foursquareBusinesses.length} businesses`);
  
  // Add distance to all businesses
  const allBusinessesWithDistance = [...googleBusinesses, ...foursquareBusinesses].map(business => {
    if (business.latitude && business.longitude) {
      const distance = calculateDistance(latitude, longitude, business.latitude, business.longitude);
      return { ...business, distance_miles: distance };
    }
    return business;
  });
  
  // Merge and deduplicate businesses
  const businessMap = new Map();
  
  // Add Google businesses first (they tend to have better data)
  googleBusinesses.forEach(business => {
    const key = `${business.name.toLowerCase()}-${business.address.toLowerCase()}`;
    if (!businessMap.has(key)) {
      businessMap.set(key, { ...business, features: [...business.features, 'Google Verified'] });
    }
  });
  
  // Add Foursquare businesses, avoiding duplicates
  foursquareBusinesses.forEach(business => {
    const key = `${business.name.toLowerCase()}-${business.address.toLowerCase()}`;
    if (!businessMap.has(key)) {
      businessMap.set(key, business);
    } else {
      // Merge additional features from Foursquare if business already exists
      const existing = businessMap.get(key);
      const mergedBusiness = { ...existing, features: [...new Set([...existing.features, ...business.features])] };
      businessMap.set(key, mergedBusiness);
    }
  });
  
  return Array.from(businessMap.values());
}

// Dynamic filter function
async function handleDynamicFilter(quizResponse: any, dynamicFilter: any) {
  const { category, filter, coordinates } = dynamicFilter;
  
  console.log(`Fetching additional ${filter} results for ${category}`);
  
  // Define specific search terms for dynamic filters
  const filterSearchTerms: { [key: string]: string } = {
    // Medical filters
    'urgent care': 'urgent care',
    'walk-in': 'walk in clinic',
    'specialists': 'medical specialists',
    'emergency': 'emergency room hospital',
    'family practice': 'family medicine primary care',
    'pediatrics': 'pediatrician children doctor',
    
    // Restaurant filters - THIS WAS MISSING!
    'coffee shops': 'coffee cafe espresso',
    'family-friendly': 'family restaurant casual dining',
    'date night spots': 'fine dining romantic restaurant',
    'quick casual': 'fast casual restaurants',
    'food trucks': 'food truck mobile food',
    
    // Grocery filters
    'organic options': 'organic grocery natural foods',
    'budget-friendly': 'discount grocery affordable',
    'national chain': 'walmart target kroger safeway whole foods',
    'local/independent': 'local grocery independent market',
    
    // Fitness filters
    'group classes': 'group fitness classes',
    'personal training': 'personal trainer fitness',
    '24-hour access': '24 hour gym fitness',
    'cardio machines': 'cardio gym fitness center',
    'strength training': 'weight lifting gym strength',
    
    // Parks filters
    'playgrounds': 'playground children play area',
    'dog parks': 'dog park pet off leash',
    'sports fields': 'sports field baseball soccer',
    'walking trails': 'walking trail hiking path',
    
    // Faith filters
    'christian': 'christian church baptist methodist',
    'jewish': 'synagogue temple jewish',
    'muslim': 'mosque islamic center',
    'non-denominational': 'community church non denominational'
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

// Calculate relevance score for saving to database
function calculateRelevanceScore(business: Business, category: string, userPreferences?: QuizResponse): number {
  let score = 5; // Base score
  
  // Distance bonus (closer = higher score)
  if (business.distance_miles) {
    if (business.distance_miles <= 1) score += 3;
    else if (business.distance_miles <= 3) score += 2;
    else if (business.distance_miles <= 5) score += 1;
  }
  
  // Rating bonus
  if (business.rating) {
    if (business.rating >= 4.5) score += 2;
    else if (business.rating >= 4.0) score += 1;
  }
  
  // Review count bonus
  if (business.review_count && business.review_count > 100) score += 1;
  
  return Math.min(score, 10); // Cap at 10
}

// Generate filter metadata for database
function generateFilterMetadata(business: Business, category: string): any {
  const metadata: any = {};
  
  if (category.toLowerCase().includes('fitness')) {
    metadata.hasClasses = business.features?.some(f => f.toLowerCase().includes('classes')) || false;
    metadata.hasPool = business.features?.some(f => f.toLowerCase().includes('pool')) || false;
    metadata.hasPersonalTraining = business.features?.some(f => f.toLowerCase().includes('personal')) || false;
  }
  
  return metadata;
}

// Enhanced function to save recommendations with relevance scores
async function saveRecommendationsToDatabase(userId: string, recommendations: { [key: string]: Business[] }, userPreferences?: QuizResponse) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  try {
    const recommendationsToInsert = [];
    
    // Convert recommendations to database format with relevance scores
    for (const [category, businesses] of Object.entries(recommendations)) {
      businesses.forEach((business, index) => {
        const relevanceScore = calculateRelevanceScore(business, category, userPreferences);
        const filterMetadata = generateFilterMetadata(business, category);
        
        recommendationsToInsert.push({
          user_id: userId,
          category: category,
          business_name: business.name,
          business_address: business.address,
          business_description: business.description,
          business_phone: business.phone,
          business_website: business.website,
          business_latitude: business.latitude,
          business_longitude: business.longitude,
          distance_miles: business.distance_miles,
          business_features: business.features,
          business_image: business.image_url,
          is_favorite: false,
          relevance_score: relevanceScore,
          is_displayed: index < 6, // Only first 6 are displayed by default
          filter_metadata: filterMetadata
        });
      });
    }
    
    if (recommendationsToInsert.length > 0) {
      console.log(`Upserting ${recommendationsToInsert.length} recommendations for user ${userId}`);
      
      // Use upsert to prevent duplicates - update if exists, insert if new
      const { data, error } = await supabase
        .from('user_recommendations')
        .upsert(recommendationsToInsert, {
          onConflict: 'user_id,business_name,business_address,category',
          ignoreDuplicates: false
        });
      
      if (error) {
        console.error('Error upserting recommendations to database:', error);
        throw error;
      }
      
      console.log(`Successfully upserted ${recommendationsToInsert.length} recommendations to database`);
    }
  } catch (error) {
    console.error('Error in saveRecommendationsToDatabase:', error);
    throw error;
  }
}

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
    "pharmacy": "pharmacy",
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
    "childcare / daycare": "childcare daycare",
    "childcare": "childcare daycare",
    "daycare": "childcare daycare",
    "kids": "childcare daycare",
    "children": "childcare daycare",
    "entertainment": "entertainment venues",
    "movies": "entertainment venues",
    "theater": "entertainment venues",
    "arts": "entertainment venues",
    "music": "entertainment venues",
    "auto services (repair, registration)": "auto services",
    "auto services": "auto services",
    "auto": "auto services",
    "car repair": "auto services",
    "garage": "auto services",
    "mechanic": "auto services",
    "beauty / hair salons": "beauty salon",
    "beauty": "beauty salon",
    "hair salon": "beauty salon",
    "salon": "beauty salon",
    "barber": "beauty salon",
    "dmv / government services": "government services",
    "dmv": "government services",
    "government": "government services",
    "city hall": "government services",
    "post office": "government services"
  };

  // Define category data structure for recommendations
  const categoryData = [
    {
      name: "Grocery stores",
      searchTerms: ["grocery stores", "supermarkets", "food markets"],
      icon: "🛒",
      description: "Fresh groceries and daily essentials"
    },
    {
      name: "Medical care",
      searchTerms: ["medical clinics", "doctors offices", "urgent care", "family practice"],
      icon: "🏥",
      description: "Healthcare providers and medical services"
    },
    {
      name: "Fitness options",
      searchTerms: ["fitness gyms", "health clubs", "yoga studios", "pilates studios"],
      icon: "💪",
      description: "Gyms, studios, and fitness facilities"
    },
    {
      name: "Restaurants / coffee shops",
      searchTerms: ["restaurants", "coffee shops", "cafes", "dining"],
      icon: "🍽️",
      description: "Dining options and coffee shops"
    },
    {
      name: "Parks",
      searchTerms: ["parks recreation", "playgrounds", "community parks"],
      icon: "🌳",
      description: "Parks and recreational spaces"
    }
  ];

  console.log(`Starting recommendations for ${quizResponse.priorities?.length || 0} user priorities`);

  // Process each user priority
  for (const priority of quizResponse.priorities || []) {
    console.log(`\nProcessing priority: "${priority}"`);
    
    let foundMatch = false;
    
    // Try to match with category data
    for (const category of categoryData) {
      const searchTerm = priorityMap[priority.toLowerCase()] || priority;
      
      if (category.searchTerms.some(term => term.includes(searchTerm.split(' ')[0]) || searchTerm.includes(term.split(' ')[0]))) {
        console.log(`✅ MATCHED "${priority}" → "${category.name}"`);
        foundMatch = true;
        
        if (!recommendations[category.name]) {
          const businesses = await searchAllSources(searchTerm, coordinates.lat, coordinates.lng);
          console.log(`Found ${businesses.length} businesses for "${searchTerm}"`);
          recommendations[category.name] = businesses;
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
  if ((!quizResponse.priorities || quizResponse.priorities.length === 0) && 
      (!quizResponse.existingPriorities || quizResponse.existingPriorities.length === 0)) {
    console.log('No user priorities specified and no existing priorities, adding default categories');
    
    for (const category of categoryData) {
      if (!recommendations[category.name]) {
        const businesses = await searchAllSources(category.searchTerms[0], coordinates.lat, coordinates.lng);
        console.log(`Found ${businesses.length} businesses for "${category.searchTerms[0]}"`);
        recommendations[category.name] = businesses;
      }
    }
  } else if (quizResponse.existingPriorities && quizResponse.existingPriorities.length > 0) {
    console.log(`User has existing priorities: ${quizResponse.existingPriorities.join(', ')}, not adding defaults`);
  }

  return recommendations;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Rate limiting check
    const clientIP = req.headers.get('x-forwarded-for') || 'unknown';
    const now = Date.now();
    const userLimit = rateLimiter.get(clientIP);
    
    if (userLimit) {
      if (now < userLimit.resetTime) {
        if (userLimit.count >= RATE_LIMIT) {
          return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
            status: 429,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        userLimit.count++;
      } else {
        rateLimiter.set(clientIP, { count: 1, resetTime: now + RATE_WINDOW });
      }
    } else {
      rateLimiter.set(clientIP, { count: 1, resetTime: now + RATE_WINDOW });
    }
    
    const requestBody = await req.json();
    console.log('🔍 DEBUG VERSION: Enhanced debugging enabled for coffee shop investigation');
    console.log('Generating recommendations for:', JSON.stringify(requestBody, null, 2));
    
    const { quizResponse, dynamicFilter, exploreMode, latitude, longitude, categories, userId } = requestBody;
    
    // Handle explore mode requests
    if (exploreMode) {
      if (!latitude || !longitude || !categories) {
        return new Response(JSON.stringify({ error: 'Explore mode requires latitude, longitude, and categories' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      const recommendations: { [key: string]: Business[] } = {};
      for (const category of categories) {
        const businesses = await searchAllSources(category, latitude, longitude);
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
      return new Response(JSON.stringify({ error: 'Could not geocode address' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Coordinates for ${quizResponse.address}: ${coordinates.lat}, ${coordinates.lng}`);

    // Generate recommendations based on user priorities and preferences
    const recommendations = await generateRecommendations(quizResponse, coordinates);

    console.log(`Generated ${Object.keys(recommendations).length} categories with total businesses:`, 
      Object.values(recommendations).reduce((sum, arr) => sum + arr.length, 0)
    );

    // If userId provided, save recommendations to database
    if (userId) {
      try {
        await saveRecommendationsToDatabase(userId, recommendations, quizResponse);
        console.log('Recommendations saved to database successfully');
      } catch (dbError) {
        console.error('Failed to save to database:', dbError);
        // Continue with response even if database save fails
      }
    }

    return new Response(
      JSON.stringify({ recommendations }),
      {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
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