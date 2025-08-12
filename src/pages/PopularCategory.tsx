import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { MapPin, Star, ExternalLink, ArrowLeft, Loader2, Gamepad2, Target, PartyPopper, Dice6, Flag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSmartToast } from "@/hooks/useSmartToast";
import { useBusinessDetails } from "@/hooks/useBusinessDetails";
import { useIsMobile } from "@/hooks/use-mobile";
import { useRequestCache } from "@/hooks/useRequestCache";

interface LocationData {
  latitude: number;
  longitude: number;
  city?: string;
}

interface Business {
  name: string;
  address: string;
  description: string;
  phone?: string;
  website?: string;
  image_url?: string;
  features: string[];
  latitude: number;
  longitude: number;
  distance_miles: number;
  rating?: number;
  is_favorite?: boolean;
  place_id?: string;
}

const trendingCategories = [
  { 
    name: "Drink Time", 
    icon: "☕🍺", 
    searchTerms: ["coffee shop", "cafe", "specialty coffee", "brewery", "brewpub", "craft beer", "happy hour", "bar"],
    color: "bg-amber-500",
    description: "Coffee culture and local brews"
  },
  { 
    name: "Art & Culture", 
    icon: "🎨", 
    searchTerms: ["art gallery", "museum", "cultural center"],
    color: "bg-pink-500",
    description: "Creative spaces and exhibitions"
  },
  { 
    name: "Outdoor Activities", 
    icon: "🏃", 
    searchTerms: ["park", "hiking trail", "outdoor recreation"],
    color: "bg-green-500",
    description: "Get active in nature"
  },
  { 
    name: "Live Music", 
    icon: "🎵", 
    searchTerms: ["live music venue", "concert hall", "music bar"],
    color: "bg-blue-500",
    description: "Catch local performances"
  },
  { 
    name: "Faith Communities", 
    icon: "⛪", 
    searchTerms: ["church", "synagogue", "mosque", "temple", "faith community", "religious services"],
    color: "bg-indigo-500",
    description: "Find spiritual communities and places of worship"
  },
  { 
    name: "Food Time", 
    icon: "🍴", 
    searchTerms: ["restaurant", "dining", "food truck", "bistro"],
    color: "bg-red-500",
    description: "Savor the local dining experiences"
  },
  { 
    name: "Shopping", 
    icon: "🛍️", 
    searchTerms: ["boutique", "shopping mall", "clothing store", "department store"],
    color: "bg-cyan-500",
    description: "Boutiques and specialty retail"
  },
  { 
    name: "Personal Care & Wellness", 
    icon: "💇‍♂️🧘‍♀️", 
    searchTerms: ["barbershop", "hair salon", "nail salon", "spa", "wellness center", "massage therapy", "beauty salon", "barber shop"],
    color: "bg-emerald-500",
    description: "Haircuts, Styling & Relaxation"
  },
  { 
    name: "Local Events", 
    icon: "📅", 
    searchTerms: ["event venue", "community center", "entertainment venue", "theater", "event space"],
    color: "bg-violet-500",
    description: "Find venues hosting local events and activities"
  },
  { 
    name: "Games", 
    icon: "🎮", 
    searchTerms: ["bowling alley", "arcade", "mini golf", "billiards"],
    color: "bg-purple-500",
    description: "Entertainment and indoor fun"
  }
];

const spotlightSections = [
  {
    title: "Weekend Hotspots",
    description: "Where locals spend their weekends",
    searchTerms: ["popular restaurant", "weekend market", "entertainment venue"]
  },
  {
    title: "Late Night Eats",
    description: "Open when hunger strikes after hours",
    searchTerms: ["late night food", "24 hour restaurant", "midnight snack"]
  },
  {
    title: "Social Scene",
    description: "Meet new people and make connections",
    searchTerms: ["social club", "meetup space", "community center"]
  }
];

const PopularCategory = () => {
  const { category } = useParams<{ category: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [location, setLocation] = useState<LocationData | null>(null);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [favoriteBusinesses, setFavoriteBusinesses] = useState<Set<string>>(new Set());
  const [favoritingBusinesses, setFavoritingBusinesses] = useState<Set<string>>(new Set());
  const [businessWebsites, setBusinessWebsites] = useState<Record<string, string>>({});
  
  // New state for Personal Care & Wellness tabs
  const [activeTab, setActiveTab] = useState('barbershops');
  const [subcategoryData, setSubcategoryData] = useState<{
    barbershops: Business[];
    salons: Business[];
    spas: Business[];
  }>({
    barbershops: [],
    salons: [],
    spas: []
  });
  const [subcategoryLoading, setSubcategoryLoading] = useState<{
    barbershops: boolean;
    salons: boolean;
    spas: boolean;
  }>({
    barbershops: false,
    salons: false,
    spas: false
  });

  // New state for Food Time tabs
  const [foodSceneTab, setFoodSceneTab] = useState('morning');
  const [foodSceneData, setFoodSceneData] = useState<{
    morning: Business[];
    afternoon: Business[];
    evening: Business[];
  }>({
    morning: [],
    afternoon: [],
    evening: []
  });
  const [foodSceneLoading, setFoodSceneLoading] = useState<{
    morning: boolean;
    afternoon: boolean;
    evening: boolean;
  }>({
    morning: false,
    afternoon: false,
    evening: false
  });

  // New state for Drink Time tabs
  const [drinkTimeTab, setDrinkTimeTab] = useState('coffee');
  const [drinkTimeData, setDrinkTimeData] = useState<{
    coffee: Business[];
    breweries: Business[];
  }>({
    coffee: [],
    breweries: []
  });
  const [drinkTimeLoading, setDrinkTimeLoading] = useState<{
    coffee: boolean;
    breweries: boolean;
  }>({
    coffee: false,
    breweries: false
  });
  
  const { getBusinessDetails, loadingStates } = useBusinessDetails();
  const { showFavoriteToast } = useSmartToast();
  const { getCached, setCached, checkBackendCache, setCurrentUserId } = useRequestCache();

  // Set current user for cache
  useEffect(() => {
    setCurrentUserId(user?.id || null);
  }, [user?.id, setCurrentUserId]);

  // Find category config
  const categoryConfig = trendingCategories.find(cat => 
    cat.name.toLowerCase().replace(/\s+/g, '-').replace(/&/g, 'and') === category
  ) || spotlightSections.find(section => 
    section.title.toLowerCase().replace(/\s+/g, '-') === category
  );

  useEffect(() => {
    const loadLocation = async () => {
      if (user) {
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('address')
            .eq('user_id', user.id)
            .single();

          if (profile?.address) {
            // Geocode the saved address to get coordinates and city
            const response = await fetch(
              `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=1&q=${encodeURIComponent(profile.address)}&countrycodes=us`,
              {
                headers: {
                  'User-Agent': 'CalmlySettled/1.0'
                }
              }
            );

            if (response.ok) {
              const data = await response.json();
              if (data.length > 0) {
                setLocation({
                  latitude: parseFloat(data[0].lat),
                  longitude: parseFloat(data[0].lon),
                  city: data[0].address?.city || data[0].address?.town || data[0].address?.village || data[0].display_name.split(',')[1]?.trim() || profile.address
                });
                return;
              }
            }
          }
        } catch (error) {
          console.error('Error loading saved location:', error);
        }
      }
      
      // If no saved location, try to get current location
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            try {
              // Reverse geocode to get city name
              const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.coords.latitude}&lon=${position.coords.longitude}&addressdetails=1`,
                {
                  headers: {
                    'User-Agent': 'CalmlySettled/1.0'
                  }
                }
              );

              if (response.ok) {
                const data = await response.json();
                const city = data.address?.city || data.address?.town || data.address?.village || 'Your Location';
                
                setLocation({
                  latitude: position.coords.latitude,
                  longitude: position.coords.longitude,
                  city
                });
              }
            } catch (error) {
              console.error('Error reverse geocoding:', error);
              setLocation({
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                city: 'Your Location'
              });
            }
          },
          (error) => {
            console.error('Error getting location:', error);
          }
        );
      }
    };

    const loadFavorites = async () => {
      if (!user) {
        setFavoriteBusinesses(new Set());
        return;
      }
      
      try {
        const { data: favorites, error } = await supabase
          .from('user_recommendations')
          .select('business_name')
          .eq('user_id', user.id)
          .eq('is_favorite', true);

        if (error) {
          console.error('Error loading favorites:', error);
          return;
        }

        const favoriteNames = new Set(favorites?.map(fav => fav.business_name) || []);
        setFavoriteBusinesses(favoriteNames);
      } catch (error) {
        console.error('Error loading favorites:', error);
      }
    };

    loadLocation();
    loadFavorites();
  }, [user]);

  useEffect(() => {
    if (location && categoryConfig) {
      if (categoryConfig && 'name' in categoryConfig && categoryConfig.name === 'Personal Care & Wellness') {
        // For Personal Care & Wellness, load the default tab (barbershops) immediately and prepare other tabs
        console.log('🔄 Initializing Personal Care & Wellness data...');
        fetchSubcategoryData('barbershops');
        // Preload other tabs to prevent empty states
        setTimeout(() => {
          if (subcategoryData.salons.length === 0 && !subcategoryLoading.salons) fetchSubcategoryData('salons');
          if (subcategoryData.spas.length === 0 && !subcategoryLoading.spas) fetchSubcategoryData('spas');
        }, 1000);
      } else if (categoryConfig && 'name' in categoryConfig && categoryConfig.name === 'Food Time') {
        // For Food Time, load the default tab (morning) immediately
        console.log('🔄 Initializing Food Time data...');
        fetchFoodSceneData('morning');
      } else if (categoryConfig && 'name' in categoryConfig && categoryConfig.name === 'Drink Time') {
        // For Drink Time, load both coffee AND brewery data immediately to prevent empty states
        console.log('🔄 Initializing Drink Time data...');
        fetchDrinkTimeData('coffee');
        // Preload brewery data to ensure it's available when tab is clicked
        setTimeout(() => {
          if (drinkTimeData.breweries.length === 0 && !drinkTimeLoading.breweries) {
            console.log('🔄 Preloading brewery data...');
            fetchDrinkTimeData('breweries');
          }
        }, 1000);
      } else {
        // For other categories, use the existing flow
        fetchCategoryPlaces();
      }
    }
  }, [location, categoryConfig]);

  const fetchCategoryPlaces = async () => {
    if (!location || !categoryConfig) return;

    setLoading(true);

    try {
      const searchTerms = categoryConfig.searchTerms;
      const cacheKey = `popular-${searchTerms.join('-').toLowerCase()}-${location.latitude.toFixed(2)}-${location.longitude.toFixed(2)}`;
      
      // Check frontend cache first
      const cachedData = getCached('popular', { 
        latitude: location.latitude,
        longitude: location.longitude,
        categories: searchTerms 
      }, true);
      
      if (cachedData) {
        console.log('💰 FRONTEND CACHE HIT for popular category');
        setBusinesses(cachedData);
        setLoading(false);
        return;
      }

      // Check backend cache
      const backendCached = await checkBackendCache({ 
        lat: location.latitude, 
        lng: location.longitude 
      }, searchTerms);
      
      if (backendCached) {
        console.log('💰 BACKEND CACHE HIT for popular category');
        const allResults: Business[] = [];
        searchTerms.forEach(term => {
          if (backendCached[term]) {
            allResults.push(...backendCached[term]);
          }
        });

        if (allResults.length > 0) {
          const sortedResults = allResults
            .sort((a, b) => (a.distance_miles || 0) - (b.distance_miles || 0))
            .slice(0, 12);

          setBusinesses(sortedResults);
          setCached('popular', { 
            latitude: location.latitude,
            longitude: location.longitude,
            categories: searchTerms 
          }, sortedResults, true);
          setLoading(false);
          return;
        }
      }

      console.log('🔄 CACHE MISS - Making fresh API call for popular category');
      
      // Fresh API call
      const { data, error } = await supabase.functions.invoke('generate-recommendations', {
        body: {
          popularMode: true,
          latitude: location.latitude,
          longitude: location.longitude,
          categories: searchTerms
        }
      });

      if (error) throw error;

      if (data?.recommendations) {
        const allResults: Business[] = [];
        Object.values(data.recommendations).forEach((businesses: Business[]) => {
          allResults.push(...businesses);
        });
        
        const sortedResults = allResults
          .sort((a, b) => (a.distance_miles || 0) - (b.distance_miles || 0))
          .slice(0, 12);

        setBusinesses(sortedResults);
        setCached('popular', { 
          latitude: location.latitude,
          longitude: location.longitude,
          categories: searchTerms 
        }, sortedResults, true);
        console.log(`💾 Cached ${sortedResults.length} popular places`);
      }
    } catch (error) {
      console.error('Error fetching category places:', error);
      console.error('Failed to load places. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getGoogleMapsUrl = (address: string) => {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  };

  // Unified function to fetch tab data with caching
  const fetchTabData = async (
    type: 'personal-care' | 'food-time' | 'drink-time',
    subcategory: string,
    searchTerms: string[]
  ) => {
    if (!location) return [];

    // Check frontend cache first
    const cachedData = getCached(`${type}-${subcategory}`, { 
      latitude: location.latitude,
      longitude: location.longitude,
      categories: searchTerms 
    }, true);
    
    if (cachedData) {
      console.log(`💰 FRONTEND CACHE HIT for ${type}-${subcategory}`);
      return cachedData;
    }

    // Check backend cache
    const backendCached = await checkBackendCache({ 
      lat: location.latitude, 
      lng: location.longitude 
    }, searchTerms);
    
    if (backendCached) {
      console.log(`💰 BACKEND CACHE HIT for ${type}-${subcategory}`);
      const allResults: Business[] = [];
      searchTerms.forEach(term => {
        if (backendCached[term]) {
          allResults.push(...backendCached[term]);
        }
      });

      if (allResults.length > 0) {
        const sortedResults = allResults
          .sort((a, b) => (a.distance_miles || 0) - (b.distance_miles || 0))
          .slice(0, 4);

        setCached(`${type}-${subcategory}`, { 
          latitude: location.latitude,
          longitude: location.longitude,
          categories: searchTerms 
        }, sortedResults, true);
        return sortedResults;
      }
    }

    console.log(`🔄 CACHE MISS - Making fresh API call for ${type}-${subcategory}`);
    
    // Fresh API call
    const modeMap = {
      'personal-care': 'personalCareMode',
      'food-time': 'foodSceneMode', 
      'drink-time': 'popularMode'
    };

    const { data, error } = await supabase.functions.invoke('generate-recommendations', {
      body: {
        [modeMap[type]]: true,
        timeOfDay: type === 'food-time' ? subcategory : undefined,
        latitude: location.latitude,
        longitude: location.longitude,
        categories: searchTerms
      }
    });

    if (error) throw error;

    if (data?.recommendations) {
      const allResults: Business[] = [];
      Object.values(data.recommendations).forEach((businesses: Business[]) => {
        allResults.push(...businesses);
      });
      
      const sortedResults = allResults
        .sort((a, b) => (a.distance_miles || 0) - (b.distance_miles || 0))
        .slice(0, 4);

      setCached(`${type}-${subcategory}`, { 
        latitude: location.latitude,
        longitude: location.longitude,
        categories: searchTerms 
      }, sortedResults, true);
      console.log(`💾 Cached ${sortedResults.length} ${type}-${subcategory} places`);
      return sortedResults;
    }

    return [];
  };

  // New function to fetch subcategory data individually for Personal Care & Wellness
  const fetchSubcategoryData = async (subcategory: 'barbershops' | 'salons' | 'spas') => {
    if (!location) return;

    setSubcategoryLoading(prev => ({ ...prev, [subcategory]: true }));

    try {
      const searchTermsMap = {
        barbershops: ['barbershop', 'barber', "men's haircut"],
        salons: ['hair salon', 'beauty salon', 'nail salon'],
        spas: ['spa', 'massage', 'wellness center']
      };

      const searchTerms = searchTermsMap[subcategory];
      const results = await fetchTabData('personal-care', subcategory, searchTerms);
      
      setSubcategoryData(prev => ({
        ...prev,
        [subcategory]: results
      }));
      
    } catch (error) {
      console.error(`Error fetching ${subcategory} data:`, error);
    } finally {
      setSubcategoryLoading(prev => ({ ...prev, [subcategory]: false }));
    }
  };

  // Function to fetch Food Time data by time period
  const fetchFoodSceneData = async (timeOfDay: 'morning' | 'afternoon' | 'evening') => {
    if (!location) return;

    setFoodSceneLoading(prev => ({ ...prev, [timeOfDay]: true }));

    try {
      const searchTermsMap = {
        morning: ['breakfast', 'coffee shop', 'bakery', 'brunch'],
        afternoon: ['lunch', 'casual dining', 'sandwich shop', 'food truck'],
        evening: ['dinner', 'restaurant', 'fine dining', 'steakhouse']
      };

      const searchTerms = searchTermsMap[timeOfDay];
      const results = await fetchTabData('food-time', timeOfDay, searchTerms);
      
      setFoodSceneData(prev => ({
        ...prev,
        [timeOfDay]: results
      }));
      
    } catch (error) {
      console.error(`Error fetching ${timeOfDay} food data:`, error);
    } finally {
      setFoodSceneLoading(prev => ({ ...prev, [timeOfDay]: false }));
    }
  };

  // Function to fetch Drink Time data (coffee vs breweries)
  const fetchDrinkTimeData = async (drinkType: 'coffee' | 'breweries') => {
    if (!location) return;

    setDrinkTimeLoading(prev => ({ ...prev, [drinkType]: true }));

    try {
      const searchTermsMap = {
        coffee: ['coffee shop', 'cafe', 'specialty coffee'],
        breweries: ['brewery', 'brewpub', 'craft beer', 'happy hour', 'bar']
      };

      const searchTerms = searchTermsMap[drinkType];
      const results = await fetchTabData('drink-time', drinkType, searchTerms);
      
      setDrinkTimeData(prev => ({
        ...prev,
        [drinkType]: results
      }));
      
    } catch (error) {
      console.error(`Error fetching ${drinkType}:`, error);
    } finally {
      setDrinkTimeLoading(prev => ({ ...prev, [drinkType]: false }));
    }
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    const subcategory = value as 'barbershops' | 'salons' | 'spas';
    
    // Always fetch if data doesn't exist, and force refresh if tab appears empty but should have data
    if (subcategoryData[subcategory].length === 0 && !subcategoryLoading[subcategory]) {
      console.log(`🔄 Loading ${subcategory} data for tab change`);
      fetchSubcategoryData(subcategory);
    } else if (subcategoryData[subcategory].length === 0 && subcategoryLoading[subcategory]) {
      console.log(`⏳ Already loading ${subcategory} data...`);
    } else {
      console.log(`✅ Using existing ${subcategory} data: ${subcategoryData[subcategory].length} items`);
    }
  };

  const handleFoodSceneTabChange = (value: string) => {
    setFoodSceneTab(value);
    const timeOfDay = value as 'morning' | 'afternoon' | 'evening';
    
    // Only fetch if we don't have data for this time period yet
    if (foodSceneData[timeOfDay].length === 0 && !foodSceneLoading[timeOfDay]) {
      fetchFoodSceneData(timeOfDay);
    }
  };

  const handleDrinkTimeTabChange = (value: string) => {
    setDrinkTimeTab(value);
    const drinkType = value as 'coffee' | 'breweries';
    
    // Always fetch if data doesn't exist, and force refresh if tab appears empty but should have data
    if (drinkTimeData[drinkType].length === 0 && !drinkTimeLoading[drinkType]) {
      console.log(`🔄 Loading ${drinkType} data for tab change`);
      fetchDrinkTimeData(drinkType);
    } else if (drinkTimeData[drinkType].length === 0 && drinkTimeLoading[drinkType]) {
      console.log(`⏳ Already loading ${drinkType} data...`);
    } else {
      console.log(`✅ Using existing ${drinkType} data: ${drinkTimeData[drinkType].length} items`);
    }
  };

  const categorizeBusinesses = (businesses: Business[]) => {
    const categorized = {
      barbershops: [] as Business[],
      salons: [] as Business[], 
      spas: [] as Business[]
    };

    businesses.forEach(business => {
      const name = business.name.toLowerCase();
      const description = business.description?.toLowerCase() || '';
      const features = business.features?.join(' ').toLowerCase() || '';
      const combined = `${name} ${description} ${features}`;

      if (combined.includes('barber') || combined.includes('barbershop') || combined.includes("men's cut")) {
        categorized.barbershops.push(business);
      } else if (combined.includes('spa') || combined.includes('massage') || combined.includes('wellness') || combined.includes('yoga') || combined.includes('meditation')) {
        categorized.spas.push(business);
      } else {
        categorized.salons.push(business);
      }
    });

    return categorized;
  };

  const handleGetWebsite = async (business: Business) => {
    if (!business.place_id) return;
    
    const details = await getBusinessDetails(business.place_id, business.name);
    if (details?.website) {
      setBusinessWebsites(prev => ({ ...prev, [business.place_id!]: details.website! }));
    }
  };

  const toggleFavorite = async (business: Business) => {
    if (!user) {
      console.error("Please log in to favorite businesses.");
      return;
    }

    const businessKey = business.name;
    setFavoritingBusinesses(prev => new Set(prev).add(businessKey));

    try {
      const category = 'name' in categoryConfig ? categoryConfig.name : categoryConfig.title;
      
      // First check if the business is already saved
      const { data: existingRecommendations, error: fetchError } = await supabase
        .from('user_recommendations')
        .select('id, is_favorite')
        .eq('user_id', user.id)
        .eq('business_name', business.name)
        .eq('business_address', business.address)
        .eq('category', category);

      if (fetchError) {
        throw fetchError;
      }

      if (existingRecommendations && existingRecommendations.length > 0) {
        // Check if ANY record is currently favorited
        const anyFavorited = existingRecommendations.some(rec => rec.is_favorite);
        const newFavoriteStatus = !anyFavorited;
        
        // Update ALL matching records to have the same favorite status
        const { error: updateError } = await supabase
          .from('user_recommendations')
          .update({ is_favorite: newFavoriteStatus })
          .eq('user_id', user.id)
          .eq('business_name', business.name)
          .eq('business_address', business.address)
          .eq('category', category);

        if (updateError) {
          throw updateError;
        }

        // Update local state
        setFavoriteBusinesses(prev => {
          const newSet = new Set(prev);
          if (newFavoriteStatus) {
            newSet.add(businessKey);
          } else {
            newSet.delete(businessKey);
          }
          return newSet;
        });

        showFavoriteToast(newFavoriteStatus ? 'added' : 'removed');
      } else {
        // Save as new recommendation with favorite status
        const imageUrl = business.image_url && business.image_url.trim() !== '' ? business.image_url : null;
        
        const { error: insertError } = await supabase
          .from('user_recommendations')
          .insert({
            user_id: user.id,
            category: category,
            business_name: business.name,
            business_address: business.address,
            business_description: business.description || `Great ${category} option`,
            business_phone: business.phone,
            business_website: business.website,
            business_image: imageUrl,
            business_features: business.features || [],
            business_latitude: business.latitude,
            business_longitude: business.longitude,
            distance_miles: business.distance_miles,
            place_id: business.place_id,
            is_favorite: true
          });

        if (insertError) {
          throw insertError;
        }

        // Update local state
        setFavoriteBusinesses(prev => new Set(prev).add(businessKey));

        showFavoriteToast('added');
      }
    } catch (error: any) {
      console.error('Error favoriting business:', error);
      console.error("Failed to update favorites");
    } finally {
      setFavoritingBusinesses(prev => {
        const newSet = new Set(prev);
        newSet.delete(businessKey);
        return newSet;
      });
    }
  };

  if (!categoryConfig) {
    return (
      <div className="min-h-screen bg-gradient-subtle">
        <Header />
        <main className="pt-24 pb-16">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center">
            <h1 className="text-2xl font-bold mb-4">Category Not Found</h1>
            <Button onClick={() => navigate('/popular')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Return to Popular
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <Header />
      
      {/* Mobile Header with Back Button */}
      {isMobile && (
        <div className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
          <div className="flex items-center gap-3 px-4 py-3">
            <Button
              onClick={() => navigate('/popular')}
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-lg font-semibold text-foreground truncate">
              {'name' in categoryConfig ? categoryConfig.name : categoryConfig.title}
            </h1>
          </div>
        </div>
      )}
      
      <main className={isMobile ? "pb-16" : "pt-24 pb-16"}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          {/* Header Section */}
          <div className="mb-8">
            <Button 
              variant="ghost" 
              onClick={() => navigate('/popular')}
              className="mb-6 hover:bg-background/80"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Return to Popular
            </Button>

            <div className="text-center">
              <div className="flex items-center justify-center mb-6">
                {'icon' in categoryConfig && (
                  <div className={`w-16 h-16 rounded-full ${trendingCategories.find(cat => cat.name === categoryConfig.name)?.color || 'bg-primary'} flex items-center justify-center text-2xl`}>
                    {categoryConfig.icon}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Results Section */}
          {('name' in categoryConfig && categoryConfig.name === "Personal Care & Wellness") ? (
            // Special tabbed layout for Personal Care & Wellness
            <Tabs defaultValue="barbershops" className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-8 h-auto py-2">
                <TabsTrigger value="barbershops" className="flex items-center gap-1 text-xs sm:text-sm px-2 py-2 sm:px-3 sm:py-1.5" onClick={() => handleTabChange('barbershops')}>
                  <span className="hidden xs:inline">Barbershops</span>
                  <span className="xs:hidden">Barber</span>
                </TabsTrigger>
                <TabsTrigger value="salons" className="flex items-center gap-1 text-xs sm:text-sm px-2 py-2 sm:px-3 sm:py-1.5" onClick={() => handleTabChange('salons')}>
                  <span className="hidden xs:inline">Salons & Beauty</span>
                  <span className="xs:hidden">Salon</span>
                </TabsTrigger>
                <TabsTrigger value="spas" className="flex items-center gap-1 text-xs sm:text-sm px-2 py-2 sm:px-3 sm:py-1.5" onClick={() => handleTabChange('spas')}>
                  <span className="hidden xs:inline">Spa & Wellness</span>
                  <span className="xs:hidden">Spa</span>
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="barbershops">
                {subcategoryLoading.barbershops ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                          {[...Array(4)].map((_, i) => (
                            <Card key={i} className="overflow-hidden">
                              <CardContent className="p-0">
                                <Skeleton className="h-48 w-full" />
                                <div className="p-4 space-y-2">
                                  <Skeleton className="h-6 w-3/4" />
                                  <Skeleton className="h-4 w-full" />
                                  <Skeleton className="h-4 w-2/3" />
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      ) : subcategoryData.barbershops.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                          {subcategoryData.barbershops.map((business) => (
                            <Card key={`barbershop-${business.name}`} className="group transition-all duration-300 hover:shadow-elegant hover:-translate-y-1">
                              <CardContent className="p-0">
                                {business.image_url && (
                                  <div className="h-32 bg-muted rounded-t-lg overflow-hidden">
                                    <img 
                                      src={business.image_url} 
                                      alt={business.name}
                                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                    />
                                  </div>
                                )}
                                
                                <div className="p-3">
                                  <div className="flex items-start justify-between mb-2">
                                    <h3 className="text-sm font-semibold leading-tight">{business.name}</h3>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => toggleFavorite(business)}
                                      disabled={favoritingBusinesses.has(business.name)}
                                      className="p-1 hover:bg-background/80"
                                    >
                                      <Star 
                                        className={`h-3 w-3 transition-colors ${
                                          favoriteBusinesses.has(business.name)
                                            ? 'fill-current text-yellow-500' 
                                            : 'text-muted-foreground hover:text-yellow-500'
                                        }`} 
                                      />
                                    </Button>
                                  </div>
                                
                                  <div className="space-y-1">
                                    <a 
                                      href={getGoogleMapsUrl(business.address)}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center text-xs text-muted-foreground hover:text-primary transition-colors group"
                                    >
                                      <MapPin className="mr-1 h-2 w-2 transition-transform group-hover:scale-110" />
                                      <span className="line-clamp-1 hover:underline">{business.address}</span>
                                    </a>
                                    
                                    <div className="text-xs font-medium text-primary">
                                      {business.distance_miles?.toFixed(1)} miles away
                                    </div>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-12">
                          <div className="text-4xl mb-4">💇‍♂️</div>
                          <h3 className="text-xl font-semibold mb-2">No barbershops found</h3>
                          <p className="text-muted-foreground">Try the other tabs for more options.</p>
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="salons">
                      {subcategoryLoading.salons ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                          {[...Array(4)].map((_, i) => (
                            <Card key={i} className="overflow-hidden">
                              <CardContent className="p-0">
                                <Skeleton className="h-48 w-full" />
                                <div className="p-4 space-y-2">
                                  <Skeleton className="h-6 w-3/4" />
                                  <Skeleton className="h-4 w-full" />
                                  <Skeleton className="h-4 w-2/3" />
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      ) : subcategoryData.salons.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                          {subcategoryData.salons.map((business) => (
                            <Card key={`salon-${business.name}`} className="group transition-all duration-300 hover:shadow-elegant hover:-translate-y-1">
                              <CardContent className="p-0">
                                {business.image_url && (
                                  <div className="h-32 bg-muted rounded-t-lg overflow-hidden">
                                    <img 
                                      src={business.image_url} 
                                      alt={business.name}
                                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                    />
                                  </div>
                                )}
                                
                                <div className="p-3">
                                  <div className="flex items-start justify-between mb-2">
                                    <h3 className="text-sm font-semibold leading-tight">{business.name}</h3>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => toggleFavorite(business)}
                                      disabled={favoritingBusinesses.has(business.name)}
                                      className="p-1 hover:bg-background/80"
                                    >
                                      <Star 
                                        className={`h-3 w-3 transition-colors ${
                                          favoriteBusinesses.has(business.name)
                                            ? 'fill-current text-yellow-500' 
                                            : 'text-muted-foreground hover:text-yellow-500'
                                        }`} 
                                      />
                                    </Button>
                                  </div>
                                
                                  <div className="space-y-1">
                                    <a 
                                      href={getGoogleMapsUrl(business.address)}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center text-xs text-muted-foreground hover:text-primary transition-colors group"
                                    >
                                      <MapPin className="mr-1 h-2 w-2 transition-transform group-hover:scale-110" />
                                      <span className="line-clamp-1 hover:underline">{business.address}</span>
                                    </a>
                                    
                                    <div className="text-xs font-medium text-primary">
                                      {business.distance_miles?.toFixed(1)} miles away
                                    </div>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-12">
                          <div className="text-4xl mb-4">💅</div>
                          <h3 className="text-xl font-semibold mb-2">No salons found</h3>
                          <p className="text-muted-foreground">Try the other tabs for more options.</p>
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="spas">
                      {subcategoryLoading.spas ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                          {[...Array(4)].map((_, i) => (
                            <Card key={i} className="overflow-hidden">
                              <CardContent className="p-0">
                                <Skeleton className="h-48 w-full" />
                                <div className="p-4 space-y-2">
                                  <Skeleton className="h-6 w-3/4" />
                                  <Skeleton className="h-4 w-full" />
                                  <Skeleton className="h-4 w-2/3" />
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      ) : subcategoryData.spas.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                          {subcategoryData.spas.map((business) => (
                            <Card key={`spa-${business.name}`} className="group transition-all duration-300 hover:shadow-elegant hover:-translate-y-1">
                              <CardContent className="p-0">
                                {business.image_url && (
                                  <div className="h-32 bg-muted rounded-t-lg overflow-hidden">
                                    <img 
                                      src={business.image_url} 
                                      alt={business.name}
                                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                    />
                                  </div>
                                )}
                                
                                <div className="p-3">
                                  <div className="flex items-start justify-between mb-2">
                                    <h3 className="text-sm font-semibold leading-tight">{business.name}</h3>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => toggleFavorite(business)}
                                      disabled={favoritingBusinesses.has(business.name)}
                                      className="p-1 hover:bg-background/80"
                                    >
                                      <Star 
                                        className={`h-3 w-3 transition-colors ${
                                          favoriteBusinesses.has(business.name)
                                            ? 'fill-current text-yellow-500' 
                                            : 'text-muted-foreground hover:text-yellow-500'
                                        }`} 
                                      />
                                    </Button>
                                  </div>
                                
                                  <div className="space-y-1">
                                    <a 
                                      href={getGoogleMapsUrl(business.address)}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center text-xs text-muted-foreground hover:text-primary transition-colors group"
                                    >
                                      <MapPin className="mr-1 h-2 w-2 transition-transform group-hover:scale-110" />
                                      <span className="line-clamp-1 hover:underline">{business.address}</span>
                                    </a>
                                    
                                    <div className="text-xs font-medium text-primary">
                                      {business.distance_miles?.toFixed(1)} miles away
                                    </div>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-12">
                          <div className="text-4xl mb-4">🧘</div>
                          <h3 className="text-xl font-semibold mb-2">No spas found</h3>
                          <p className="text-muted-foreground">Try the other tabs for more options.</p>
                        </div>
                      )}
                 </TabsContent>
            </Tabs>
          ) : ('name' in categoryConfig && categoryConfig.name === "Food Time") ? (
            // Special tabbed layout for Food Time
            <Tabs defaultValue="morning" className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-8 h-auto py-2">
                <TabsTrigger value="morning" className="flex items-center gap-1 text-xs sm:text-sm px-2 py-2 sm:px-3 sm:py-1.5" onClick={() => handleFoodSceneTabChange('morning')}>
                  <span className="hidden xs:inline">Morning</span>
                  <span className="xs:hidden">AM</span>
                </TabsTrigger>
                <TabsTrigger value="afternoon" className="flex items-center gap-1 text-xs sm:text-sm px-2 py-2 sm:px-3 sm:py-1.5" onClick={() => handleFoodSceneTabChange('afternoon')}>
                  <span className="hidden xs:inline">Afternoon</span>
                  <span className="xs:hidden">PM</span>
                </TabsTrigger>
                <TabsTrigger value="evening" className="flex items-center gap-1 text-xs sm:text-sm px-2 py-2 sm:px-3 sm:py-1.5" onClick={() => handleFoodSceneTabChange('evening')}>
                  <span className="hidden xs:inline">Evening</span>
                  <span className="xs:hidden">Night</span>
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="morning">
                {foodSceneLoading.morning ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                    {[...Array(6)].map((_, i) => (
                      <Card key={i} className="overflow-hidden">
                        <CardContent className="p-0">
                          <Skeleton className="h-48 w-full" />
                          <div className="p-4 space-y-2">
                            <Skeleton className="h-6 w-3/4" />
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-2/3" />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : foodSceneData.morning.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                    {foodSceneData.morning.map((business) => (
                      <Card key={`morning-${business.name}`} className="group transition-all duration-300 hover:shadow-elegant hover:-translate-y-1">
                        <CardContent className="p-0">
                          {business.image_url && (
                            <div className="h-48 bg-muted rounded-t-lg overflow-hidden">
                              <img 
                                src={business.image_url} 
                                alt={business.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                            </div>
                          )}
                          
                          <div className="p-4">
                            <div className="flex items-start justify-between mb-2">
                              <h3 className="text-lg font-semibold">{business.name}</h3>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleFavorite(business)}
                                disabled={favoritingBusinesses.has(business.name)}
                                className="p-1 hover:bg-background/80"
                              >
                                <Star 
                                  className={`h-4 w-4 transition-colors ${
                                    favoriteBusinesses.has(business.name)
                                      ? 'fill-current text-yellow-500' 
                                      : 'text-muted-foreground hover:text-yellow-500'
                                  }`} 
                                />
                              </Button>
                            </div>
                          
                            <div className="space-y-2">
                              <a 
                                href={getGoogleMapsUrl(business.address)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center text-sm text-muted-foreground hover:text-primary transition-colors group"
                              >
                                <MapPin className="mr-1 h-3 w-3 transition-transform group-hover:scale-110" />
                                <span className="line-clamp-1 hover:underline">{business.address}</span>
                              </a>
                              
                              <div className="text-sm font-medium text-primary">
                                {business.distance_miles?.toFixed(1)} miles away
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="text-4xl mb-4">🌅</div>
                    <h3 className="text-xl font-semibold mb-2">No breakfast spots found</h3>
                    <p className="text-muted-foreground">Try the other tabs for lunch or dinner options.</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="afternoon">
                {foodSceneLoading.afternoon ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                    {[...Array(6)].map((_, i) => (
                      <Card key={i} className="overflow-hidden">
                        <CardContent className="p-0">
                          <Skeleton className="h-48 w-full" />
                          <div className="p-4 space-y-2">
                            <Skeleton className="h-6 w-3/4" />
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-2/3" />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : foodSceneData.afternoon.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                    {foodSceneData.afternoon.map((business) => (
                      <Card key={`afternoon-${business.name}`} className="group transition-all duration-300 hover:shadow-elegant hover:-translate-y-1">
                        <CardContent className="p-0">
                          {business.image_url && (
                            <div className="h-48 bg-muted rounded-t-lg overflow-hidden">
                              <img 
                                src={business.image_url} 
                                alt={business.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                            </div>
                          )}
                          
                          <div className="p-4">
                            <div className="flex items-start justify-between mb-2">
                              <h3 className="text-lg font-semibold">{business.name}</h3>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleFavorite(business)}
                                disabled={favoritingBusinesses.has(business.name)}
                                className="p-1 hover:bg-background/80"
                              >
                                <Star 
                                  className={`h-4 w-4 transition-colors ${
                                    favoriteBusinesses.has(business.name)
                                      ? 'fill-current text-yellow-500' 
                                      : 'text-muted-foreground hover:text-yellow-500'
                                  }`} 
                                />
                              </Button>
                            </div>
                          
                            <div className="space-y-2">
                              <a 
                                href={getGoogleMapsUrl(business.address)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center text-sm text-muted-foreground hover:text-primary transition-colors group"
                              >
                                <MapPin className="mr-1 h-3 w-3 transition-transform group-hover:scale-110" />
                                <span className="line-clamp-1 hover:underline">{business.address}</span>
                              </a>
                              
                              <div className="text-sm font-medium text-primary">
                                {business.distance_miles?.toFixed(1)} miles away
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="text-4xl mb-4">☀️</div>
                    <h3 className="text-xl font-semibold mb-2">No lunch spots found</h3>
                    <p className="text-muted-foreground">Try the other tabs for breakfast or dinner options.</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="evening">
                {foodSceneLoading.evening ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                    {[...Array(6)].map((_, i) => (
                      <Card key={i} className="overflow-hidden">
                        <CardContent className="p-0">
                          <Skeleton className="h-48 w-full" />
                          <div className="p-4 space-y-2">
                            <Skeleton className="h-6 w-3/4" />
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-2/3" />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : foodSceneData.evening.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                    {foodSceneData.evening.map((business) => (
                      <Card key={`evening-${business.name}`} className="group transition-all duration-300 hover:shadow-elegant hover:-translate-y-1">
                        <CardContent className="p-0">
                          {business.image_url && (
                            <div className="h-48 bg-muted rounded-t-lg overflow-hidden">
                              <img 
                                src={business.image_url} 
                                alt={business.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                            </div>
                          )}
                          
                          <div className="p-4">
                            <div className="flex items-start justify-between mb-2">
                              <h3 className="text-lg font-semibold">{business.name}</h3>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleFavorite(business)}
                                disabled={favoritingBusinesses.has(business.name)}
                                className="p-1 hover:bg-background/80"
                              >
                                <Star 
                                  className={`h-4 w-4 transition-colors ${
                                    favoriteBusinesses.has(business.name)
                                      ? 'fill-current text-yellow-500' 
                                      : 'text-muted-foreground hover:text-yellow-500'
                                  }`} 
                                />
                              </Button>
                            </div>
                          
                            <div className="space-y-2">
                              <a 
                                href={getGoogleMapsUrl(business.address)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center text-sm text-muted-foreground hover:text-primary transition-colors group"
                              >
                                <MapPin className="mr-1 h-3 w-3 transition-transform group-hover:scale-110" />
                                <span className="line-clamp-1 hover:underline">{business.address}</span>
                              </a>
                              
                              <div className="text-sm font-medium text-primary">
                                {business.distance_miles?.toFixed(1)} miles away
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="text-4xl mb-4">🌙</div>
                    <h3 className="text-xl font-semibold mb-2">No dinner spots found</h3>
                    <p className="text-muted-foreground">Try the other tabs for breakfast or lunch options.</p>
                  </div>
                )}
              </TabsContent>
             </Tabs>
          ) : ('name' in categoryConfig && categoryConfig.name === "Drink Time") ? (
            // Special tabbed layout for Drink Time
            <Tabs defaultValue="coffee" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-8 h-auto py-2">
                <TabsTrigger value="coffee" className="flex items-center gap-1 text-xs sm:text-sm px-2 py-2 sm:px-3 sm:py-1.5" onClick={() => handleDrinkTimeTabChange('coffee')}>
                  <span className="hidden xs:inline">Coffee & Cafes</span>
                  <span className="xs:hidden">Coffee</span>
                </TabsTrigger>
                <TabsTrigger value="breweries" className="flex items-center gap-1 text-xs sm:text-sm px-2 py-2 sm:px-3 sm:py-1.5" onClick={() => handleDrinkTimeTabChange('breweries')}>
                  <span className="hidden xs:inline">Happy Hours & Breweries</span>
                  <span className="xs:hidden">Breweries</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="coffee">
                {drinkTimeLoading.coffee ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                    {[...Array(6)].map((_, i) => (
                      <Card key={i} className="overflow-hidden">
                        <CardContent className="p-0">
                          <Skeleton className="h-48 w-full" />
                          <div className="p-4 space-y-2">
                            <Skeleton className="h-6 w-3/4" />
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-2/3" />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : drinkTimeData.coffee.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                    {drinkTimeData.coffee.map((business) => (
                      <Card key={`coffee-${business.name}`} className="group transition-all duration-300 hover:shadow-elegant hover:-translate-y-1">
                        <CardContent className="p-0">
                          {business.image_url && (
                            <div className="h-48 bg-muted rounded-t-lg overflow-hidden">
                              <img 
                                src={business.image_url} 
                                alt={business.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                            </div>
                          )}
                          
                          <div className="p-4">
                            <div className="flex items-start justify-between mb-2">
                              <h3 className="text-lg font-semibold">{business.name}</h3>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleFavorite(business)}
                                disabled={favoritingBusinesses.has(business.name)}
                                className="p-1 hover:bg-background/80"
                              >
                                <Star 
                                  className={`h-4 w-4 transition-colors ${
                                    favoriteBusinesses.has(business.name)
                                      ? 'fill-current text-yellow-500' 
                                      : 'text-muted-foreground hover:text-yellow-500'
                                  }`} 
                                />
                              </Button>
                            </div>
                          
                            <div className="space-y-2">
                              <a 
                                href={getGoogleMapsUrl(business.address)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center text-sm text-muted-foreground hover:text-primary transition-colors group"
                              >
                                <MapPin className="mr-1 h-3 w-3 transition-transform group-hover:scale-110" />
                                <span className="line-clamp-1 hover:underline">{business.address}</span>
                              </a>
                              
                              <div className="text-sm font-medium text-primary">
                                {business.distance_miles?.toFixed(1)} miles away
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="text-4xl mb-4">☕</div>
                    <h3 className="text-xl font-semibold mb-2">No coffee shops found</h3>
                    <p className="text-muted-foreground">Try the brewery tab for more options.</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="breweries">
                {drinkTimeLoading.breweries ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                    {[...Array(6)].map((_, i) => (
                      <Card key={i} className="overflow-hidden">
                        <CardContent className="p-0">
                          <Skeleton className="h-48 w-full" />
                          <div className="p-4 space-y-2">
                            <Skeleton className="h-6 w-3/4" />
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-2/3" />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : drinkTimeData.breweries.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                    {drinkTimeData.breweries.map((business) => (
                      <Card key={`brewery-${business.name}`} className="group transition-all duration-300 hover:shadow-elegant hover:-translate-y-1">
                        <CardContent className="p-0">
                          {business.image_url && (
                            <div className="h-48 bg-muted rounded-t-lg overflow-hidden">
                              <img 
                                src={business.image_url} 
                                alt={business.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                            </div>
                          )}
                          
                          <div className="p-4">
                            <div className="flex items-start justify-between mb-2">
                              <h3 className="text-lg font-semibold">{business.name}</h3>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleFavorite(business)}
                                disabled={favoritingBusinesses.has(business.name)}
                                className="p-1 hover:bg-background/80"
                              >
                                <Star 
                                  className={`h-4 w-4 transition-colors ${
                                    favoriteBusinesses.has(business.name)
                                      ? 'fill-current text-yellow-500' 
                                      : 'text-muted-foreground hover:text-yellow-500'
                                  }`} 
                                />
                              </Button>
                            </div>
                          
                            <div className="space-y-2">
                              <a 
                                href={getGoogleMapsUrl(business.address)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center text-sm text-muted-foreground hover:text-primary transition-colors group"
                              >
                                <MapPin className="mr-1 h-3 w-3 transition-transform group-hover:scale-110" />
                                <span className="line-clamp-1 hover:underline">{business.address}</span>
                              </a>
                              
                              <div className="text-sm font-medium text-primary">
                                {business.distance_miles?.toFixed(1)} miles away
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="text-4xl mb-4">🍺</div>
                    <h3 className="text-xl font-semibold mb-2">No breweries found</h3>
                    <p className="text-muted-foreground">Try the coffee tab for more options.</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          ) : (
            // Regular layout for other categories
            <>
              {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  {[...Array(6)].map((_, i) => (
                    <Card key={i} className="overflow-hidden">
                      <CardContent className="p-0">
                        <Skeleton className="h-48 w-full" />
                        <div className="p-4 space-y-2">
                          <Skeleton className="h-6 w-3/4" />
                          <Skeleton className="h-4 w-full" />
                          <Skeleton className="h-4 w-2/3" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : businesses.length > 0 ? (
                <>
                  <div className="flex items-center gap-2 mb-6">
                    <h2 className="text-2xl font-bold">{'name' in categoryConfig ? categoryConfig.name : categoryConfig.title}</h2>
                    <Badge variant="secondary">{businesses.length} places</Badge>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                    {businesses.map((business) => (
                      <Card key={business.name} className="group transition-all duration-300 hover:shadow-elegant hover:-translate-y-1">
                        <CardContent className="p-0">
                          {business.image_url && (
                            <div className="h-48 bg-muted rounded-t-lg overflow-hidden">
                              <img 
                                src={business.image_url} 
                                alt={business.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                            </div>
                          )}
                          
                            <div className="p-4">
                              <div className="flex items-start justify-between mb-2">
                                <h3 className="text-lg font-semibold">{business.name}</h3>
                                
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => toggleFavorite(business)}
                                  disabled={favoritingBusinesses.has(business.name)}
                                  className="p-1 hover:bg-background/80"
                                >
                                  <Star 
                                    className={`h-4 w-4 transition-colors ${
                                      favoriteBusinesses.has(business.name)
                                        ? 'fill-current text-yellow-500' 
                                        : 'text-muted-foreground hover:text-yellow-500'
                                    }`} 
                                  />
                                </Button>
                              </div>
                            
                              <div className="space-y-2">
                                <a 
                                  href={getGoogleMapsUrl(business.address)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center text-sm text-muted-foreground hover:text-primary transition-colors group"
                                >
                                  <MapPin className="mr-1 h-3 w-3 transition-transform group-hover:scale-110" />
                                  <span className="line-clamp-1 hover:underline">{business.address}</span>
                                </a>
                                
                                <div className="text-sm font-medium text-primary">
                                  {business.distance_miles?.toFixed(1)} miles away
                                </div>
                                
                                <div className="flex gap-2 mt-3">
                                  <TooltipProvider>
                                    {business.website || businessWebsites[business.place_id!] ? (
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <button
                                            onClick={() => window.open(business.website || businessWebsites[business.place_id!], '_blank')}
                                            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary bg-primary/5 hover:bg-primary/10 hover:font-semibold rounded-full shadow-soft hover:shadow-card transition-all duration-200 border border-primary/20 hover:border-primary/30"
                                          >
                                            <ExternalLink className="h-4 w-4" />
                                            Website
                                          </button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p>Opens in new tab</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    ) : business.place_id ? (
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <button
                                            onClick={() => handleGetWebsite(business)}
                                            disabled={loadingStates[business.place_id]}
                                            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary bg-primary/5 hover:bg-primary/10 hover:font-semibold rounded-full shadow-soft hover:shadow-card transition-all duration-200 border border-primary/20 hover:border-primary/30 disabled:opacity-50 disabled:cursor-not-allowed"
                                          >
                                            {loadingStates[business.place_id] ? (
                                              <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                              <ExternalLink className="h-4 w-4" />
                                            )}
                                            {loadingStates[business.place_id] ? 'Loading...' : 'Get Website'}
                                          </button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p>Opens in new tab</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    ) : null}
                                  </TooltipProvider>
                                </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-center py-12">
                  <h3 className="text-xl font-semibold mb-2">No places found</h3>
                  <p className="text-muted-foreground">
                    Try checking back later or explore other categories.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </main>

    </div>
  );
};

export default PopularCategory;