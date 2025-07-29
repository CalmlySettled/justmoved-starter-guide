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

// National chain override for major brands within 5 miles
const NATIONAL_CHAIN_OVERRIDE_MILES = 5;

const NATIONAL_CHAINS = [
  // Grocery stores
  'walmart', 'target', 'kroger', 'safeway', 'albertsons', 'vons', 'ralphs', 'whole foods', 'trader joe\'s', 'costco', 'sam\'s club', 'sprouts', 'fresh market', 'publix', 'wegmans', 'stop & shop', 'giant', 'food lion', 'harris teeter', 'smith\'s', 'king soopers', 'fred meyer', 'qfc', 'pavilions', 'smart & final', 'food 4 less', 'ralphs fresh fare',
  // Pharmacies
  'cvs', 'walgreens', 'rite aid', 'duane reade',
  // Home improvement
  'home depot', 'lowes', 'menards', 'ace hardware',
  // Electronics
  'best buy', 'staples', 'office depot',
  // Department stores
  'macy\'s', 'nordstrom', 'jcpenney', 'kohl\'s', 'tj maxx', 'marshall\'s', 'ross',
  // Restaurants
  'mcdonald\'s', 'burger king', 'subway', 'starbucks', 'dunkin\'', 'taco bell', 'kfc', 'pizza hut', 'domino\'s', 'chipotle', 'panera'
];

function isNationalChain(businessName: string): boolean {
  const name = businessName.toLowerCase().trim();
  return NATIONAL_CHAINS.some(chain => {
    // Handle exact matches and partial matches (e.g., "Trader Joe's Mission Valley" contains "trader joe's")
    return name.includes(chain) || chain.includes(name.split(' ')[0]);
  });
}

function isNationalChainOverride(business: any, userLat: number, userLng: number): boolean {
  const distance = calculateDistance(userLat, userLng, business.geometry?.location?.lat || 0, business.geometry?.location?.lng || 0);
  return isNationalChain(business.name) && distance <= NATIONAL_CHAIN_OVERRIDE_MILES;
}

// Proximity override threshold - businesses within this distance get priority (reduced for national chains)
const PROXIMITY_OVERRIDE_MILES = 0.3;

// Check if a business qualifies for proximity override
function isProximityPriority(businessLat: number, businessLng: number, userLat: number, userLng: number): boolean {
  const distance = calculateDistance(userLat, userLng, businessLat, businessLng);
  return distance <= PROXIMITY_OVERRIDE_MILES;
}

// Determine optimal search radius based on area density
function getOptimalRadius(coordinates: { lat: number; lng: number }): number {
  // Major urban centers (smaller radius for dense downtown areas only)
  const urbanCenters = [
    { lat: 40.7128, lng: -74.0060, name: "NYC", radius: 3000 }, // 3km
    { lat: 34.0522, lng: -118.2437, name: "LA", radius: 4000 }, // 4km
    { lat: 41.8781, lng: -87.6298, name: "Chicago", radius: 4000 },
    { lat: 37.7749, lng: -122.4194, name: "SF", radius: 3000 },
    { lat: 42.3601, lng: -71.0589, name: "Boston", radius: 3500 },
    { lat: 47.6062, lng: -122.3321, name: "Seattle", radius: 4000 },
    { lat: 39.7392, lng: -104.9903, name: "Denver", radius: 5000 },
  ];

  // Check if very close to urban center core (within 10 miles for downtown areas)
  for (const center of urbanCenters) {
    const distanceToCenter = calculateDistance(coordinates.lat, coordinates.lng, center.lat, center.lng);
    if (distanceToCenter <= 10) { // Only very close to downtown core gets small radius
      return center.radius;
    }
  }

  // Suburban and rural areas get larger radius for better coverage
  return 8000; // 8km for suburban/rural areas
}

// Google Places API integration

  // Simplified function to check if a business is consumer-facing (minimal filtering)
function isRetailConsumerBusiness(place: any, category: string, userLat?: number, userLng?: number): boolean {
  const name = place.name?.toLowerCase() || '';
  const types = place.types || [];
  
  console.log(`📍 DISTANCE-ONLY CHECK: "${place.name}" - Distance: ${place.distance_miles || 'unknown'}mi`);
  
  const excludeKeywords = [
    'wholesale', 'distributor', 'b2b', 'commercial only', 'trade only',
    'foods llc', 'foods inc', 'food service', 'food services', 'foodservice',
    'real estate', 'insurance agency', 'accounting', 'lawyer', 'political',
    'funeral home', 'cemetery', 'government office', 'courthouse', 'embassy'
  ];
  
  if (excludeKeywords.some(keyword => name.includes(keyword))) {
    console.log(`❌ EXCLUDED: ${place.name} - B2B/non-consumer business`);
    return false;
  }
  
  // Must have at least some retail-oriented type
  const retailTypes = [
    'grocery_or_supermarket', 'supermarket', 'store', 'clothing_store', 
    'department_store', 'pharmacy', 'drugstore', 'gas_station',
    'convenience_store', 'electronics_store', 'furniture_store',
    'home_goods_store', 'hardware_store', 'restaurant', 'cafe', 
    'meal_takeaway', 'food', 'bakery', 'establishment'
  ];
  
  const hasRetailType = retailTypes.some(type => types.includes(type));
  if (!hasRetailType) {
    console.log(`❌ EXCLUDED: ${place.name} - No retail type found in: [${types.join(', ')}]`);
    return false;
  }
  
  console.log(`✅ INCLUDED: ${place.name} - Will be sorted by distance only`);
  return true;
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
  const radius = customRadius || getOptimalRadius({ lat: latitude, lng: longitude });
  
  // Define multiple search strategies for different categories
  const searchStrategies = getSearchStrategies(category);
  const allResults = new Set();
  const rawApiResponses: any[] = [];
  
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
        console.error('Google Places API error:', response.status, response.statusText);
        continue;
      }

      const data = await response.json();
      console.log(`→ Strategy returned ${data.results?.length || 0} businesses`);
      
      // 🔍 LOG RAW API RESPONSE
      console.log(`🔍 RAW API RESPONSE for strategy "${strategy.keyword || strategy.type}":`, JSON.stringify({
        status: data.status,
        results_count: data.results?.length || 0,
        results: data.results?.map(place => ({
          name: place.name,
          place_id: place.place_id,
          types: place.types,
          rating: place.rating,
          user_ratings_total: place.user_ratings_total,
          geometry: place.geometry?.location,
          vicinity: place.vicinity
        })) || []
      }, null, 2));
      
      // Store raw response for debugging
      rawApiResponses.push({
        strategy: strategy.keyword || strategy.type,
        response: data
      });

      // Add unique results to our set
      if (data.results) {
        data.results.forEach(place => {
          if (place.place_id) {
            allResults.add(JSON.stringify(place));
          }
        });
      }
    }

    // Convert back to array and parse
    const uniqueResults = Array.from(allResults).map(result => JSON.parse(result));
    console.log(`Combined ${uniqueResults.length} unique businesses from all strategies`);

    if (uniqueResults.length === 0) {
      return [];
    }

    // Filter and convert Google Places results to Business objects with photos and details
    const businesses = await Promise.all(
      uniqueResults
        .filter((place: any) => isRetailConsumerBusiness(place, category, latitude, longitude))
        .slice(0, 15) // More results from multiple strategies
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
            image_url: imageUrl,
            rating: place.rating || 0,
            review_count: place.user_ratings_total || 0
          };
        })
    );

    return businesses.filter(b => b.name && b.address);

  } catch (error) {
    console.error('Error fetching from Google Places API:', error);
    return [];
  }
}

// Generate essential features based on Yelp business data (simplified)
function generateFeaturesFromYelpData(business: any): string[] {
  const features: string[] = [];
  
  // Essential rating-based feature
  if (business.rating >= 4.0) {
    features.push('High Ratings');
  }
  
  // Essential local vs chain classification
  const chainKeywords = ['starbucks', 'mcdonald', 'subway', 'walmart', 'target', 'safeway', 'kroger', 'whole foods', 'planet fitness', 'la fitness', 'anytime fitness'];
  const isChain = chainKeywords.some(keyword => 
    business.name.toLowerCase().includes(keyword)
  );
  
  if (isChain) {
    features.push('Chain');
  } else {
    features.push('Local');
  }

  return features.length > 0 ? features : ['Local Business'];
}

// Helper function to generate essential features from Google Places data
function generateFeaturesFromGoogleData(place: any): string[] {
  const features: string[] = [];
  
  // Essential rating-based feature
  if (place.rating && place.rating >= 4.0) {
    features.push('High Ratings');
  }
  
  // Essential local vs chain classification
  const businessName = place.name?.toLowerCase() || '';
  const chainKeywords = ['starbucks', 'mcdonald', 'subway', 'walmart', 'target', 'safeway', 'kroger', 'whole foods', 'planet fitness', 'la fitness', 'anytime fitness'];
  const isChain = chainKeywords.some(keyword => businessName.includes(keyword));
  
  if (isChain) {
    features.push('Chain');
  } else {
    features.push('Local');
  }
  
  return features;
}

// Enhanced business search with cached coordinates and dynamic radius
async function searchBusinesses(category: string, coordinates: { lat: number; lng: number }, userPreferences?: QuizResponse): Promise<Business[]> {
  console.log(`Searching for "${category}" businesses near ${coordinates.lat}, ${coordinates.lng}`);
  
  // Use dynamic radius based on location
  const optimalRadius = getOptimalRadius(coordinates);
  console.log(`Using dynamic radius: ${optimalRadius}m for area density optimization`);
  
  // Use only Google Places API with dynamic radius
  const businesses = await searchGooglePlaces(category, coordinates.lat, coordinates.lng, optimalRadius);
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
  
  // 🔍 DISTANCE-BASED FILTERING: Transportation should not be a hard filter
  // Instead, use a generous radius (15 miles) and let scoring handle preference
  let filteredBusinesses = businesses;
  if (userPreferences?.transportationStyle) {
    // Use generous maximum distances that don't exclude nearby options
    const getMaxDistanceForTransportation = (transportationStyle: string): number => {
      switch (transportationStyle) {
        case 'Bike / walk':
          return 15; // Generous for safety - scoring will prefer closer
        case 'Public transit':
          return 15; // Generous for safety - scoring will prefer closer  
        case 'Rideshare only':
          return 15; // Generous for safety - scoring will prefer closer
        case 'Car':
        default:
          return 15; // Standard max distance
      }
    };

    const maxDistance = getMaxDistanceForTransportation(userPreferences.transportationStyle);
    console.log(`🔍 GENEROUS FILTERING by transportation style "${userPreferences.transportationStyle}" with max distance: ${maxDistance} miles (scoring will handle preference)`);
    
    // Log businesses before filtering
    console.log(`🔍 BUSINESSES BEFORE DISTANCE FILTER (${businesses.length}):`, businesses.map(b => `${b.name} (${b.distance_miles}mi)`).join(', '));
    
    filteredBusinesses = businesses.filter(business => 
      business.distance_miles && business.distance_miles <= maxDistance
    );
    
    console.log(`🔍 BUSINESSES AFTER DISTANCE FILTER (${filteredBusinesses.length}):`, filteredBusinesses.map(b => `${b.name} (${b.distance_miles}mi)`).join(', '));
    console.log(`🔍 Filtered from ${businesses.length} to ${filteredBusinesses.length} businesses based on transportation`);
  }
  
  // Sort businesses by distance only (closest first)
  const sortedBusinesses = filteredBusinesses.sort((a, b) => {
    return (a.distance_miles || 999) - (b.distance_miles || 999);
  });
  
  console.log(`🚀 DISTANCE-ONLY SORTING: Sorted ${sortedBusinesses.length} businesses by distance`);
  console.log(`🚀 Top 5 closest: ${sortedBusinesses.slice(0, 5).map(b => `${b.name} (${b.distance_miles}mi)`).join(', ')}`);
  
  // Return results sorted purely by distance
  return sortedBusinesses.slice(0, 25);
}

// Simplified relevance scoring based primarily on distance
function calculateRelevanceScore(business: Business, category: string, userPreferences?: QuizResponse): number {
  let score = 0;
  
  // Base score from rating (20 points max)
  if (business.rating) {
    score += (business.rating / 5) * 20;
  }
  
  // Primary scoring: Distance (60 points max - closest gets highest score)
  if (business.distance_miles) {
    // Inverse distance scoring - closer = higher score
    const maxDistance = 15; // Assume max search radius
    const distanceScore = Math.max(0, ((maxDistance - business.distance_miles) / maxDistance) * 60);
    score += distanceScore;
  }
  
  // Review count bonus (small factor, 10 points max)
  if (business.review_count) {
    const reviewScore = Math.min(10, Math.log10(business.review_count + 1) * 3);
    score += reviewScore;
  }
  
  // Enhanced preference-based scoring (max 30 points total)
  if (userPreferences) {
    score += calculatePreferenceBonus(business, category, userPreferences);
  }
  
  return Math.round(score * 10) / 10; // Round to 1 decimal place
}

// Calculate bonus points based on user preferences
function calculatePreferenceBonus(business: Business, category: string, userPreferences: QuizResponse): number {
  let bonus = 0;
  
  // Sub-preference bonus (NEW - max 15 points)
  if (userPreferences.priorityPreferences && userPreferences.priorityPreferences[category]) {
    const subPreferences = userPreferences.priorityPreferences[category];
    const businessName = business.name.toLowerCase();
    const features = business.features ? business.features.join(' ').toLowerCase() : '';
    const description = business.description ? business.description.toLowerCase() : '';
    
    subPreferences.forEach(pref => {
      const prefLower = pref.toLowerCase();
      
      // Check if business matches specific sub-preferences
      if (businessName.includes(prefLower) || features.includes(prefLower) || description.includes(prefLower)) {
        bonus += 3; // 3 points per matching sub-preference
      }
      
      // Special handling for specific sub-preferences
      if (prefLower.includes('organic') && (businessName.includes('organic') || businessName.includes('whole foods') || businessName.includes('fresh') || features.includes('organic'))) {
        bonus += 5;
      } else if (prefLower.includes('budget-friendly') && (businessName.includes('aldi') || businessName.includes('walmart') || businessName.includes('dollar') || features.includes('budget'))) {
        bonus += 5;
      } else if (prefLower.includes('24/7') && (features.includes('24') || businessName.includes('24') || description.includes('24 hour'))) {
        bonus += 4;
      } else if (prefLower.includes('pediatrician') && (businessName.includes('pediatr') || businessName.includes('children') || businessName.includes('kids'))) {
        bonus += 6;
      } else if (prefLower.includes('family physician') && (businessName.includes('family') || businessName.includes('primary care'))) {
        bonus += 5;
      } else if (prefLower.includes('urgent care') && (businessName.includes('urgent') || businessName.includes('walk-in'))) {
        bonus += 5;
      } else if (prefLower.includes('yoga') && (businessName.includes('yoga') || businessName.includes('pilates'))) {
        bonus += 4;
      } else if (prefLower.includes('gym') && (businessName.includes('gym') || businessName.includes('fitness') || businessName.includes('health club'))) {
        bonus += 4;
      } else if (prefLower.includes('swimming') && (businessName.includes('pool') || businessName.includes('aquatic') || features.includes('pool'))) {
        bonus += 4;
      } else if (prefLower.includes('dog park') && (businessName.includes('dog') || features.includes('dog'))) {
        bonus += 5;
      } else if (prefLower.includes('playground') && (businessName.includes('playground') || features.includes('playground'))) {
        bonus += 4;
      }
    });
    
    // Cap the sub-preference bonus
    bonus = Math.min(15, bonus);
  }
  
  // Budget preference bonus (max 10 points)
  if (userPreferences.budgetPreference && business.features) {
    const businessName = business.name.toLowerCase();
    const features = business.features.join(' ').toLowerCase();
    
    if (userPreferences.budgetPreference === 'I want affordable & practical options') {
      // Boost budget-friendly chains and practical options
      const budgetChains = ['walmart', 'target', 'aldi', 'costco', 'kroger', 'safeway', 'cvs', 'walgreens'];
      if (budgetChains.some(chain => businessName.includes(chain))) {
        bonus += 8;
      } else if (features.includes('affordable') || features.includes('budget') || features.includes('chain')) {
        bonus += 5;
      }
    } else if (userPreferences.budgetPreference === "I'm looking for unique, local gems") {
      // Boost local businesses over chains
      if (features.includes('local') && !features.includes('chain')) {
        bonus += 8;
      } else if (business.rating && business.rating >= 4.3 && business.review_count && business.review_count < 500) {
        // High-rated local spots with moderate review counts
        bonus += 6;
      }
    } else if (userPreferences.budgetPreference === 'A mix of both') {
      // Balanced approach - slight boost for well-rated places regardless of type
      if (business.rating && business.rating >= 4.2) {
        bonus += 4;
      }
    }
  }
  
  // Household type bonus (max 10 points)
  if (userPreferences.householdType) {
    const household = userPreferences.householdType.toLowerCase();
    const businessName = business.name.toLowerCase();
    const features = business.features ? business.features.join(' ').toLowerCase() : '';
    
    if (household.includes('kids')) {
      // Family-friendly bonuses
      if (category.includes('medical') && (businessName.includes('pediatric') || businessName.includes('children') || businessName.includes('family'))) {
        bonus += 10;
      } else if (category.includes('restaurants') && (features.includes('kid') || businessName.includes('family'))) {
        bonus += 6;
      } else if (category.includes('parks') || category.includes('playground')) {
        bonus += 8;
      }
    }
    
    if (household.includes('pets')) {
      // Pet-friendly bonuses
      if (category.includes('medical') && (businessName.includes('vet') || businessName.includes('animal'))) {
        bonus += 10;
      } else if (category.includes('parks') && (features.includes('dog') || businessName.includes('dog park'))) {
        bonus += 8;
      } else if (features.includes('pet-friendly') || businessName.includes('pet')) {
        bonus += 5;
      }
    }
    
    if (household.includes('just me')) {
      // Solo-friendly bonuses
      if (category.includes('restaurants') && (businessName.includes('coffee') || businessName.includes('cafe') || features.includes('counter seating'))) {
        bonus += 5;
      }
    }
  }
  
  // Life stage bonus (max 10 points)
  if (userPreferences.lifeStage) {
    const lifeStage = userPreferences.lifeStage.toLowerCase();
    const businessName = business.name.toLowerCase();
    
    if (lifeStage.includes('young professional')) {
      if (businessName.includes('coffee') || businessName.includes('co-working') || businessName.includes('networking')) {
        bonus += 6;
      } else if (category.includes('fitness') && businessName.includes('gym')) {
        bonus += 4;
      }
    } else if (lifeStage.includes('family')) {
      if (category.includes('medical') && businessName.includes('family')) {
        bonus += 8;
      } else if (category.includes('grocery') && businessName.includes('super')) {
        bonus += 4; // Prefer larger supermarkets for families
      }
    } else if (lifeStage.includes('empty nester') || lifeStage.includes('retired')) {
      if (category.includes('medical') && (businessName.includes('senior') || businessName.includes('geriatric'))) {
        bonus += 8;
      } else if (businessName.includes('senior') || businessName.includes('community center')) {
        bonus += 6;
      }
    } else if (lifeStage.includes('student')) {
      if (businessName.includes('student') || businessName.includes('campus') || businessName.includes('college')) {
        bonus += 8;
      } else if (category.includes('restaurants') && (businessName.includes('fast') || businessName.includes('quick'))) {
        bonus += 4; // Students often prefer quick, affordable food
      }
    }
  }
  
  return Math.min(30, bonus); // Cap at 30 points total for preference bonuses
}

// Get relevant features for scoring based on category and user preferences
function getRelevantFeatures(category: string, userPreferences: QuizResponse): string[] {
  const features: string[] = [];
  
  // Budget preference features
  if (userPreferences.budget_preference === 'budget-friendly') {
    features.push('affordable', 'budget', 'cheap', 'low prices', 'discount');
  } else if (userPreferences.budget_preference === 'premium') {
    features.push('premium', 'luxury', 'high-end', 'upscale', 'gourmet');
  }
  
  // Transportation features
  if (userPreferences.transportation_style === 'walking') {
    features.push('walkable', 'pedestrian friendly');
  } else if (userPreferences.transportation_style === 'public transit') {
    features.push('transit accessible', 'near bus stop', 'metro accessible');
  } else if (userPreferences.transportation_style === 'driving') {
    features.push('parking', 'drive-through', 'ample parking');
  }
  
  // Category-specific features
  if (category.includes('grocery')) {
    features.push('organic', '24/7', 'fresh produce', 'local', 'pickup available');
  } else if (category.includes('fitness')) {
    features.push('classes', 'personal training', 'pool', 'equipment');
  } else if (category.includes('restaurants')) {
    features.push('outdoor seating', 'takeout', 'delivery', 'vegetarian');
  }
  
  return features;
}

// Generate filter metadata for enhanced searching
function generateFilterMetadata(business: Business, category: string): any {
  const metadata: any = {
    hasWebsite: !!business.website,
    hasPhone: !!business.phone,
    distance: business.distance_miles || 0,
    rating: business.rating || 0,
    reviewCount: business.review_count || 0
  };
  
  // Category-specific metadata
  if (category.includes('grocery')) {
    metadata.isOrganic = business.features?.some(f => f.toLowerCase().includes('organic')) || false;
    metadata.is24Hours = business.features?.some(f => f.toLowerCase().includes('24')) || false;
    metadata.hasPickup = business.features?.some(f => f.toLowerCase().includes('pickup')) || false;
  }
  
  if (category.includes('restaurants')) {
    metadata.hasOutdoorSeating = business.features?.some(f => f.toLowerCase().includes('outdoor')) || false;
    metadata.hasDelivery = business.features?.some(f => f.toLowerCase().includes('delivery')) || false;
    metadata.isVegetarian = business.features?.some(f => f.toLowerCase().includes('vegetarian')) || false;
  }
  
  if (category.includes('fitness')) {
    metadata.hasClasses = business.features?.some(f => f.toLowerCase().includes('classes')) || false;
    metadata.hasPool = business.features?.some(f => f.toLowerCase().includes('pool')) || false;
    metadata.hasPersonalTraining = business.features?.some(f => f.toLowerCase().includes('personal')) || false;
  }
  
  return metadata;
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
    // Rate limiting check
    const clientIP = req.headers.get('x-forwarded-for') || 'unknown';
    const now = Date.now();
    const userLimit = rateLimiter.get(clientIP);
    
    if (userLimit) {
      if (now < userLimit.resetTime) {
        if (userLimit.count >= RATE_LIMIT) {
          console.warn(`Rate limit exceeded for IP: ${clientIP}`);
          return new Response(
            JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
            { 
              status: 429, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }
        userLimit.count++;
      } else {
        rateLimiter.set(clientIP, { count: 1, resetTime: now + RATE_WINDOW });
      }
    } else {
      rateLimiter.set(clientIP, { count: 1, resetTime: now + RATE_WINDOW });
    }
    const requestBody = await req.json();
    console.log('🔍 DEBUG VERSION: Enhanced debugging enabled for Sprouts investigation');
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

    // Get coordinates - try cached first, then convert address
    let coordinates: { lat: number; lng: number } | null = null;
    
    // Check if we have cached coordinates from profile
    if (userId) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('latitude, longitude')
        .eq('user_id', userId)
        .single();
      
      if (profile?.latitude && profile?.longitude) {
        coordinates = { lat: profile.latitude, lng: profile.longitude };
        console.log(`Using cached coordinates: ${coordinates.lat}, ${coordinates.lng}`);
      }
    }
    
    // Fall back to address conversion if no cached coordinates
    if (!coordinates) {
      coordinates = await getCoordinatesFromAddress(quizResponse.address);
      if (!coordinates) {
        throw new Error('Could not get coordinates for the provided address');
      }
      console.log(`Converted address to coordinates: ${coordinates.lat}, ${coordinates.lng}`);
    }

    // Generate recommendations based on user priorities
    const recommendations = await generateRecommendations(quizResponse, coordinates);

    console.log('Generated recommendations categories:', Object.keys(recommendations));

    // Save recommendations to database if userId is provided
    if (userId && Object.keys(recommendations).length > 0) {
      console.log(`Saving recommendations to database for user: ${userId}`);
      try {
        await saveRecommendationsToDatabase(userId, recommendations, quizResponse);
        console.log('Successfully saved recommendations to database');
      } catch (saveError) {
        console.error('Failed to save recommendations to database:', saveError);
        // Don't fail the entire request if save fails - user still gets recommendations
      }
    } else if (!userId) {
      console.warn('No userId provided - recommendations will not be saved to database');
    }

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
        
        const businesses = await searchBusinesses(searchTerm, coordinates, quizResponse);
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
      const businesses = await searchBusinesses(category.searchTerm, coordinates, quizResponse);
      if (businesses.length > 0) {
        recommendations[category.name] = businesses;
      }
    }
  } else if (quizResponse.existingPriorities && quizResponse.existingPriorities.length > 0) {
    console.log(`User has existing priorities: ${quizResponse.existingPriorities.join(', ')}, not adding defaults`);
  }

  return recommendations;
}