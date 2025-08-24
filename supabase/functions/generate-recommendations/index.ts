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

// AI Recommendation System Configuration
const AI_RECOMMENDATION_PERCENTAGE = 0.5; // 50% of users get AI recommendations for A/B testing

// Cost Optimization Configuration
const CACHE_DURATION_DAYS = 30; // Default cache duration for popular categories
const GEOGRAPHIC_PRECISION = 2; // Round coordinates to 2 decimals for better caching
const YELP_ONLY_CATEGORIES = ['restaurants', 'dining', 'food', 'bars']; // High-value Yelp categories

// API Cost Tracking with Enhanced Optimization
interface APIUsageStats {
  yelpCalls: number;
  googleCalls: number;
  cacheHits: number;
  totalSearches: number;
  estimatedCost: number;
  costSavings: number;
}

let apiUsageStats: APIUsageStats = {
  yelpCalls: 0,
  googleCalls: 0,
  cacheHits: 0,
  totalSearches: 0,
  estimatedCost: 0,
  costSavings: 0
};

function trackAPIUsage(api: 'yelp' | 'google' | 'cache', callCount: number = 1) {
  if (api === 'yelp') {
    apiUsageStats.yelpCalls += callCount;
    apiUsageStats.estimatedCost += callCount * 0.01413; // Yelp cost per call
  } else if (api === 'google') {
    apiUsageStats.googleCalls += callCount;
    apiUsageStats.estimatedCost += callCount * 0.017; // Google Places optimized cost
  } else if (api === 'cache') {
    apiUsageStats.cacheHits += callCount;
    apiUsageStats.costSavings += callCount * 0.02; // Average cost saved per cache hit
  }
  apiUsageStats.totalSearches += 1;
  
  // Log cost optimization every 5 searches
  if (apiUsageStats.totalSearches % 5 === 0) {
    const cacheEfficiency = (apiUsageStats.cacheHits / (apiUsageStats.cacheHits + apiUsageStats.yelpCalls + apiUsageStats.googleCalls)) * 100;
    console.log(`Cost Optimization: Cache ${cacheEfficiency.toFixed(1)}%, Cost: $${apiUsageStats.estimatedCost.toFixed(4)}, Saved: $${apiUsageStats.costSavings.toFixed(4)}`);
  }
}

// Geographic coordinate rounding for better cache efficiency - broader regions for better hits
function roundCoordinates(lat: number, lng: number): { lat: number, lng: number } {
  // Round to ~2 mile precision for better cache hits (0.03 degrees ≈ 2 miles)
  return {
    lat: Math.round(lat * 33.33) / 33.33,
    lng: Math.round(lng * 33.33) / 33.33
  };
}

// Generate simplified cache key for better hit rates
function generateSimpleCacheKey(
  coordinates: { lat: number, lng: number },
  categories: string[],
  preferences: any
): string {
  const roundedCoords = roundCoordinates(coordinates.lat, coordinates.lng);
  const sortedCategories = [...categories].sort().join(',');
  
  // Create simplified preference fingerprint - only core preferences
  const prefFingerprint = {
    budget: preferences.budgetPreference || 'any',
    transport: preferences.transportationStyle || 'any',
    household: preferences.householdType || 'any',
    priorities: (preferences.priorities || []).sort().slice(0, 3).join(',') // Top 3 priorities only
  };
  
  return `${roundedCoords.lat}_${roundedCoords.lng}_${sortedCategories}_${JSON.stringify(prefFingerprint)}`;
}

// Check if category should prioritize Yelp for data quality
function shouldUseYelp(searchTerms: string[]): boolean {
  return searchTerms.some(term => 
    YELP_ONLY_CATEGORIES.some(category => 
      term.toLowerCase().includes(category)
    )
  );
}

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
  userId?: string; // Add userId for AI personalization
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
  place_id?: string;
  distance_miles?: number;
  image_url?: string;
  rating?: number;
  review_count?: number;
  ai_relevance_score?: number;
  ai_scores?: {
    budget_match?: number;
    location_preference?: number;
    feature_alignment?: number;
    household_fit?: number;
    lifestyle_match?: number;
    priority_alignment?: number;
    transportation_compatibility?: number;
    overall_relevance?: number;
  };
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

// API initialization
const googleMapsApiKey = Deno.env.get('GOOGLE_PLACES_API_KEY');
const yelpApiKey = Deno.env.get('YELP_API_KEY');

// API routing logic: Use Google Places for all categories (no Yelp dependency)
function shouldUseYelpPrimary(category: string): boolean {
  // Always return false to route ALL categories through Google Places
  // This eliminates the need for Yelp API key and maintains all cache protocols
  return false;
}

// Yelp API integration
async function searchYelp(
  category: string,
  latitude: number,
  longitude: number,
  radius: number = 8000,
  limit: number = 15
): Promise<Business[]> {
  if (!yelpApiKey) {
    console.error('❌ CRITICAL: Yelp API key not found! This will cause 0 results for coffee shops, breweries, restaurants, and other consumer categories.');
    console.error('Please add YELP_API_KEY to Supabase secrets to fix this issue.');
    return [];
  }

  console.log(`Searching Yelp for "${category}" at ${latitude}, ${longitude} with ${radius}m radius`);

  // Map categories to Yelp search terms
  const yelpSearchTerms = getYelpSearchTerms(category);
  const businesses: Business[] = [];

  try {
    for (const searchTerm of yelpSearchTerms.slice(0, 2)) { // Limit to 2 search terms
      const searchUrl = `https://api.yelp.com/v3/businesses/search`;
      const params = new URLSearchParams({
        term: searchTerm,
        latitude: latitude.toString(),
        longitude: longitude.toString(),
        radius: Math.min(radius, 40000).toString(), // Yelp max radius is 40km
        limit: limit.toString(),
        sort_by: 'best_match'
      });

      console.log(`→ Yelp search: ${searchTerm}`);
      trackAPIUsage('yelp'); // Track Yelp API call

      const response = await fetch(`${searchUrl}?${params}`, {
        headers: {
          'Authorization': `Bearer ${yelpApiKey}`,
          'User-Agent': 'CalmlySettled/1.0'
        }
      });

      if (!response.ok) {
        console.error(`❌ Yelp API error: ${response.status} ${response.statusText}`);
        const errorText = await response.text();
        console.error(`Yelp API error details: ${errorText}`);
        continue;
      }

      const data = await response.json();
      console.log(`→ Yelp returned ${data.businesses?.length || 0} businesses`);

      if (data.businesses) {
        for (const business of data.businesses) {
          // Convert Yelp business to our Business interface
          const convertedBusiness = convertYelpToBusiness(business, latitude, longitude);
          if (convertedBusiness && isQualityYelpBusiness(business)) {
            businesses.push(convertedBusiness);
          }
        }
      }
    }

    // Remove duplicates based on name and address
    const uniqueBusinesses = deduplicateBusinesses(businesses);
    console.log(`Yelp search completed: ${uniqueBusinesses.length} unique businesses`);
    
    return uniqueBusinesses;
  } catch (error) {
    console.error('Error searching Yelp:', error);
    return [];
  }
}

// Map categories to Yelp search terms
function getYelpSearchTerms(category: string): string[] {
  if (category.includes('Restaurants')) {
    return ['restaurants', 'dining', 'food'];
  } else if (category.includes('Coffee shops')) {
    return ['coffee', 'cafe', 'coffee shops'];
  } else if (category.includes('Grocery stores')) {
    return ['grocery', 'supermarket', 'food market'];
  } else if (category.includes('Bakeries')) {
    return ['bakery', 'bakeries', 'bread'];
  } else if (category.includes('Fitness options')) {
    return ['gym', 'fitness', 'yoga'];
  } else if (category.includes('Beauty')) {
    return ['beauty salon', 'hair salon', 'spa'];
  } else if (category.includes('Bars')) {
    return ['bars', 'pubs'];
  } else if (category.includes('brewery') || category.includes('breweries') || category.includes('Happy hours')) {
    // Specific brewery/bar search terms - NO food terms to prevent restaurant contamination
    return ['brewery', 'brewpub', 'craft beer', 'taproom'];
  } else {
    return [category.toLowerCase()];
  }
}

// Convert Yelp business data to our Business interface
function convertYelpToBusiness(yelpBusiness: any, userLat: number, userLng: number): Business | null {
  if (!yelpBusiness.name || !yelpBusiness.location) {
    return null;
  }

  const distance = calculateDistance(
    userLat, userLng,
    yelpBusiness.coordinates?.latitude || 0,
    yelpBusiness.coordinates?.longitude || 0
  );

  // Extract features from Yelp data
  const features: string[] = [];
  if (yelpBusiness.price) features.push(`Price: ${yelpBusiness.price}`);
  if (yelpBusiness.is_closed === false) features.push('Open');
  if (yelpBusiness.transactions?.includes('delivery')) features.push('Delivery');
  if (yelpBusiness.transactions?.includes('pickup')) features.push('Pickup');
  if (yelpBusiness.categories) {
    yelpBusiness.categories.forEach((cat: any) => {
      if (cat.title) features.push(cat.title);
    });
  }

  return {
    name: yelpBusiness.name,
    address: yelpBusiness.location.display_address?.join(', ') || '',
    description: `${yelpBusiness.rating} stars • ${yelpBusiness.review_count} reviews`,
    phone: yelpBusiness.phone || '',
    features,
    website: yelpBusiness.url || '',
    latitude: yelpBusiness.coordinates?.latitude,
    longitude: yelpBusiness.coordinates?.longitude,
    distance_miles: distance,
    image_url: yelpBusiness.image_url || '',
    rating: yelpBusiness.rating,
    review_count: yelpBusiness.review_count,
    place_id: undefined // Yelp doesn't provide Google Places IDs
  };
}

// Check if a Yelp business meets quality standards
function isQualityYelpBusiness(business: any): boolean {
  // Must have minimum rating and review count
  if (!business.rating || business.rating < 3.5) return false;
  if (!business.review_count || business.review_count < 5) return false;
  
  // Must not be permanently closed
  if (business.is_closed === true) return false;
  
  return true;
}

// Enhanced deduplicate businesses by name, address, and coordinates
function deduplicateBusinesses(businesses: Business[]): Business[] {
  const seen = new Set<string>();
  const coordinatesSeen = new Set<string>();
  
  return businesses.filter(business => {
    // Primary key: name + address
    const nameAddressKey = `${business.name.toLowerCase().trim()}-${business.address.toLowerCase().trim()}`;
    
    // Secondary key: name + coordinates (for businesses with different addresses but same location)
    const coordsKey = `${business.name.toLowerCase().trim()}-${business.latitude.toFixed(4)}-${business.longitude.toFixed(4)}`;
    
    // Third key: just coordinates (for exact same location businesses)
    const locationKey = `${business.latitude.toFixed(4)}-${business.longitude.toFixed(4)}`;
    
    if (seen.has(nameAddressKey) || seen.has(coordsKey)) {
      console.log(`→ Removing duplicate business: ${business.name} (${business.address})`);
      return false;
    }
    
    // Check for businesses at exact same coordinates with similar names
    if (coordinatesSeen.has(locationKey)) {
      const existingNames = Array.from(seen)
        .filter(key => key.includes(locationKey.replace(/\./g, '\\.')))
        .map(key => key.split('-')[0]);
      
      const normalizedCurrentName = business.name.toLowerCase().trim();
      if (existingNames.some(name => 
        areBusinessNamesSimilar(name, normalizedCurrentName) || 
        normalizedCurrentName.includes(name) || 
        name.includes(normalizedCurrentName)
      )) {
        console.log(`→ Removing duplicate business at same location: ${business.name}`);
        return false;
      }
    }
    
    seen.add(nameAddressKey);
    seen.add(coordsKey);
    coordinatesSeen.add(locationKey);
    return true;
  });
}

// Helper function to determine primary business type for cross-category deduplication
function getBusinessPrimaryType(business: Business): 'restaurant' | 'bar' | 'retail' | 'other' {
  const name = business.name.toLowerCase();
  const features = business.features ? business.features.join(' ').toLowerCase() : '';
  const description = business.description ? business.description.toLowerCase() : '';
  const types = business.types ? business.types.join(' ').toLowerCase() : '';
  
  console.log(`🔍 Analyzing business type for: ${business.name}`);
  console.log(`→ Types: ${types}`);
  console.log(`→ Features: ${features}`);
  
  // Strong liquor store indicators - highest priority to exclude from breweries
  const liquorStoreKeywords = ['liquor', 'wine shop', 'spirits', 'package store', 'wine & spirits', 'bottle shop'];
  const liquorStoreTypes = ['liquor_store', 'store'];
  
  if (liquorStoreKeywords.some(keyword => name.includes(keyword) || features.includes(keyword))) {
    console.log(`→ Classified as: retail (liquor store)`);
    return 'retail';
  }
  
  if (liquorStoreTypes.some(type => types.includes(type)) && 
      !name.includes('brewery') && !name.includes('brewpub')) {
    console.log(`→ Classified as: retail (store type)`);
    return 'retail';
  }
  
  // Bar/brewery indicators (higher priority for Drink Time)
  const barKeywords = ['brewery', 'brewpub', 'taproom', 'pub', 'bar', 'tavern', 'lounge', 'craft beer', 'beer garden', 'alehouse'];
  const barTypes = ['bar', 'night_club', 'brewery'];
  
  // Check for strong bar/brewery signals
  if (barKeywords.some(keyword => name.includes(keyword) || features.includes(keyword))) {
    console.log(`→ Classified as: bar`);
    return 'bar';
  }
  
  if (barTypes.some(type => types.includes(type))) {
    console.log(`→ Classified as: bar`);
    return 'bar';
  }
  
  // Restaurant indicators (higher priority for Food Time)
  const restaurantKeywords = ['kitchen', 'dining', 'grill', 'restaurant', 'bistro', 'eatery', 'food', 'cuisine', 'diner', 'cafe'];
  const restaurantTypes = ['restaurant', 'meal_takeaway', 'meal_delivery', 'food'];
  
  // Check for strong restaurant signals
  if (restaurantKeywords.some(keyword => name.includes(keyword) || features.includes(keyword))) {
    console.log(`→ Classified as: restaurant`);
    return 'restaurant';
  }
  
  if (restaurantTypes.some(type => types.includes(type))) {
    console.log(`→ Classified as: restaurant`);
    return 'restaurant';
  }
  
  // Default categorization based on features
  if (features.includes('alcohol') || features.includes('beer') || features.includes('wine')) {
    console.log(`→ Classified as: bar (alcohol features)`);
    return 'bar';
  }
  
  console.log(`→ Classified as: other`);
  return 'other';
}

// Enhanced function to check if a business is a brewery/bar suitable for consumption
function isBreweryConsumerBusiness(business: Business): boolean {
  const name = business.name.toLowerCase();
  const features = business.features ? business.features.join(' ').toLowerCase() : '';
  const types = business.types ? business.types.join(' ').toLowerCase() : '';
  
  console.log(`🍺 Checking brewery eligibility for: ${business.name}`);
  console.log(`→ Types: ${types}`);
  console.log(`→ Features: ${features}`);
  
  // Strong exclusions - liquor stores and retail establishments
  const retailExclusions = ['liquor store', 'wine shop', 'bottle shop', 'package store', 'beer store', 'wine & spirits', 'spirits'];
  const retailTypes = ['liquor_store', 'store'];
  
  if (retailExclusions.some(keyword => name.includes(keyword) || features.includes(keyword))) {
    console.log(`❌ Excluded ${business.name}: Retail alcohol business`);
    return false;
  }
  
  if (retailTypes.some(type => types.includes(type)) && 
      !name.includes('brewery') && !name.includes('brewpub') && !name.includes('taproom')) {
    console.log(`❌ Excluded ${business.name}: Retail store without brewery indicators`);
    return false;
  }
  
  // Exclude restaurant-primary businesses unless they're clearly brewpubs
  const businessType = getBusinessPrimaryType(business);
  if (businessType === 'retail') {
    console.log(`❌ Excluded ${business.name}: Classified as retail`);
    return false;
  }
  
  if (businessType === 'restaurant' && 
      !name.includes('brewery') && 
      !name.includes('brewpub') &&
      !name.includes('taphouse') &&
      !name.includes('taproom')) {
    console.log(`❌ Excluded ${business.name}: Restaurant-primary, not brewery`);
    return false;
  }
  
  // Must have indicators of on-premises alcohol consumption
  const consumptionIndicators = ['brewery', 'brewpub', 'taproom', 'taphouse', 'bar', 'pub', 'tavern', 'alehouse', 'beer garden'];
  const consumptionTypes = ['bar', 'brewery', 'night_club'];
  const consumptionFeatures = ['draft beer', 'tap room', 'on-tap', 'craft beer', 'beer on tap'];
  
  const hasConsumptionIndicators = consumptionIndicators.some(keyword => 
    name.includes(keyword)
  ) || consumptionTypes.some(type => types.includes(type)) ||
     consumptionFeatures.some(feature => features.includes(feature));
  
  if (!hasConsumptionIndicators) {
    console.log(`❌ Excluded ${business.name}: No on-premises consumption indicators`);
    return false;
  }
  
  console.log(`✅ Included ${business.name}: Valid brewery/bar business`);
  return true;
}

// Cross-API deduplication: check if businesses from different APIs are the same
function deduplicateAcrossAPIs(yelpBusinesses: Business[], googleBusinesses: Business[], category?: string): Business[] {
  const allBusinesses = [...yelpBusinesses];
  const yelpNames = new Set(yelpBusinesses.map(b => b.name.toLowerCase()));
  const businessTracker = new Map<string, Business>();
  
  console.log(`🔍 Starting cross-API deduplication for ${category || 'unknown'} category`);
  console.log(`→ Yelp businesses: ${yelpBusinesses.length}`);
  console.log(`→ Google businesses: ${googleBusinesses.length}`);
  
  // Track Yelp businesses
  yelpBusinesses.forEach(business => {
    const key = `${business.name.toLowerCase()}-${business.address?.toLowerCase() || ''}`;
    businessTracker.set(key, business);
  });
  
  for (const googleBusiness of googleBusinesses) {
    const nameMatch = yelpNames.has(googleBusiness.name.toLowerCase());
    const businessType = getBusinessPrimaryType(googleBusiness);
    
    console.log(`Processing Google business: ${googleBusiness.name} (Type: ${businessType})`);
    
    if (!nameMatch) {
      // Enhanced brewery category filtering
      if (category && (category.includes('brewery') || category.includes('Happy hours'))) {
        // For brewery searches, apply strict filtering
        if (!isBreweryConsumerBusiness(googleBusiness)) {
          console.log(`→ Filtering non-brewery business from ${category}: ${googleBusiness.name}`);
          continue;
        }
        
        // Additional check for retail businesses that might slip through
        if (businessType === 'retail') {
          console.log(`→ Skipping retail business for brewery category: ${googleBusiness.name}`);
          continue;
        }
      }
      
      // Check for similar businesses with different names (address-based matching)
      const googleKey = `${googleBusiness.name.toLowerCase()}-${googleBusiness.address?.toLowerCase() || ''}`;
      
      if (!businessTracker.has(googleKey)) {
        businessTracker.set(googleKey, googleBusiness);
        allBusinesses.push(googleBusiness);
        console.log(`✅ Added Google business: ${googleBusiness.name}`);
      } else {
        console.log(`→ Skipping duplicate business: ${googleBusiness.name}`);
      }
    } else {
      console.log(`→ Skipping duplicate business across APIs: ${googleBusiness.name}`);
    }
  }
  
  return allBusinesses;
}

// Google Places API integration

// Helper function to check if a business is actually consumer-facing retail
function isRetailConsumerBusiness(place: any, category: string): boolean {
  const name = place.name.toLowerCase();
  const types = place.types || [];
  const typesString = types.join(' ').toLowerCase();
  
  // Exclude obvious B2B/wholesale businesses for grocery category
  if (category.includes('Grocery stores')) {
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
    
    // For grocery searches, exclude non-grocery retail stores
    const nonGroceryRetail = [
      'clothing', 'department_store', 'electronics_store', 'furniture_store',
      'jewelry_store', 'shoe_store', 'shopping_mall', 'book_store',
      'home_goods_store', 'beauty_salon', 'spa', 'gym', 'bank',
      'gas_station', 'car_dealer', 'pharmacy'
    ];
    
    // Exclude if it's clearly a non-grocery retail store
    if (nonGroceryRetail.some(type => types.includes(type))) {
      console.log(`→ Excluding non-grocery retail: ${place.name} (types: ${types.join(', ')})`);
      return false;
    }
    
    // Exclude specific non-grocery store names
    const nonGroceryNames = [
      'macy', 'nordstrom', 'target', 'walmart', 'best buy', 'home depot',
      'lowes', 'cvs', 'walgreens', 'rite aid', 'apple store', 'starbucks'
    ];
    
    if (nonGroceryNames.some(storeName => name.includes(storeName)) && 
        !name.includes('market') && !name.includes('grocery') && !name.includes('food')) {
      console.log(`→ Excluding non-grocery store: ${place.name}`);
      return false;
    }
    
    // Must have grocery-oriented types
    const groceryTypes = [
      'grocery_or_supermarket', 'supermarket', 'convenience_store', 'food'
    ];
    
    const hasGroceryType = groceryTypes.some(type => types.includes(type)) ||
                          name.includes('market') || name.includes('grocery') || 
                          name.includes('supermarket') || name.includes('food');
    
    if (!hasGroceryType) {
      console.log(`→ Excluding non-grocery business: ${place.name} (types: ${types.join(', ')})`);
      return false;
    }
  }
  
  // For Shopping, exclude grocery stores and food-related businesses
  if (category.includes('Shopping')) {
    const groceryKeywords = [
      'grocery', 'supermarket', 'market', 'food', 'deli', 'convenience',
      'bodega', 'corner store', 'food mart', 'fresh market'
    ];
    
    const groceryTypes = [
      'grocery_or_supermarket', 'supermarket', 'convenience_store', 'meal_takeaway',
      'restaurant', 'food', 'bakery', 'liquor_store'
    ];
    
    // Exclude if it has grocery-related keywords or types
    if (groceryKeywords.some(keyword => name.includes(keyword)) ||
        groceryTypes.some(type => types.includes(type))) {
      console.log(`→ Excluding grocery/food business from Shopping: ${place.name}`);
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
  
  // For veterinary care and certain service categories, be more lenient with review count requirements
  const leniencyCategories = ['Veterinary care', 'Mental health services', 'DMV / Government services'];
  const isLeniencyCategory = leniencyCategories.some(cat => category.includes(cat));
  
  // Must have a reasonable rating count (indicates consumer traffic) - but be less strict for certain categories
  const minReviewCount = isLeniencyCategory ? 1 : 3;
  if (place.user_ratings_total !== undefined && place.user_ratings_total < minReviewCount) {
    console.log(`→ Excluding business with very low review count: ${place.name} (${place.user_ratings_total} reviews, min required: ${minReviewCount})`);
    return false;
  }
  
  return true;
}

// Helper function to check if a business is DMV-related
function isDMVRelated(place: any): boolean {
  const name = place.name?.toLowerCase() || '';
  const types = place.types || [];
  const typesString = types.join(' ').toLowerCase();
  
  // DMV-specific keywords
  const dmvKeywords = [
    'department of motor vehicles', 'dmv', 'motor vehicle', 'vehicle registration',
    'driver license', 'driver\'s license', 'vehicle licensing', 'motor vehicle services',
    'registry of motor vehicles', 'motor vehicle department'
  ];
  
  // Non-DMV government services to exclude
  const excludeKeywords = [
    'social services', 'revenue', 'taxation', 'health department', 'planning',
    'building department', 'fire department', 'police', 'court', 'clerk',
    'treasurer', 'assessor', 'parks', 'recreation', 'library', 'aaa', 'triple a',
    'department of social services', 'parking authority', 'department of revenue'
  ];
  
  const hasDMVKeywords = dmvKeywords.some(keyword => 
    name.includes(keyword) || typesString.includes(keyword)
  );
  
  const hasExcludeKeywords = excludeKeywords.some(keyword => 
    name.includes(keyword) || typesString.includes(keyword)
  );
  
  return hasDMVKeywords && !hasExcludeKeywords;
}

// Define multiple search strategies for different categories to improve coverage
function getSearchStrategies(category: string): Array<{ keyword?: string; type?: string }> {
  const strategies = [];
  
  if (category.includes('Grocery stores')) {
    strategies.push(
      { keyword: 'grocery stores' },
      { keyword: 'supermarkets' },
      { keyword: 'food markets' },
      { type: 'grocery_or_supermarket' },
      { type: 'supermarket' }
    );
  } else if (category.includes('Coffee shops')) {
    strategies.push(
      { keyword: 'coffee shops' },
      { keyword: 'cafes' },
      { keyword: 'specialty coffee' },
      { keyword: 'roastery' },
      { keyword: 'coffee roasters' },
      { keyword: 'espresso bar' },
      { type: 'cafe' }
    );
  } else if (category.includes('Restaurants')) {
    strategies.push(
      { keyword: 'restaurants' },
      { keyword: 'dining' },
      { type: 'restaurant' }
    );
  } else if (category.includes('Pharmacies')) {
    strategies.push(
      { keyword: 'pharmacies' },
      { keyword: 'drug stores' },
      { type: 'pharmacy' }
    );
  } else if (category.includes('Bakeries')) {
    strategies.push(
      { keyword: 'bakeries' },
      { keyword: 'bakery' },
      { keyword: 'bread shops' },
      { type: 'bakery' }
    );
  } else if (category.includes('Medical care')) {
    strategies.push(
      { keyword: 'medical clinics' },
      { keyword: 'doctors offices' },
      { keyword: 'urgent care' },
      { keyword: 'family practice' },
      { type: 'doctor' },
      { type: 'hospital' }
    );
  } else if (category.includes('Fitness options')) {
    strategies.push(
      { keyword: 'fitness gyms' },
      { keyword: 'health clubs' },
      { keyword: 'yoga studios' },
      { keyword: 'pilates studios' },
      { type: 'gym' }
    );
  } else if (category.includes('Veterinary care')) {
    strategies.push(
      { keyword: 'veterinary clinics' },
      { keyword: 'animal hospitals' },
      { keyword: 'veterinarian' },
      { keyword: 'vet clinic' },
      { keyword: 'pet hospital' },
      { type: 'veterinary_care' },
      { type: 'hospital' }
    );
  } else if (category.includes('Mental health services')) {
    strategies.push(
      { keyword: 'mental health services' },
      { keyword: 'therapy' },
      { keyword: 'counseling' },
      { type: 'doctor' }
    );
  } else if (category.includes('DMV / Government services')) {
    strategies.push(
      { keyword: 'DMV' },
      { keyword: 'Department of Motor Vehicles' },
      { keyword: 'motor vehicle department' },
      { keyword: 'vehicle registration' },
      { keyword: 'driver license' },
      { type: 'local_government_office' }
    );
  } else if (category.includes('Public transit / commute info')) {
    strategies.push(
      { keyword: 'public transportation' },
      { keyword: 'bus stations' },
      { keyword: 'train stations' },
      { type: 'transit_station' },
      { type: 'bus_station' }
    );
  } else if (category.includes('Hardware stores')) {
    strategies.push(
      { keyword: 'hardware stores' },
      { keyword: 'home improvement stores' },
      { keyword: 'building supplies' },
      { type: 'hardware_store' },
      { type: 'home_goods_store' }
    );
  } else if (category.includes('Banking / Financial')) {
    strategies.push(
      { keyword: 'banks' },
      { keyword: 'credit unions' },
      { keyword: 'financial services' },
      { type: 'bank' },
      { type: 'atm' }
    );
  } else if (category.includes('Parks / Trails')) {
    strategies.push(
      { keyword: 'parks' },
      { keyword: 'trails' },
      { keyword: 'recreation areas' },
      { type: 'park' }
    );
  } else if (category.includes('Faith communities')) {
    strategies.push(
      { keyword: 'churches' },
      { keyword: 'temples' },
      { keyword: 'faith communities' },
      { type: 'church' },
      { type: 'place_of_worship' }
    );
  } else if (category.includes('Social events / community groups')) {
    strategies.push(
      { keyword: 'community centers' },
      { keyword: 'social clubs' },
      { keyword: 'event venues' },
      { type: 'community_center' }
    );
  } else if (category.includes('Libraries / Education')) {
    strategies.push(
      { keyword: 'libraries' },
      { keyword: 'education centers' },
      { keyword: 'schools' },
      { type: 'library' },
      { type: 'school' }
    );
  } else if (category.includes('junk removal')) {
    strategies.push(
      { keyword: 'junk removal' },
      { keyword: 'waste removal' },
      { keyword: 'hauling services' },
      { keyword: 'debris removal' },
      { keyword: 'trash removal' }
    );
  } else if (category.includes('brewery') || category.includes('breweries') || category.includes('Happy hours')) {
    strategies.push(
      { keyword: 'brewery' },
      { keyword: 'brewpub' },
      { keyword: 'craft beer' },
      { keyword: 'craft brewery' },
      { keyword: 'taproom' },
      { keyword: 'beer garden' },
      { keyword: 'microbrewery' },
      { keyword: 'happy hour' },
      { keyword: 'bar and grill' },
      { type: 'bar' },
      { type: 'brewery' }
    );
  } else if (category.includes('personal care')) {
    strategies.push(
      { keyword: 'hair salon' },
      { keyword: 'nail salon' },
      { keyword: 'barbershop' },
      { keyword: 'beauty salon' },
      { type: 'hair_care' },
      { type: 'beauty_salon' }
    );
  } else if (category.includes('Food Scene') || category.includes('restaurant')) {
    strategies.push(
      { keyword: 'restaurants' },
      { keyword: 'dining' },
      { keyword: 'bistro' },
      { keyword: 'food truck' },
      { type: 'restaurant' }
    );
  } else if (category.includes('Shopping') || category.includes('boutique')) {
    strategies.push(
      { keyword: 'boutique' },
      { keyword: 'shopping mall' },
      { type: 'shopping_mall' },
      { type: 'clothing_store' },
      { type: 'department_store' }
    );
  } else if (category.includes('Wellness & Self Care') || category.includes('spa')) {
    strategies.push(
      { keyword: 'spa' },
      { keyword: 'wellness center' },
      { keyword: 'massage therapy' },
      { keyword: 'meditation center' },
      { keyword: 'day spa' },
      { type: 'spa' }
    );
  } else if (category.includes('Local Events') || category.includes('event venue')) {
    strategies.push(
      { keyword: 'event venue' },
      { keyword: 'community center' },
      { keyword: 'entertainment venue' },
      { keyword: 'event space' },
      { type: 'community_center' }
    );
  } else {
    // Default single strategy for other categories
    strategies.push({ keyword: category });
  }
  
  return strategies;
}

// COST-OPTIMIZED Google Places API integration with FieldMasks and Session Tokens
async function searchGooglePlaces(
  category: string,
  latitude: number,
  longitude: number,
  customRadius?: number,
  exploreMode: boolean = false,
  userCoordinates?: { lat: number; lng: number }
): Promise<Business[]> {
  const googleApiKey = Deno.env.get('GOOGLE_PLACES_API_KEY');
  if (!googleApiKey) {
    console.error('❌ CRITICAL: Google Places API key not found! This will cause 0 results for all business searches.');
    console.error('Please add GOOGLE_PLACES_API_KEY to Supabase secrets to fix this issue.');
    return [];
  }
  
  console.log('Google Places API key found, using advanced cost-optimized search...');

  // Use dynamic radius based on area density
  const radius = customRadius || getOptimalRadius({ lat: latitude, lng: longitude });
  
  // COST REDUCTION: Use only PRIMARY search strategy per category to reduce API calls
  const searchStrategies = getSearchStrategies(category).slice(0, 2); // Max 2 strategies instead of all
  const uniquePlaces = new Map();
  
  // COST OPTIMIZATION: Generate session token for this search session
  const sessionToken = generateSessionToken();
  console.log(`Using session token: ${sessionToken.substring(0, 8)}...`);
  
  try {
    console.log(`Advanced cost-optimized search for "${category}" at ${latitude}, ${longitude} with ${radius}m radius`);
    
    // Execute limited search strategies with FieldMasks
    for (const strategy of searchStrategies) {
      // COST OPTIMIZATION: Use FieldMask to only request essential fields for nearby search
      const nearbySearchFields = 'place_id,name,vicinity,geometry,rating,user_ratings_total,types,photos,price_level,opening_hours';
      
      let searchUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${latitude},${longitude}&radius=${radius}`;
      
      if (strategy.type) {
        searchUrl += `&type=${strategy.type}`;
      }
      if (strategy.keyword) {
        searchUrl += `&keyword=${encodeURIComponent(strategy.keyword)}`;
      }
      
      // Add session token and field mask for cost optimization
      searchUrl += `&fields=${nearbySearchFields}&sessiontoken=${sessionToken}&key=${googleApiKey}`;
      
      console.log(`→ Strategy: ${strategy.keyword || strategy.type} (with FieldMask)`);
      trackAPIUsage('google'); // Track Google Places API call
      
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
      
      if (data.status && data.status !== 'OK') {
        console.error(`Google Places API returned status: ${data.status}`);
        if (data.error_message) {
          console.error(`Error message: ${data.error_message}`);
        }
      }

      // Add unique results using place_id as key to avoid duplicates
      if (data.results) {
        data.results.forEach(place => {
          if (place.place_id && !uniquePlaces.has(place.place_id)) {
            uniquePlaces.set(place.place_id, place);
          }
        });
      }
    }

    // Convert Map values to array
    const uniqueResults = Array.from(uniquePlaces.values());
    console.log(`Combined ${uniqueResults.length} unique businesses from cost-optimized search`);

    if (uniqueResults.length === 0) {
      return [];
    }

    // COST REDUCTION: Filter and limit to top businesses before expensive API calls
    const topBusinesses = uniqueResults
      .filter((place: any) => isRetailConsumerBusiness(place, category))
      .sort((a: any, b: any) => {
        // For explore mode, prioritize distance over ratings for essential needs
        if (exploreMode) {
          // Calculate distance for sorting (we'll do proper calculation later)
          const distanceA = calculateDistance(userCoordinates.lat, userCoordinates.lng, 
            a.geometry?.location?.lat || 0, a.geometry?.location?.lng || 0);
          const distanceB = calculateDistance(userCoordinates.lat, userCoordinates.lng, 
            b.geometry?.location?.lat || 0, b.geometry?.location?.lng || 0);
          return distanceA - distanceB;
        } else {
          // For popular mode, sort by rating first, then review count
          const ratingDiff = (b.rating || 0) - (a.rating || 0);
          if (ratingDiff !== 0) return ratingDiff;
          return (b.user_ratings_total || 0) - (a.user_ratings_total || 0);
        }
      })
      .slice(0, exploreMode ? 8 : 12); // EXPLORE: Only 8 closest, POPULAR: 12 businesses

    console.log(`Processing top ${topBusinesses.length} businesses to minimize API costs`);

    // Process businesses with cost-optimized photo and details strategy
    const businesses = await Promise.all(
      topBusinesses.map(async (place: any) => {
        let imageUrl = '';
        let website = '';
        let phone = '';
        
        // EXPLORE MODE: Fetch photos for ALL businesses (no rating filter)
        // POPULAR MODE: Only fetch photos for highly rated businesses (4.0+)
        if (place.photos && place.photos.length > 0 && (exploreMode || (place.rating || 0) >= 4.0)) {
          const photoReference = place.photos[0].photo_reference;
          // COST OPTIMIZATION: Use smaller image size and session token for photos
          imageUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=300&photoreference=${photoReference}&sessiontoken=${sessionToken}&key=${googleApiKey}`;
          console.log(`→ Fetching optimized photo for business: ${place.name}`);
        } else {
          console.log(`→ Skipping photo for: ${place.name} (rating: ${place.rating || 'N/A'})`);
        }

        // Details will be fetched on-demand via get-business-details function
        // This reduces API costs by 70-90% by only fetching details when users interact with businesses
        console.log(`→ Skipping automatic details for: ${place.name} (will be fetched on-demand)`);

        // COST OPTIMIZATION: Generate static map as fallback if no business photo
        const staticMapUrl = !imageUrl && place.geometry?.location?.lat && place.geometry?.location?.lng
          ? generateStaticMapUrl(place.geometry.location.lat, place.geometry.location.lng, place.name)
          : '';

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
          image_url: imageUrl || staticMapUrl, // Use static map as fallback
          rating: place.rating || 0,
          review_count: place.user_ratings_total || 0,
          place_id: place.place_id
        };
      })
    );

    console.log(`Cost-optimized search completed: ${businesses.length} businesses processed`);
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
// COST OPTIMIZATION: Generate session token for Google Places API
function generateSessionToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 36; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// COST OPTIMIZATION: Generate static map URL using Maps Embed API
function generateStaticMapUrl(latitude: number, longitude: number, businessName: string): string {
  const googleApiKey = Deno.env.get('GOOGLE_PLACES_API_KEY');
  if (!googleApiKey) return '';
  
  // Use Maps Static API with minimal parameters for cost efficiency
  const mapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${latitude},${longitude}&zoom=15&size=300x200&markers=color:red%7Clabel:S%7C${latitude},${longitude}&style=feature:poi%7Cvisibility:off&key=${googleApiKey}`;
  return mapUrl;
}

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

// Helper function to normalize business names for better matching
function normalizeBusinessName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    // Remove common suffixes/prefixes that vary between APIs
    .replace(/\b(pharmacy|store|inc|llc|corp|corporation|company|co\.|ltd)\b/g, '')
    // Remove extra whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

// Helper function to check if two business names are similar
function areBusinessNamesSimilar(name1: string, name2: string): boolean {
  const normalized1 = normalizeBusinessName(name1);
  const normalized2 = normalizeBusinessName(name2);
  
  // Direct match after normalization
  if (normalized1 === normalized2) return true;
  
  // Check if one is a substring of the other (e.g., "CVS" vs "CVS Pharmacy")
  if (normalized1.includes(normalized2) || normalized2.includes(normalized1)) {
    return true;
  }
  
  return false;
}

// Enhanced function to deduplicate businesses by name and location
function deduplicateBusinessesByLocation(businesses: Business[], userCoordinates: { lat: number; lng: number }): Business[] {
  // First pass: Group by exact normalized names
  const businessGroups = new Map<string, Business[]>();
  
  businesses.forEach(business => {
    const normalizedName = normalizeBusinessName(business.name);
    if (!businessGroups.has(normalizedName)) {
      businessGroups.set(normalizedName, []);
    }
    businessGroups.get(normalizedName)!.push(business);
  });
  
  // Second pass: Merge groups with similar names
  const groupKeys = Array.from(businessGroups.keys());
  for (let i = 0; i < groupKeys.length; i++) {
    for (let j = i + 1; j < groupKeys.length; j++) {
      const key1 = groupKeys[i];
      const key2 = groupKeys[j];
      
      if (businessGroups.has(key1) && businessGroups.has(key2) && areBusinessNamesSimilar(key1, key2)) {
        // Merge the groups
        const group1 = businessGroups.get(key1)!;
        const group2 = businessGroups.get(key2)!;
        businessGroups.set(key1, [...group1, ...group2]);
        businessGroups.delete(key2);
        // Update groupKeys array
        groupKeys.splice(j, 1);
        j--; // Adjust index after removal
      }
    }
  }
  
  const deduplicatedBusinesses: Business[] = [];
  
  // For each business group, apply location-based deduplication
  businessGroups.forEach((locations, businessName) => {
    if (locations.length === 1) {
      deduplicatedBusinesses.push(locations[0]);
      return;
    }
    
    // Calculate distances from user for sorting
    locations.forEach(business => {
      if (business.latitude && business.longitude) {
        business.distance_miles = calculateDistance(
          userCoordinates.lat, 
          userCoordinates.lng, 
          business.latitude, 
          business.longitude
        );
      }
    });
    
    // Sort by distance from user (closest first)
    locations.sort((a, b) => (a.distance_miles || 999) - (b.distance_miles || 999));
    
    // Apply aggressive coordinate-based deduplication for very close locations (0.1 miles = ~500 feet)
    const keptLocations: Business[] = [];
    
    for (const location of locations) {
      if (!location.latitude || !location.longitude) {
        continue;
      }
      
      // Check if this location is very close to any kept location (same building/plaza)
      const veryClose = keptLocations.some(kept => {
        if (!kept.latitude || !kept.longitude) return false;
        const distance = calculateDistance(
          location.latitude!,
          location.longitude!,
          kept.latitude,
          kept.longitude
        );
        return distance <= 0.1; // 0.1 miles = ~500 feet (same building/plaza)
      });
      
      if (veryClose) {
        console.log(`→ Filtering out duplicate ${location.name} at ${location.address} (same location as existing entry)`);
        continue;
      }
      
      // For remaining locations, use 5-mile rule for different locations of same business
      const tooClose = keptLocations.some(kept => {
        if (!kept.latitude || !kept.longitude) return false;
        const distance = calculateDistance(
          location.latitude!,
          location.longitude!,
          kept.latitude,
          kept.longitude
        );
        return distance <= 5;
      });
      
      if (!tooClose) {
        keptLocations.push(location);
        console.log(`→ Keeping ${location.name} at ${location.address} (${location.distance_miles?.toFixed(1)}mi from user)`);
      } else {
        console.log(`→ Filtering out duplicate ${location.name} at ${location.address} (too close to existing location)`);
      }
    }
    
    deduplicatedBusinesses.push(...keptLocations);
  });
  
  console.log(`Deduplication: ${businesses.length} → ${deduplicatedBusinesses.length} businesses`);
  return deduplicatedBusinesses;
}

// COST-OPTIMIZED: Smart business search with selective API routing
async function searchBusinesses(category: string, coordinates: { lat: number; lng: number }, userPreferences?: QuizResponse, exploreMode: boolean = false): Promise<Business[]> {
  console.log(`Searching for "${category}" businesses near ${coordinates.lat}, ${coordinates.lng}`);
  
  // Use dynamic radius based on location
  const optimalRadius = getOptimalRadius(coordinates);
  console.log(`Using dynamic radius: ${optimalRadius}m for area density optimization`);
  
  let businesses: Business[] = [];
  
  // Smart API routing: Use Yelp for consumer businesses, Google for civic/institutional
  if (shouldUseYelpPrimary(category)) {
    console.log(`Using Yelp as primary for consumer category: "${category}"`);
    
    // Search Yelp first
    const yelpBusinesses = await searchYelp(category, coordinates.lat, coordinates.lng, optimalRadius, 15);
    console.log(`Yelp found ${yelpBusinesses.length} businesses`);
    
    // If Yelp results are insufficient, supplement with Google Places
    if (yelpBusinesses.length < 8) {
      console.log(`Supplementing with Google Places (Yelp returned ${yelpBusinesses.length} businesses)`);
      const googleBusinesses = await searchGooglePlaces(category, coordinates.lat, coordinates.lng, optimalRadius, exploreMode, coordinates);
      console.log(`Google Places found ${googleBusinesses.length} additional businesses`);
      
      // Deduplicate across APIs and combine
      businesses = deduplicateAcrossAPIs(yelpBusinesses, googleBusinesses, category);
    } else {
      businesses = yelpBusinesses;
    }
  } else {
    console.log(`Using Google Places as primary for civic/institutional category: "${category}"`);
    businesses = await searchGooglePlaces(category, coordinates.lat, coordinates.lng, optimalRadius, exploreMode, coordinates);
    console.log(`Google Places found ${businesses.length} businesses for category: ${category}`);
    
    // Extra debugging for DMV searches
    if (category.includes('DMV / Government services')) {
      console.log(`=== DMV SEARCH RESULTS ===`);
      console.log(`Search radius: ${optimalRadius}m`);
      console.log(`Raw Google Places results:`, businesses.map(b => ({ 
        name: b.name, 
        address: b.address, 
        types: b.types,
        distance: b.distance_miles 
      })));
    }
  }
  
  // Apply deduplication to remove same-name businesses within 5 miles
  if (businesses.length > 0) {
    businesses = deduplicateBusinessesByLocation(businesses, coordinates);
  }
  
  // CRITICAL: Add fallback for when Google Places fails
  if (businesses.length === 0) {
    console.log(`No businesses found from Google Places for "${category}". Providing fallback recommendations.`);
    const fallbackBusinesses = getFallbackBusinesses(category, coordinates);
    
    if (fallbackBusinesses.length > 0) {
      console.log(`Using ${fallbackBusinesses.length} fallback businesses for "${category}"`);
      return fallbackBusinesses;
    }
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
  
  // Filter businesses based on transportation style and realistic distances
  let filteredBusinesses = businesses;
  if (userPreferences?.transportationStyle) {
    const getMaxDistanceForTransportation = (transportationStyle: string): number => {
      switch (transportationStyle) {
        case 'Bike / walk':
          return 3; // 3 miles max for biking/walking
        case 'Public transit':
          return 8; // 8 miles max for public transit
        case 'Rideshare only':
          return 12; // 12 miles max for rideshare
        case 'Car':
        default:
          return 15; // 15 miles max for car
      }
    };

    const maxDistance = getMaxDistanceForTransportation(userPreferences.transportationStyle);
    console.log(`Filtering businesses by transportation style "${userPreferences.transportationStyle}" with max distance: ${maxDistance} miles`);
    
    filteredBusinesses = businesses.filter(business => 
      business.distance_miles && business.distance_miles <= maxDistance
    );
    
    console.log(`Filtered from ${businesses.length} to ${filteredBusinesses.length} businesses based on transportation`);
  }
  
  // Special filtering for DMV searches to ensure only actual DMV locations
  if (category.includes('DMV / Government services')) {
    console.log(`=== DMV SEARCH DEBUG ===`);
    console.log(`Starting DMV filtering with ${filteredBusinesses.length} businesses`);
    console.log(`Businesses before DMV filtering:`, filteredBusinesses.map(b => ({ name: b.name, address: b.address, types: b.types })));
    
    filteredBusinesses = filteredBusinesses.filter(business => {
      // For Google Places businesses, use the isDMVRelated function
      if (business.place_id) {
        return isDMVRelated({ name: business.name, types: business.types || [] });
      }
      
      // For Yelp businesses, check name and categories
      const name = business.name?.toLowerCase() || '';
      const categories = business.categories?.join(' ').toLowerCase() || '';
      
      const dmvKeywords = [
        'department of motor vehicles', 'dmv', 'motor vehicle', 'vehicle registration',
        'driver license', 'driver\'s license', 'vehicle licensing', 'motor vehicle services'
      ];
      
      const excludeKeywords = [
        'social services', 'revenue', 'taxation', 'health department', 'planning',
        'building department', 'fire department', 'police', 'court', 'clerk',
        'aaa', 'triple a', 'parking authority', 'department of revenue'
      ];
      
      const hasDMVKeywords = dmvKeywords.some(keyword => 
        name.includes(keyword) || categories.includes(keyword)
      );
      
      const hasExcludeKeywords = excludeKeywords.some(keyword => 
        name.includes(keyword) || categories.includes(keyword)
      );
      
      const isValidDMV = hasDMVKeywords && !hasExcludeKeywords;
      console.log(`Business: ${business.name} | DMV keywords: ${hasDMVKeywords} | Exclude keywords: ${hasExcludeKeywords} | Valid DMV: ${isValidDMV}`);
      
      return isValidDMV;
    });
    console.log(`DMV filtering: ${businesses.length} → ${filteredBusinesses.length} businesses`);
    console.log(`Final DMV businesses:`, filteredBusinesses.map(b => ({ name: b.name, address: b.address, distance: b.distance_miles })));
    console.log(`=== END DMV DEBUG ===`);
  }
  
  // EXPLORE MODE: Simple distance-only sorting (no complex scoring)
  // POPULAR MODE: Apply relevance scoring with ratings
  if (exploreMode) {
    console.log(`EXPLORE MODE: Sorting ${filteredBusinesses.length} businesses by distance only (no rating calculations)`);
    
    // Simple distance-only sorting for explore mode
    filteredBusinesses.sort((a, b) => (a.distance_miles || 0) - (b.distance_miles || 0));
    
    console.log(`Top 5 closest businesses:`);
    filteredBusinesses.slice(0, 5).forEach((business, index) => {
      console.log(`${index + 1}. ${business.name} - Distance: ${business.distance_miles}mi`);
    });
  } else if (userPreferences && filteredBusinesses.length > 0) {
    // Use distance-heavy scoring for Popular mode recommendations
    const scoringMode = 'distance-heavy';
    console.log(`POPULAR MODE: Applying ${scoringMode} relevance scoring to ${filteredBusinesses.length} businesses`);
    
    // Calculate relevance score for each business
    filteredBusinesses.forEach(business => {
      business.relevance_score = calculateRelevanceScore(business, category, userPreferences, scoringMode);
    });
    
    // Sort by relevance score (highest first)
    filteredBusinesses.sort((a, b) => (b.relevance_score || 0) - (a.relevance_score || 0));
    
    console.log(`Top 5 businesses by relevance score:`);
    filteredBusinesses.slice(0, 5).forEach((business, index) => {
      console.log(`${index + 1}. ${business.name} - Score: ${business.relevance_score}, Distance: ${business.distance_miles}mi`);
    });
  }
  
  // Return more results for the two-tier system (up to 40 for better variety)
  return filteredBusinesses.slice(0, 40);
}

// CRITICAL: Fallback function to ensure users always get recommendations
function getFallbackBusinesses(category: string, coordinates: { lat: number; lng: number }): Business[] {
  const fallbackBusinesses: Business[] = [];
  
  // Determine state/region based on coordinates for more accurate fallbacks
  const { state, region } = getLocationInfo(coordinates);
  
  if (category.includes('grocery')) {
    fallbackBusinesses.push(
      {
        name: "Local Grocery Store",
        address: `Near ${coordinates.lat.toFixed(2)}, ${coordinates.lng.toFixed(2)}`,
        description: "Grocery shopping and fresh produce",
        phone: "Contact for hours and information",
        features: ["Local", "Essential"],
        latitude: coordinates.lat + 0.01,
        longitude: coordinates.lng + 0.01,
        distance_miles: 0.7,
        rating: 4.1,
        review_count: 25
      },
      {
        name: region === 'northeast' ? "Market Basket" : region === 'west' ? "Safeway" : region === 'south' ? "Publix" : "Regional Grocery Chain",
        address: `${state} location near you`,
        description: "Full-service supermarket with wide selection",
        phone: "Check store locator",
        features: ["Chain", "Full Service"],
        latitude: coordinates.lat + 0.02,
        longitude: coordinates.lng - 0.01,
        distance_miles: 1.2,
        rating: 4.3,
        review_count: 156
      }
    );
  }
  
  if (category.includes('medical') || category.includes('health')) {
    fallbackBusinesses.push(
      {
        name: "Family Medical Center",
        address: `Near ${coordinates.lat.toFixed(2)}, ${coordinates.lng.toFixed(2)}`,
        description: "Primary care and family medicine",
        phone: "Call for appointment",
        features: ["Local", "Family Care"],
        latitude: coordinates.lat - 0.01,
        longitude: coordinates.lng + 0.02,
        distance_miles: 0.9,
        rating: 4.2,
        review_count: 43
      },
      {
        name: "Urgent Care Center", 
        address: `${state} urgent care facility`,
        description: "Walk-in urgent care services",
        phone: "No appointment needed",
        features: ["Chain", "Walk-in"],
        latitude: coordinates.lat + 0.015,
        longitude: coordinates.lng - 0.015,
        distance_miles: 1.5,
        rating: 4.0,
        review_count: 89
      }
    );
  }
  
  if (category.includes('fitness') || category.includes('gym')) {
    fallbackBusinesses.push(
      {
        name: "Local Fitness Center",
        address: `Near ${coordinates.lat.toFixed(2)}, ${coordinates.lng.toFixed(2)}`,
        description: "Fitness equipment and group classes",
        phone: "Call for membership info",
        features: ["Local", "Classes"],
        latitude: coordinates.lat + 0.005,
        longitude: coordinates.lng + 0.01,
        distance_miles: 0.5,
        rating: 4.1,
        review_count: 32
      },
      {
        name: "Planet Fitness",
        address: `${state} location`,
        description: "Budget-friendly gym with cardio and strength equipment",
        phone: "Check website for hours",
        features: ["Chain", "Budget-Friendly"],
        latitude: coordinates.lat - 0.02,
        longitude: coordinates.lng + 0.01,
        distance_miles: 1.8,
        rating: 4.0,
        review_count: 234
      }
    );
  }
  
  return fallbackBusinesses;
}

// Helper function to determine location info for better fallbacks
function getLocationInfo(coordinates: { lat: number; lng: number }): { state: string; region: string } {
  const { lat, lng } = coordinates;
  
  // Rough state/region determination based on coordinates
  let state = "Unknown";
  let region = "unknown";
  
  // Northeast
  if (lat >= 39 && lat <= 47 && lng >= -80 && lng <= -66) {
    region = "northeast";
    if (lat >= 42 && lng >= -74) state = "Connecticut";
    else if (lat >= 42 && lng <= -74) state = "New York";
    else if (lat >= 40 && lat < 42) state = "New Jersey";
  }
  // Southeast  
  else if (lat >= 24 && lat <= 39 && lng >= -87 && lng <= -75) {
    region = "south";
    state = "Southeast US";
  }
  // West
  else if (lng <= -100) {
    region = "west";
    state = "Western US";
  }
  // Midwest
  else if (lat >= 37 && lat <= 49 && lng >= -100 && lng <= -80) {
    region = "midwest";
    state = "Midwest US";
  }
  
  return { state, region };
}

// Enhanced relevance scoring with Yelp budget matching and detailed categories
function calculateRelevanceScore(business: Business, category: string, userPreferences?: QuizResponse, scoringMode: 'rating-heavy' | 'distance-heavy' = 'distance-heavy'): number {
  let score = 0;
  
  // Distance scoring varies by mode
  const maxDistanceScore = scoringMode === 'rating-heavy' ? 25 : 50;
  const maxRatingScore = 35; // Always 35 for both modes
  
  // Enhanced budget matching using Yelp price levels (max 15 points)
  if (userPreferences?.budgetPreference && business.features) {
    const budgetBonus = calculateBudgetMatch(business, userPreferences.budgetPreference);
    score += budgetBonus;
  }
  
  if (business.distance_miles && userPreferences) {
    let distanceWeight = 0;
    
    // Adjust distance scoring based on transportation style and mode
    if (userPreferences.transportationStyle === 'Bike / walk') {
      // Walkers/bikers prefer very close locations
      distanceWeight = business.distance_miles <= 0.5 ? maxDistanceScore : 
                      business.distance_miles <= 1 ? maxDistanceScore * 0.8 :
                      business.distance_miles <= 2 ? maxDistanceScore * 0.5 :
                      business.distance_miles <= 3 ? maxDistanceScore * 0.3 :
                      Math.max(0, maxDistanceScore * 0.2 - (business.distance_miles * 2));
    } else if (userPreferences.transportationStyle === 'Public transit') {
      // Transit users prefer reasonable walking distance from stops
      distanceWeight = business.distance_miles <= 1 ? maxDistanceScore :
                      business.distance_miles <= 3 ? maxDistanceScore * 0.8 :
                      business.distance_miles <= 5 ? maxDistanceScore * 0.6 :
                      business.distance_miles <= 8 ? maxDistanceScore * 0.4 :
                      Math.max(0, maxDistanceScore * 0.3 - business.distance_miles);
    } else {
      // Car users and rideshare are more flexible with distance
      distanceWeight = business.distance_miles <= 2 ? maxDistanceScore :
                      business.distance_miles <= 5 ? maxDistanceScore * 0.8 :
                      business.distance_miles <= 10 ? maxDistanceScore * 0.6 :
                      business.distance_miles <= 15 ? maxDistanceScore * 0.4 :
                      Math.max(0, maxDistanceScore * 0.4 - business.distance_miles);
    }
    
    score += distanceWeight;
  } else if (business.distance_miles) {
    // Default distance scoring if no transportation preference
    const distanceWeight = business.distance_miles <= 1 ? maxDistanceScore : 
                          business.distance_miles <= 3 ? maxDistanceScore * 0.8 - (business.distance_miles * 3) : 
                          business.distance_miles <= 5 ? maxDistanceScore * 0.6 - (business.distance_miles * 2) : 
                          business.distance_miles <= 10 ? maxDistanceScore * 0.4 - business.distance_miles :
                          Math.max(0, maxDistanceScore * 0.3 - business.distance_miles);
    score += distanceWeight;
  }

  // Rating scoring (always 35 max points for both modes)
  if (business.rating) {
    score += (business.rating / 5) * maxRatingScore;
  }
  
  // Review count bonus (more reviews = more reliable, max 10 points)
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

// Enhanced budget matching using Yelp price data
function calculateBudgetMatch(business: Business, budgetPreference: string): number {
  if (!business.features) return 0;
  
  // Extract price level from Yelp features (e.g., "Price: $$")
  const priceFeature = business.features.find(feature => feature.startsWith('Price: '));
  if (!priceFeature) return 0;
  
  const priceLevel = priceFeature.replace('Price: ', '');
  
  // Map user budget preference to expected price levels
  const budgetToPriceMap: Record<string, string[]> = {
    'Budget-conscious': ['$'],
    'Moderate': ['$', '$$'],
    'Higher-end': ['$$', '$$$'],
    'Luxury': ['$$$', '$$$$']
  };
  
  const expectedPriceLevels = budgetToPriceMap[budgetPreference] || ['$', '$$'];
  
  if (expectedPriceLevels.includes(priceLevel)) {
    return 15; // Perfect budget match
  } else if (budgetPreference === 'Moderate' && (priceLevel === '$$$')) {
    return 8; // Acceptable stretch for moderate budget
  } else if (budgetPreference === 'Budget-conscious' && priceLevel === '$$') {
    return 5; // Slight stretch for budget-conscious
  }
  
  return 0; // No budget match
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

// COST-OPTIMIZED: Check cache with fuzzy geographic matching
async function getCachedRecommendations(
  supabase: any,
  coordinates: { lat: number; lng: number },
  categories: string[],
  preferences: any
): Promise<any[] | null> {
  const cacheKey = generateSimpleCacheKey(coordinates, categories, preferences);
  const roundedCoords = roundCoordinates(coordinates.lat, coordinates.lng);
  
  console.log(`🔍 BACKEND CACHE LOOKUP:`, {
    fullCacheKey: cacheKey,
    coordinates: { lat: coordinates.lat, lng: coordinates.lng },
    roundedCoords,
    categories,
    preferences,
    keyLength: cacheKey.length
  });
  
  try {
    // First try exact match
    const { data: exactMatch, error: exactError } = await supabase
      .from('recommendations_cache')
      .select('recommendations, cache_key, created_at')
      .eq('cache_key', cacheKey)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (exactMatch && !exactError) {
      trackAPIUsage('cache', categories.length);
      const cacheAge = Math.floor((new Date().getTime() - new Date(exactMatch.created_at).getTime()) / (1000 * 60 * 60 * 24));
      console.log(`💰 BACKEND EXACT CACHE HIT!`, {
        cacheKey: cacheKey.substring(0, 50) + '...',
        cacheAgeHours: Math.floor((new Date().getTime() - new Date(exactMatch.created_at).getTime()) / (1000 * 60 * 60)),
        resultCount: Array.isArray(exactMatch.recommendations) ? Object.keys(exactMatch.recommendations).length : 'not-object'
      });
      return exactMatch.recommendations;
    }

    // If no exact match, try fuzzy geographic matching within region
    const roundedCoords = roundCoordinates(coordinates.lat, coordinates.lng);
    const sortedCategories = [...categories].sort().join(',');
    
    const { data: fuzzyMatches, error: fuzzyError } = await supabase
      .from('recommendations_cache')
      .select('recommendations, cache_key, created_at')
      .contains('categories', categories)
      .gt('expires_at', new Date().toISOString())
      .limit(5);

    if (fuzzyMatches && fuzzyMatches.length > 0 && !fuzzyError) {
      // Find closest match with similar preferences
      for (const match of fuzzyMatches) {
        const matchKey = match.cache_key;
        if (matchKey.includes(roundedCoords.lat.toString()) && 
            matchKey.includes(roundedCoords.lng.toString()) &&
            matchKey.includes(sortedCategories)) {
          trackAPIUsage('cache', categories.length);
          const cacheAge = Math.floor((new Date().getTime() - new Date(match.created_at).getTime()) / (1000 * 60 * 60 * 24));
          console.log(`💰 FUZZY CACHE HIT! Found ${cacheAge}d old nearby recommendations`);
          return match.recommendations;
        }
      }
    }

    // Log all available cache keys for debugging
    const { data: allCacheKeys } = await supabase
      .from('recommendations_cache')
      .select('cache_key, created_at')
      .gt('expires_at', new Date().toISOString())
      .limit(10);

    console.log(`❌ BACKEND CACHE MISS:`, {
      searchedKey: cacheKey.substring(0, 50) + '...',
      availableCacheKeys: allCacheKeys?.map(k => ({
        key: k.cache_key.substring(0, 50) + '...',
        created: k.created_at
      })) || [],
      totalAvailableKeys: allCacheKeys?.length || 0
    });
    return null;
  } catch (error) {
    console.error('❌ CACHE ERROR:', error);
    return null;
  }
}

// COST-OPTIMIZED: Save recommendations with simplified cache key
async function cacheRecommendations(
  supabase: any,
  coordinates: { lat: number; lng: number },
  categories: string[],
  preferences: any,
  recommendations: any[]
): Promise<void> {
  const cacheKey = generateSimpleCacheKey(coordinates, categories, preferences);
  const roundedCoords = roundCoordinates(coordinates.lat, coordinates.lng);
  
  console.log(`💾 BACKEND SAVING TO CACHE:`, {
    fullCacheKey: cacheKey,
    coordinates: { lat: coordinates.lat, lng: coordinates.lng },
    roundedCoords,
    categories,
    preferences,
    resultCount: Array.isArray(recommendations) ? Object.keys(recommendations).length : 'not-object',
    keyLength: cacheKey.length,
    expiresAt: new Date(Date.now() + CACHE_DURATION_DAYS * 24 * 60 * 60 * 1000).toISOString()
  });
  
  try {
    const { error } = await supabase
      .from('recommendations_cache')
      .upsert({
        cache_key: cacheKey,
        user_coordinates: `POINT(${roundedCoords.lng} ${roundedCoords.lat})`,
        recommendations: recommendations,
        categories: categories,
        preferences: preferences,
        expires_at: new Date(Date.now() + CACHE_DURATION_DAYS * 24 * 60 * 60 * 1000).toISOString()
      });

    if (error) {
      console.error('❌ BACKEND CACHE SAVE FAILED:', error);
    } else {
      console.log(`✅ BACKEND CACHED SUCCESSFULLY:`, {
        cacheKey: cacheKey.substring(0, 50) + '...',
        willExpireAt: new Date(Date.now() + CACHE_DURATION_DAYS * 24 * 60 * 60 * 1000).toISOString()
      });
    }
  } catch (error) {
    console.error('❌ BACKEND CACHE SAVE ERROR:', error);
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Initialize Supabase client at the very beginning
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

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
    
    // Parse and validate request body with robust error handling
    let requestBody;
    try {
      const rawBody = await req.text();
      console.log('🔍 RAW REQUEST BODY:', rawBody.substring(0, 200) + (rawBody.length > 200 ? '...' : ''));
      
      if (!rawBody || rawBody.trim() === '') {
        return new Response(JSON.stringify({ error: 'Request body is empty' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      requestBody = JSON.parse(rawBody);
    } catch (parseError) {
      console.error('❌ JSON PARSE ERROR:', parseError);
      return new Response(JSON.stringify({ 
        error: 'Invalid JSON in request body',
        details: parseError.message 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    console.log('✅ Generating recommendations for:', JSON.stringify(requestBody, null, 2));
    
    // Validate required fields
    const { quizResponse, dynamicFilter, exploreMode, popularMode, personalCareMode, foodSceneMode, timeOfDay, latitude, longitude, categories, userId } = requestBody;
    
    // Basic validation for coordinate-based requests
    if ((exploreMode || popularMode || personalCareMode || foodSceneMode || categories) && 
        (typeof latitude !== 'number' || typeof longitude !== 'number')) {
      return new Response(JSON.stringify({ 
        error: 'Invalid coordinates: latitude and longitude must be numbers',
        received: { latitude: typeof latitude, longitude: typeof longitude }
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Handle explore mode requests with caching (distance-based sorting)
    if (exploreMode) {
      if (!latitude || !longitude || !categories) {
        return new Response(JSON.stringify({ error: 'Explore mode requires latitude, longitude, and categories' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const coordinates = { lat: latitude, lng: longitude };
      
      // Check for manual curation first
      console.log('🔍 Checking for manual curation...');
      try {
        const { data: manualCurationData, error: curationError } = await supabase.functions.invoke('check-manual-curation', {
          body: {
            userLocation: `${latitude},${longitude}`,
            categories
          }
        });

        if (!curationError && manualCurationData?.manual_curation_found) {
          console.log('💰 MANUAL CURATION FOUND! Using curated recommendations.');
          
          // Store manual curation in cache for future use
          const manualCacheKey = `manual_${latitude.toFixed(3)}_${longitude.toFixed(3)}_${categories.sort().join('_')}`;
          
          await supabase
            .from('recommendations_cache')
            .upsert({
              cache_key: manualCacheKey,
              user_coordinates: `(${longitude}, ${latitude})`,
              categories,
              recommendations: manualCurationData.recommendations,
              preferences: { source: 'manual_curation' },
              expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() // 1 year
            });

          return new Response(
            JSON.stringify({
              recommendations: manualCurationData.recommendations,
              fromCache: false,
              source: 'manual_curation',
              property_distance: manualCurationData.property_distance_miles
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log('📡 No manual curation found, proceeding with API recommendations...');
      } catch (curationCheckError) {
        console.error('❌ Manual curation check failed:', curationCheckError);
        console.log('📡 Proceeding with API recommendations...');
      }
      
      // Create cache key for explore requests based on rounded location and categories
      const roundedCoords = roundCoordinates(coordinates.lat, coordinates.lng);
      const cacheKey = `explore_${roundedCoords.lat.toFixed(3)}_${roundedCoords.lng.toFixed(3)}_${categories.sort().join('_')}`;
      
      console.log(`🔍 EXPLORE CACHE LOOKUP: ${cacheKey}`);
      
      // Check for cached explore results (180 day cache for essentials - 6 months)
      let cachedData = null;
      try {
        const { data, error } = await supabase
          .from('recommendations_cache')
          .select('recommendations, created_at')
          .eq('cache_key', cacheKey)
          .gt('expires_at', new Date().toISOString())
          .maybeSingle();
          
        if (error) {
          console.error('🚨 CACHE QUERY ERROR:', error);
        } else {
          cachedData = data;
        }
      } catch (cacheError) {
        console.error('🚨 CACHE LOOKUP FAILED:', cacheError);
        // Continue without cache - don't fail the entire request
      }

      if (cachedData) {
        console.log('💰 EXPLORE CACHE HIT! Returning cached recommendations - NO API COSTS!');
        trackAPIUsage('cache', categories.length);
        return new Response(
          JSON.stringify({ 
            recommendations: cachedData.recommendations,
            fromCache: true 
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      const recommendations: { [key: string]: Business[] } = {};
      const globalSeenBusinesses = new Set(); // Global deduplication across all categories
      
      for (const category of categories) {
        console.log(`Exploring category: "${category}"`);
        const businesses = await searchBusinesses(category, coordinates, undefined, true);
        
        // Filter out businesses we've already seen globally
        const uniqueBusinesses = businesses.filter(business => {
          const businessKey = `${business.name.toLowerCase().trim()}|${business.address?.toLowerCase().trim() || ''}`;
          if (globalSeenBusinesses.has(businessKey)) {
            console.log(`→ Skipping duplicate business across categories: ${business.name}`);
            return false;
          }
          globalSeenBusinesses.add(businessKey);
          return true;
        });
        
        recommendations[category] = uniqueBusinesses;
        console.log(`Found ${businesses.length} businesses for "${category}", ${uniqueBusinesses.length} unique after deduplication`);
      }

      // Cache explore results for 180 days (6 months for essentials)
      await supabase
        .from('recommendations_cache')
        .insert({
          cache_key: cacheKey,
          user_coordinates: `(${latitude}, ${longitude})`, // Required field
          categories: categories, // Required field
          recommendations: recommendations,
          expires_at: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString() // 180 days for explore mode
        });
      
      return new Response(JSON.stringify({ recommendations }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Handle personal care mode requests with distance-only scoring
    if (personalCareMode) {
      if (!latitude || !longitude || !categories) {
        return new Response(JSON.stringify({ error: 'Personal care mode requires latitude, longitude, and categories' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const coordinates = { lat: latitude, lng: longitude };
      
      // Create cache key for personal care requests based on location and categories
      const cacheKey = `personalcare_${coordinates.lat.toFixed(3)}_${coordinates.lng.toFixed(3)}_${categories.sort().join('_')}`;
      
      // Check for cached personal care results (7 day cache)
      const { data: cachedData } = await supabase
        .from('recommendations_cache')
        .select('recommendations, created_at')
        .eq('cache_key', cacheKey)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (cachedData) {
        console.log('✅ Returning cached personal care recommendations (7-day cache)');
        trackAPIUsage('cache', categories.length);
        return new Response(
          JSON.stringify({ 
            recommendations: cachedData.recommendations,
            fromCache: true 
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      const recommendations: { [key: string]: Business[] } = {};
      const globalSeenBusinesses = new Set();
      
      for (const category of categories) {
        console.log(`Finding distance-based businesses for personal care category: "${category}"`);
        const businesses = await searchBusinesses(category, coordinates, undefined, true); // true = distance-based sorting
        
        // Filter out businesses we've already seen globally
        const uniqueBusinesses = businesses.filter(business => {
          const businessKey = `${business.name.toLowerCase().trim()}|${business.address?.toLowerCase().trim() || ''}`;
          if (globalSeenBusinesses.has(businessKey)) {
            console.log(`→ Skipping duplicate business across categories: ${business.name}`);
            return false;
          }
          globalSeenBusinesses.add(businessKey);
          return true;
        });
        
        recommendations[category] = uniqueBusinesses.slice(0, 4); // Limit to 4 per category
        console.log(`Found ${businesses.length} businesses for "${category}", ${uniqueBusinesses.length} unique after deduplication, showing top 4`);
      }

      // Cache personal care results for 7 days
      await supabase
        .from('recommendations_cache')
        .insert({
          cache_key: cacheKey,
          user_coordinates: `(${coordinates.lat}, ${coordinates.lng})`,
          categories: categories,
          recommendations: recommendations,
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
        });
      
      return new Response(JSON.stringify({ recommendations }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Handle popular mode requests with caching (rating-based sorting)
    if (popularMode) {
      if (!latitude || !longitude || !categories) {
        return new Response(JSON.stringify({ error: 'Popular mode requires latitude, longitude, and categories' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const coordinates = { lat: latitude, lng: longitude };
      
      // Create cache key for popular requests based on location and categories
      const cacheKey = `popular_${coordinates.lat.toFixed(3)}_${coordinates.lng.toFixed(3)}_${categories.sort().join('_')}`;
      
      // Check for cached popular results (7 day cache for seasonal relevance)
      const { data: cachedData } = await supabase
        .from('recommendations_cache')
        .select('recommendations, created_at')
        .eq('cache_key', cacheKey)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (cachedData) {
        console.log('✅ Returning cached popular recommendations (7-day seasonal cache)');
        trackAPIUsage('cache', categories.length);
        return new Response(
          JSON.stringify({ 
            recommendations: cachedData.recommendations,
            fromCache: true 
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      const recommendations: { [key: string]: Business[] } = {};
      const globalSeenBusinesses = new Set(); // Global deduplication across all categories
      
      for (const category of categories) {
        console.log(`Finding popular businesses for category: "${category}"`);
        const businesses = await searchBusinesses(category, coordinates, undefined, false); // false = rating-based sorting
        
        // Filter out businesses we've already seen globally
        const uniqueBusinesses = businesses.filter(business => {
          const businessKey = `${business.name.toLowerCase().trim()}|${business.address?.toLowerCase().trim() || ''}`;
          if (globalSeenBusinesses.has(businessKey)) {
            console.log(`→ Skipping duplicate business across categories: ${business.name}`);
            return false;
          }
          globalSeenBusinesses.add(businessKey);
          return true;
        });
        
        recommendations[category] = uniqueBusinesses;
        console.log(`Found ${businesses.length} businesses for "${category}", ${uniqueBusinesses.length} unique after deduplication`);
      }

      // Cache popular results for 30 days (balanced cost efficiency and relevance for trending places)
      await supabase
        .from('recommendations_cache')
        .insert({
          cache_key: cacheKey,
          user_coordinates: `(${coordinates.lat}, ${coordinates.lng})`, // Required field
          categories: categories, // Required field
          recommendations: recommendations,
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days for cost efficiency
        });
      
      return new Response(JSON.stringify({ recommendations }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Handle food scene mode requests with caching
    if (foodSceneMode) {
      if (!latitude || !longitude || !timeOfDay) {
        return new Response(JSON.stringify({ error: 'Food Scene mode requires latitude, longitude, and timeOfDay' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const coordinates = { lat: latitude, lng: longitude };
      
      // Create cache key for food scene requests
      const cacheKey = `foodscene_${coordinates.lat.toFixed(3)}_${coordinates.lng.toFixed(3)}_${timeOfDay}`;
      
      // Check for cached food scene results (30 day cache)
      const { data: cachedData } = await supabase
        .from('recommendations_cache')
        .select('recommendations, created_at')
        .eq('cache_key', cacheKey)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (cachedData) {
        console.log('✅ Returning cached food scene recommendations (30-day cache)');
        trackAPIUsage('cache', 1);
        return new Response(
          JSON.stringify({ 
            recommendations: cachedData.recommendations,
            fromCache: true 
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      console.log(`Finding food scene businesses for time: "${timeOfDay}"`);
      
      // Get search terms for the time of day
      const searchTerms = getFoodSceneSearchTerms(timeOfDay);
      const allBusinesses: Business[] = [];
      
      // Search for each term and collect results
      for (const term of searchTerms) {
        const businesses = await searchBusinesses(term, coordinates, undefined, false); // false = rating-based sorting
        allBusinesses.push(...businesses);
      }
      
      // Apply cuisine diversity (max 2 per cuisine type)
      const diverseBusinesses = applyCuisineDiversity(allBusinesses);
      
      // Limit to top 12 businesses for food scene
      const finalBusinesses = diverseBusinesses.slice(0, 12);
      
      console.log(`Found ${allBusinesses.length} total food businesses, ${diverseBusinesses.length} after diversity filter, showing top ${finalBusinesses.length}`);

      // Cache food scene results for 30 days
      await supabase
        .from('recommendations_cache')
        .insert({
          cache_key: cacheKey,
          user_coordinates: `(${coordinates.lat}, ${coordinates.lng})`,
          categories: [timeOfDay],
          recommendations: { [timeOfDay]: finalBusinesses },
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
        });
      
      return new Response(JSON.stringify({ recommendations: { [timeOfDay]: finalBusinesses } }), {
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

    // Supabase client already initialized at the beginning of the function

    // Get coordinates - try cached first, then convert address
    let coordinates: { lat: number; lng: number } | null = null;
    
    // Check if we have cached coordinates from profile
    if (userId) {
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

    // COST OPTIMIZATION: Check cache before expensive API calls
    const cachePreferences = {
      householdType: quizResponse.householdType,
      priorities: quizResponse.priorities,
      priorityPreferences: quizResponse.priorityPreferences,
      transportationStyle: quizResponse.transportationStyle,
      budgetPreference: quizResponse.budgetPreference,
      lifeStage: quizResponse.lifeStage
    };
    
    const cachedRecommendations = await getCachedRecommendations(
      supabase, 
      coordinates, 
      quizResponse.priorities || [], 
      cachePreferences
    );
    
    if (cachedRecommendations) {
      console.log('💰 RETURNING CACHED RECOMMENDATIONS - NO API COSTS!');
      return new Response(JSON.stringify({
        success: true,
        fromCache: true,
        recommendations: cachedRecommendations
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Generate recommendations based on user priorities (only if not cached)
    console.log('💸 Generating NEW recommendations - API costs will be incurred');
    
    // Add userId to quizResponse for AI personalization
    const enhancedQuizResponse = { ...quizResponse, userId };
    const recommendations = await generateRecommendations(enhancedQuizResponse, coordinates);

    console.log('Generated recommendations categories:', Object.keys(recommendations));

    // COST OPTIMIZATION: Cache the generated recommendations to avoid future API costs
    if (coordinates && recommendations && Object.keys(recommendations).length > 0) {
      await cacheRecommendations(
        supabase,
        coordinates,
        quizResponse.priorities || [],
        cachePreferences,
        recommendations
      );
    }

    // Save recommendations to database if userId is provided
    if (userId && Object.keys(recommendations).length > 0) {
      console.log(`Saving recommendations to database for user: ${userId}`);
      try {
        await saveRecommendationsToDatabase(userId, recommendations, quizResponse, false);
        console.log('Successfully saved recommendations to database');
      } catch (saveError) {
        console.error('Failed to save recommendations to database:', saveError);
        // Don't fail the entire request if save fails - user still gets recommendations
      }
    } else if (!userId) {
      console.warn('No userId provided - recommendations will not be saved to database');
    }

    return new Response(
      JSON.stringify({ 
        recommendations,
        fromCache: false,
        costOptimized: true,
        apiStats: {
          yelpCalls: apiUsageStats.yelpCalls,
          googleCalls: apiUsageStats.googleCalls,
          cacheHits: apiUsageStats.cacheHits,
          estimatedCost: apiUsageStats.estimatedCost,
          costSavings: apiUsageStats.costSavings
        }
      }),
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

// AI ENHANCEMENT: Determine recommendation engine type (A/B testing)
function determineRecommendationEngine(userId: string): 'ai' | 'standard' {
  // Use hash of user ID to consistently assign users to test groups
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    const char = userId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  // Use absolute value and modulo to get consistent assignment
  const normalizedHash = Math.abs(hash) / Math.pow(2, 31);
  return normalizedHash < AI_RECOMMENDATION_PERCENTAGE ? 'ai' : 'standard';
}

// AI ENHANCEMENT: Calculate collaborative filtering score
async function calculateCollaborativeScore(
  supabase: any,
  userId: string,
  business: Business,
  category: string
): Promise<number> {
  try {
    // Get users who favorited similar businesses in this category
    const { data: similarUsers } = await supabase
      .from('user_recommendations')
      .select('user_id')
      .eq('category', category)
      .eq('is_favorite', true)
      .neq('user_id', userId)
      .limit(100);

    if (!similarUsers || similarUsers.length === 0) return 0;

    // Get current user's favorites to find overlap
    const { data: userFavorites } = await supabase
      .from('user_recommendations')
      .select('business_name')
      .eq('user_id', userId)
      .eq('is_favorite', true);

    if (!userFavorites || userFavorites.length === 0) return 0;

    const userFavoriteNames = new Set(userFavorites.map(f => f.business_name.toLowerCase()));
    let collaborativeScore = 0;
    let matchCount = 0;

    // Check each similar user for overlapping favorites
    for (const user of similarUsers.slice(0, 20)) { // Limit for performance
      const { data: otherUserFavorites } = await supabase
        .from('user_recommendations')
        .select('business_name')
        .eq('user_id', user.user_id)
        .eq('is_favorite', true)
        .limit(10);

      if (otherUserFavorites) {
        const overlap = otherUserFavorites.filter(fav => 
          userFavoriteNames.has(fav.business_name.toLowerCase())
        ).length;
        
        if (overlap > 0) {
          matchCount++;
          collaborativeScore += overlap / Math.max(userFavorites.length, otherUserFavorites.length);
        }
      }
    }

    return matchCount > 0 ? (collaborativeScore / matchCount) * 0.3 : 0; // Max 0.3 boost
  } catch (error) {
    console.error('Error calculating collaborative score:', error);
    return 0;
  }
}

// AI ENHANCEMENT: Calculate temporal intelligence score
async function calculateTemporalScore(
  supabase: any,
  userId: string,
  business: Business,
  category: string
): Promise<number> {
  try {
    // Get user's account age
    const { data: profile } = await supabase
      .from('profiles')
      .select('created_at')
      .eq('user_id', userId)
      .single();

    if (!profile) return 0;

    const accountAge = (Date.now() - new Date(profile.created_at).getTime()) / (1000 * 60 * 60 * 24);
    
    // Boost newer, highly-rated businesses for new users (< 30 days)
    if (accountAge < 30 && business.rating && business.rating >= 4.5) {
      return 0.2; // 0.2 boost for new users seeing high-quality businesses
    }
    
    // Boost businesses with recent high activity for established users
    if (accountAge >= 30) {
      const { data: recentActivity } = await supabase
        .from('user_recommendations')
        .select('id')
        .eq('business_name', business.name)
        .eq('category', category)
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .limit(5);

      if (recentActivity && recentActivity.length >= 3) {
        return 0.15; // 0.15 boost for trending businesses
      }
    }

    return 0;
  } catch (error) {
    console.error('Error calculating temporal score:', error);
    return 0;
  }
}

// AI ENHANCEMENT: Calculate cross-category intelligence score
async function calculateCrossCategoryScore(
  supabase: any,
  userId: string,
  business: Business,
  currentCategory: string
): Promise<number> {
  try {
    // Get user's preferences across all categories
    const { data: userPrefs } = await supabase
      .from('user_recommendations')
      .select('category, business_features, is_favorite')
      .eq('user_id', userId)
      .eq('is_favorite', true);

    if (!userPrefs || userPrefs.length === 0) return 0;

    // Find patterns in user's cross-category preferences
    const preferredFeatures = new Set();
    const categoryCount = new Map();

    userPrefs.forEach(pref => {
      categoryCount.set(pref.category, (categoryCount.get(pref.category) || 0) + 1);
      if (pref.business_features) {
        pref.business_features.forEach((feature: string) => preferredFeatures.add(feature.toLowerCase()));
      }
    });

    // Calculate score based on business features matching user's cross-category patterns
    if (business.features) {
      const matchingFeatures = business.features.filter(feature => 
        preferredFeatures.has(feature.toLowerCase())
      ).length;
      
      if (matchingFeatures > 0) {
        return Math.min(matchingFeatures * 0.05, 0.25); // Max 0.25 boost
      }
    }

    return 0;
  } catch (error) {
    console.error('Error calculating cross-category score:', error);
    return 0;
  }
}

// AI Recommendation System Functions

// Calculate detailed AI scores for a business based on user preferences
function calculateDetailedAIScores(business: Business, category: string, userPreferences?: QuizResponse) {
  if (!userPreferences) {
    return {
      budget_match: 0,
      location_preference: 0,
      feature_alignment: 0,
      household_fit: 0,
      lifestyle_match: 0,
      priority_alignment: 0,
      transportation_compatibility: 0,
      overall_relevance: 0
    };
  }

  const scores = {
    budget_match: calculateBudgetMatchScore(business, userPreferences.budgetPreference),
    location_preference: calculateLocationPreferenceScore(business, userPreferences),
    feature_alignment: calculateFeatureAlignmentScore(business, category, userPreferences),
    household_fit: calculateHouseholdFitScore(business, userPreferences.householdType),
    lifestyle_match: calculateLifestyleMatchScore(business, userPreferences.lifeStage),
    priority_alignment: calculatePriorityAlignmentScore(business, category, userPreferences.priorities),
    transportation_compatibility: calculateTransportationScore(business, userPreferences.transportationStyle),
    overall_relevance: 0
  };

  // Calculate overall relevance as weighted average
  scores.overall_relevance = (
    scores.budget_match * 0.2 +
    scores.location_preference * 0.15 +
    scores.feature_alignment * 0.2 +
    scores.household_fit * 0.1 +
    scores.lifestyle_match * 0.1 +
    scores.priority_alignment * 0.15 +
    scores.transportation_compatibility * 0.1
  );

  return scores;
}

// Budget matching logic
function calculateBudgetMatchScore(business: Business, budgetPreference: string): number {
  const businessName = business.name.toLowerCase();
  const features = business.features?.join(' ').toLowerCase() || '';
  
  switch (budgetPreference) {
    case 'budget-conscious':
      // Prefer discount stores, budget brands, value options
      if (businessName.includes('discount') || businessName.includes('dollar') || 
          businessName.includes('budget') || businessName.includes('value') ||
          businessName.includes('walmart') || businessName.includes('aldi')) {
        return 0.9;
      }
      if (features.includes('affordable') || features.includes('discount')) {
        return 0.7;
      }
      return 0.5;
      
    case 'mid-range':
      // Prefer mainstream brands, avoid extreme budget or luxury
      if (businessName.includes('premium') || businessName.includes('luxury') ||
          businessName.includes('discount') || businessName.includes('dollar')) {
        return 0.4;
      }
      return 0.8;
      
    case 'premium':
      // Prefer upscale, premium, organic, specialty options
      if (businessName.includes('premium') || businessName.includes('luxury') ||
          businessName.includes('organic') || businessName.includes('gourmet') ||
          features.includes('premium') || features.includes('organic')) {
        return 0.9;
      }
      return 0.6;
      
    default:
      return 0.5;
  }
}

// Location preference scoring based on distance
function calculateLocationPreferenceScore(business: Business, userPreferences: QuizResponse): number {
  if (!business.distance_miles) return 0.5;
  
  // Score based on distance - closer is better
  if (business.distance_miles <= 1) return 1.0;
  if (business.distance_miles <= 3) return 0.8;
  if (business.distance_miles <= 5) return 0.6;
  if (business.distance_miles <= 10) return 0.4;
  return 0.2;
}

// Feature alignment with user priorities
function calculateFeatureAlignmentScore(business: Business, category: string, userPreferences: QuizResponse): number {
  const features = business.features?.join(' ').toLowerCase() || '';
  const priorities = userPreferences.priorities.map(p => p.toLowerCase());
  
  let score = 0.5; // Base score
  
  // Check for specific feature matches based on priorities
  if (priorities.includes('fitness') || priorities.includes('health')) {
    if (features.includes('fitness') || features.includes('gym') || features.includes('health')) {
      score += 0.3;
    }
  }
  
  if (priorities.includes('family') || userPreferences.householdType === 'family-with-children') {
    if (features.includes('family') || features.includes('kid') || features.includes('child')) {
      score += 0.3;
    }
  }
  
  if (priorities.includes('organic') || priorities.includes('healthy')) {
    if (features.includes('organic') || features.includes('natural') || features.includes('healthy')) {
      score += 0.3;
    }
  }
  
  return Math.min(score, 1.0);
}

// Household type matching
function calculateHouseholdFitScore(business: Business, householdType: string): number {
  const businessName = business.name.toLowerCase();
  const features = business.features?.join(' ').toLowerCase() || '';
  
  switch (householdType) {
    case 'single':
      // Prefer convenient, single-serving options
      if (features.includes('convenient') || features.includes('quick') ||
          businessName.includes('express') || businessName.includes('quick')) {
        return 0.8;
      }
      return 0.6;
      
    case 'couple':
      // Neutral preference
      return 0.7;
      
    case 'family-with-children':
      // Prefer family-friendly options
      if (features.includes('family') || features.includes('kid') ||
          features.includes('child') || features.includes('playground')) {
        return 0.9;
      }
      return 0.6;
      
    case 'roommates':
      // Prefer cost-effective, bulk options
      if (features.includes('bulk') || features.includes('wholesale') ||
          businessName.includes('costco') || businessName.includes('sam')) {
        return 0.8;
      }
      return 0.6;
      
    default:
      return 0.5;
  }
}

// Life stage matching
function calculateLifestyleMatchScore(business: Business, lifeStage: string): number {
  const businessName = business.name.toLowerCase();
  const features = business.features?.join(' ').toLowerCase() || '';
  
  switch (lifeStage) {
    case 'young-professional':
      // Prefer convenient, trendy, networking options
      if (features.includes('convenient') || features.includes('trendy') ||
          features.includes('networking') || businessName.includes('co-working')) {
        return 0.8;
      }
      return 0.6;
      
    case 'growing-family':
      // Prefer family-oriented, practical options
      if (features.includes('family') || features.includes('practical') ||
          features.includes('kid') || features.includes('child')) {
        return 0.9;
      }
      return 0.6;
      
    case 'empty-nester':
      // Prefer quality, leisure, community options
      if (features.includes('quality') || features.includes('leisure') ||
          features.includes('community') || features.includes('senior')) {
        return 0.8;
      }
      return 0.6;
      
    case 'retiree':
      // Prefer accessible, community, value options
      if (features.includes('accessible') || features.includes('community') ||
          features.includes('senior') || features.includes('discount')) {
        return 0.8;
      }
      return 0.6;
      
    default:
      return 0.5;
  }
}

// Priority alignment scoring
function calculatePriorityAlignmentScore(business: Business, category: string, priorities: string[]): number {
  const categoryLower = category.toLowerCase();
  const prioritiesLower = priorities.map(p => p.toLowerCase());
  
  // Direct category-priority matches
  for (const priority of prioritiesLower) {
    if (categoryLower.includes(priority) || priority.includes(categoryLower.split(' ')[0])) {
      return 0.9;
    }
  }
  
  return 0.5;
}

// Transportation compatibility
function calculateTransportationScore(business: Business, transportationStyle: string): number {
  const features = business.features?.join(' ').toLowerCase() || '';
  
  switch (transportationStyle) {
    case 'walking':
      // Prefer very close businesses
      if (business.distance_miles && business.distance_miles <= 1) {
        return 0.9;
      }
      return business.distance_miles && business.distance_miles <= 3 ? 0.6 : 0.3;
      
    case 'biking':
      // Prefer businesses within biking distance
      if (business.distance_miles && business.distance_miles <= 5) {
        return 0.8;
      }
      return 0.4;
      
    case 'public-transit':
      // Prefer businesses near transit, or within reasonable distance
      if (features.includes('transit') || features.includes('bus') || features.includes('train')) {
        return 0.9;
      }
      return business.distance_miles && business.distance_miles <= 10 ? 0.7 : 0.4;
      
    case 'driving':
      // Distance less important, parking more important
      if (features.includes('parking') || features.includes('drive')) {
        return 0.8;
      }
      return 0.7;
      
    default:
      return 0.5;
  }
}

// Enhanced function to save recommendations with relevance scores
async function saveRecommendationsToDatabase(userId: string, recommendations: { [key: string]: Business[] }, userPreferences?: QuizResponse, isPopularMode: boolean = false) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  try {
    // Only delete existing recommendations for the categories being regenerated
    const categoriesToUpdate = Object.keys(recommendations);
    console.log(`Deleting existing recommendations for categories: ${categoriesToUpdate.join(', ')}`);
    
    const { error: deleteError } = await supabase
      .from('user_recommendations')
      .delete()
      .eq('user_id', userId)
      .in('category', categoriesToUpdate);
    
    if (deleteError) {
      console.error('Error deleting existing recommendations for categories:', deleteError);
      // Don't throw - continue with insertion
    } else {
      console.log(`✅ Successfully removed old recommendations for categories: ${categoriesToUpdate.join(', ')}`);
    }
    
    const recommendationsToInsert = [];
    const seenBusinesses = new Set(); // Track unique businesses globally across all categories
    
    // Determine recommendation engine type for this user
    const recommendationEngine = determineRecommendationEngine(userId);
    console.log(`Using ${recommendationEngine} recommendation engine for user ${userId}`);
    
    // Convert recommendations to database format with AI-enhanced relevance scores
    for (const [category, businesses] of Object.entries(recommendations)) {
      for (let index = 0; index < businesses.length; index++) {
        const business = businesses[index];
        
        // Create a unique key for this business GLOBALLY (not per category)
        // Use name + address to identify truly unique businesses
        const businessKey = `${business.name.toLowerCase().trim()}|${business.address?.toLowerCase().trim() || ''}`;
        
        // Skip if we've already seen this exact business anywhere
        if (seenBusinesses.has(businessKey)) {
          console.log(`→ Skipping duplicate business: ${business.name} (already exists in another category)`);
          continue;
        }
        seenBusinesses.add(businessKey);
        
        // Calculate base relevance score
        const scoringMode = isPopularMode ? 'rating-heavy' : 'distance-heavy';
        let relevanceScore = calculateRelevanceScore(business, category, userPreferences, scoringMode);
        
        // Calculate AI scores if using AI engine
        let collaborativeScore = 0;
        let temporalScore = 0;
        let crossCategoryScore = 0;
        
        if (recommendationEngine === 'ai') {
          collaborativeScore = await calculateCollaborativeScore(supabase, userId, business, category);
          temporalScore = await calculateTemporalScore(supabase, userId, business, category);
          crossCategoryScore = await calculateCrossCategoryScore(supabase, userId, business, category);
          
          // Apply AI boosts to relevance score
          relevanceScore += collaborativeScore + temporalScore + crossCategoryScore;
          relevanceScore = Math.min(relevanceScore, 10.0); // Cap at 10.0
          
          console.log(`AI scores for ${business.name}: collaborative=${collaborativeScore.toFixed(3)}, temporal=${temporalScore.toFixed(3)}, crossCategory=${crossCategoryScore.toFixed(3)}`);
        }
        
        const filterMetadata = generateFilterMetadata(business, category);
        
        // Calculate detailed AI scores for this business
        const aiScores = calculateDetailedAIScores(business, category, userPreferences);
        
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
          place_id: business.place_id,
          is_favorite: false,
          relevance_score: relevanceScore,
          is_displayed: index < 6, // Only first 6 are displayed by default
          filter_metadata: filterMetadata,
          recommendation_engine: recommendationEngine,
          ai_scores: {
            budget_match: aiScores.budget_match,
            location_preference: aiScores.location_preference,
            feature_alignment: aiScores.feature_alignment,
            household_fit: aiScores.household_fit,
            lifestyle_match: aiScores.lifestyle_match,
            priority_alignment: aiScores.priority_alignment,
            transportation_compatibility: aiScores.transportation_compatibility,
            overall_relevance: aiScores.overall_relevance,
            collaborative: collaborativeScore,
            temporal: temporalScore,
            crossCategory: crossCategoryScore,
            finalScore: relevanceScore
          },
          interaction_count: 0
        });
      }
    }
    
    if (recommendationsToInsert.length > 0) {
      console.log(`Inserting ${recommendationsToInsert.length} recommendations for user ${userId}`);
      
      // Use simple insert since we cleared existing data
      const { data, error } = await supabase
        .from('user_recommendations')
        .insert(recommendationsToInsert);
      
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
    "dmv / government services": "DMV / Government services",
    "dmv": "DMV / Government services",
    "government services": "government offices",
    "government": "government offices",
    "city hall": "government offices",
    "town hall": "government offices",
    "motor vehicle": "government offices",
    "registry": "government offices",
    "municipal": "government offices",
    "banking / financial services": "banks financial",
    "banking": "banks financial",
    "financial services": "banks financial",
    "financial": "banks financial",
    "banks": "banks financial",
    "bank": "banks financial",
    "credit union": "banks financial",
    "atm": "banks financial"
  };

  // Sub-preference search terms mapping
  const getSubPreferenceSearchTerms = (category: string, subPreference: string): string[] => {
    const subPrefMap: Record<string, Record<string, string[]>> = {
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
    
    return subPrefMap[category]?.[subPreference] || [subPreference];
  };

  console.log('User priorities received:', quizResponse.priorities);
  console.log('User priority preferences received:', quizResponse.priorityPreferences);

  // For each user priority, search for real businesses using APIs
  for (const priority of quizResponse.priorities) {
    const priorityLower = priority.toLowerCase();
    console.log(`Processing priority: "${priority}"`);
    
    // Check if user has specific sub-preferences for this priority
    const subPreferences = quizResponse.priorityPreferences?.[priority] || [];
    
    if (subPreferences.length > 0) {
      console.log(`Found sub-preferences for "${priority}": ${subPreferences.join(', ')}`);
      
      // Generate specific searches for each sub-preference
      for (const subPref of subPreferences) {
        const subCategoryName = `${priority} - ${subPref.charAt(0).toUpperCase() + subPref.slice(1)}`;
        console.log(`Processing sub-preference: "${subCategoryName}"`);
        
        // Get specific search terms for this sub-preference
        const specificSearchTerms = getSubPreferenceSearchTerms(priority, subPref);
        
        for (const searchTerm of specificSearchTerms) {
          const businesses = await searchBusinesses(searchTerm, coordinates, quizResponse, exploreMode);
          console.log(`Found ${businesses.length} businesses for sub-preference "${subPref}" with search term "${searchTerm}"`);
          
          if (businesses.length > 0) {
            if (!recommendations[subCategoryName]) {
              recommendations[subCategoryName] = [];
            }
            recommendations[subCategoryName].push(...businesses);
          }
        }
        
        // Remove duplicates within the sub-category
        if (recommendations[subCategoryName]) {
          const uniqueBusinesses = recommendations[subCategoryName].filter((business, index, arr) => 
            index === arr.findIndex(b => b.name === business.name && b.address === business.address)
          );
          recommendations[subCategoryName] = uniqueBusinesses.slice(0, 10); // Limit to 10 results
        }
      }
    } else {
      // No sub-preferences, do general search for the priority
      // Check for direct matches or partial matches
      let foundMatch = false;
      for (const [key, searchTerm] of Object.entries(priorityMap)) {
        if (priorityLower.includes(key) || key.includes(priorityLower)) {
          console.log(`Found match for "${priority}" with search term "${searchTerm}"`);
          foundMatch = true;
          
          const businesses = await searchBusinesses(searchTerm, coordinates, quizResponse, exploreMode);
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
      const businesses = await searchBusinesses(category.searchTerm, coordinates, quizResponse, exploreMode);
      if (businesses.length > 0) {
        recommendations[category.name] = businesses;
      }
    }
  } else if (quizResponse.existingPriorities && quizResponse.existingPriorities.length > 0) {
    console.log(`User has existing priorities: ${quizResponse.existingPriorities.join(', ')}, not adding defaults`);
  }

  // Apply AI-powered ranking if this is an AI user
  const userId = quizResponse.userId;
  if (!userId) {
    console.log('No userId provided, using standard recommendations');
    return recommendations;
  }
  
  const recommendationEngine = determineRecommendationEngine(userId);
  
  if (recommendationEngine === 'ai') {
    console.log('Applying AI-powered ranking to recommendations');
    
    // Sort each category's businesses by AI relevance scores
    for (const [category, businesses] of Object.entries(recommendations)) {
      // Calculate AI scores for each business
      for (const business of businesses) {
        const aiScores = calculateDetailedAIScores(business, category, quizResponse);
        business.ai_relevance_score = aiScores.overall_relevance;
        business.ai_scores = aiScores;
      }
      
      // Sort by AI relevance score (descending) with distance as tiebreaker
      businesses.sort((a, b) => {
        const scoreA = a.ai_relevance_score || 0;
        const scoreB = b.ai_relevance_score || 0;
        
        if (Math.abs(scoreA - scoreB) > 0.05) { // Significant score difference
          return scoreB - scoreA; // Higher score first
        }
        
        // Tie-breaker: prefer closer businesses
        return (a.distance_miles || 999) - (b.distance_miles || 999);
      });
      
      console.log(`AI-ranked businesses in ${category}:`, businesses.slice(0, 3).map(b => 
        `${b.name} (AI: ${(b.ai_relevance_score || 0).toFixed(2)}, Dist: ${b.distance_miles}mi)`
      ));
    }
  }

  return recommendations;
}

// Food Scene helper functions
function getFoodSceneSearchTerms(timeOfDay: string, category: string): string[] {
  const baseTerms = {
    morning: ['breakfast', 'brunch', 'coffee', 'cafe'],
    afternoon: ['lunch', 'casual dining', 'quick service', 'sandwich'],
    evening: ['dinner', 'restaurant', 'fine dining', 'cuisine']
  };
  
  return baseTerms[timeOfDay as keyof typeof baseTerms] || ['restaurant'];
}

function detectCuisineType(business: Business): string {
  const name = business.name.toLowerCase();
  const description = business.description?.toLowerCase() || '';
  const features = business.features?.join(' ').toLowerCase() || '';
  const combined = `${name} ${description} ${features}`;
  
  // Define cuisine patterns
  const cuisinePatterns = {
    'Italian': ['italian', 'pizza', 'pasta', 'pizzeria', 'trattoria'],
    'Mexican': ['mexican', 'taco', 'burrito', 'cantina', 'mexican food'],
    'Asian': ['chinese', 'thai', 'japanese', 'sushi', 'korean', 'vietnamese', 'asian'],
    'American': ['american', 'burger', 'grill', 'steakhouse', 'bbq', 'barbecue'],
    'Indian': ['indian', 'curry', 'tandoor', 'indian food'],
    'Mediterranean': ['mediterranean', 'greek', 'middle eastern', 'hummus'],
    'French': ['french', 'bistro', 'brasserie', 'french food'],
    'Cafe': ['cafe', 'coffee', 'espresso', 'latte', 'cappuccino'],
    'Fast Food': ['fast food', 'quick service', 'drive thru', 'fast casual'],
    'Bakery': ['bakery', 'pastry', 'bread', 'croissant', 'baked goods']
  };
  
  for (const [cuisine, patterns] of Object.entries(cuisinePatterns)) {
    if (patterns.some(pattern => combined.includes(pattern))) {
      return cuisine;
    }
  }
  
  return 'Other';
}

function applyCuisineDiversity(businesses: Business[]): Business[] {
  if (businesses.length <= 6) return businesses;
  
  const cuisineGroups: Record<string, Business[]> = {};
  
  // Group businesses by cuisine type
  businesses.forEach(business => {
    const cuisine = detectCuisineType(business);
    if (!cuisineGroups[cuisine]) {
      cuisineGroups[cuisine] = [];
    }
    cuisineGroups[cuisine].push(business);
  });
  
  // Sort each cuisine group by distance (closest first)
  Object.keys(cuisineGroups).forEach(cuisine => {
    cuisineGroups[cuisine].sort((a, b) => (a.distance_miles || 0) - (b.distance_miles || 0));
  });
  
  const result: Business[] = [];
  const maxPerCuisine = 2;
  
  // First pass: Take up to 2 from each cuisine type
  Object.values(cuisineGroups).forEach(businesses => {
    result.push(...businesses.slice(0, maxPerCuisine));
  });
  
  // If we don't have enough, fill with remaining businesses sorted by distance
  if (result.length < 6) {
    const remaining = businesses
      .filter(b => !result.some(r => r.name === b.name))
      .sort((a, b) => (a.distance_miles || 0) - (b.distance_miles || 0));
    
    result.push(...remaining.slice(0, 6 - result.length));
  }
  
  // Sort final result by distance
  return result
    .sort((a, b) => (a.distance_miles || 0) - (b.distance_miles || 0))
    .slice(0, 6);
}