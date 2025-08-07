import { toast } from "@/utils/notificationRemover";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ImageWithFallback } from "@/components/ui/image-with-fallback";
import { MapPin, Coffee, Dumbbell, ShoppingCart, TreePine, Star, Camera, Search, Clock, Home, Zap, Link, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

import { Header } from "@/components/Header";
import { useAuth } from "@/hooks/useAuth";
import { useBatchRequests } from "@/hooks/useBatchRequests";
import { useRequestCache } from "@/hooks/useRequestCache";
import { CategoryResultsModal } from "@/components/CategoryResultsModal";
import { AddressCaptureModal } from "@/components/AddressCaptureModal";
import { isMedicalCategory, getUSNewsStatePath, getUSNewsHealthURL } from "@/lib/stateMapping";

interface LocationData {
  latitude: number;
  longitude: number;
  city?: string;
  state?: string;
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
}

interface ExploreRecommendations {
  [category: string]: Business[];
}

const trendingCategories = [
  { name: "Coffee Shops", icon: Coffee, searchTerm: "coffee shops", color: "bg-amber-500" },
  { name: "Fitness", icon: Dumbbell, searchTerm: "fitness gyms", color: "bg-blue-500" },
  { name: "Grocery", icon: ShoppingCart, searchTerm: "grocery stores", color: "bg-green-500" },
  { name: "Parks", icon: TreePine, searchTerm: "parks recreation", color: "bg-emerald-500" },
  { name: "Restaurants", icon: Star, searchTerm: "restaurants", color: "bg-red-500" },
  { name: "Entertainment", icon: Camera, searchTerm: "entertainment venues", color: "bg-purple-500" },
];

const themedPacks = [
  {
    title: "First 48 Hours",
    description: "Immediate essentials for your first days in a new city",
    categories: ["grocery stores", "pharmacies", "gas stations", "urgent care"],
    icon: Clock,
  },
  {
    title: "Setting Up Home",
    description: "Everything you need to make your new place feel like home",
    categories: ["hardware stores", "furniture stores", "home improvement", "cleaning services"],
    icon: Home,
  },
  {
    title: "Getting Connected",
    description: "Essential services to get your life organized",
    categories: ["banks", "post offices", "internet providers"],
    icon: Zap,
  },
  {
    title: "Family Essentials",
    description: "Important services for families settling in",
    categories: ["doctors", "schools", "daycares", "parks", "libraries"],
    icon: Users,
  },
];

export default function Explore() {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [manualLocation, setManualLocation] = useState("");
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedThemedPack, setSelectedThemedPack] = useState<string | null>(null);
  const [categoryResults, setCategoryResults] = useState<Business[]>([]);
  const [isLoadingCategory, setIsLoadingCategory] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isProcessingSavedAddress, setIsProcessingSavedAddress] = useState(false);
  const [favoriteBusinesses, setFavoriteBusinesses] = useState<Set<string>>(new Set());
  const [favoritingBusinesses, setFavoritingBusinesses] = useState<Set<string>>(new Set());
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [sourceContext, setSourceContext] = useState<string | null>(null);
  
  const { user } = useAuth();
  const { batchInvoke } = useBatchRequests();
  const { getCached, setCached, checkBackendCache } = useRequestCache();

  // Helper function to create Google Maps search URL
  const getGoogleMapsDirectionsUrl = (address: string, businessName: string) => {
    const query = encodeURIComponent(`${businessName} ${address}`);
    return `https://www.google.com/maps/search/?api=1&query=${query}`;
  };

  // Load user's profile address on mount
  useEffect(() => {
    const loadUserLocation = async () => {
      if (!user) {
        setIsLoadingProfile(false);
        return;
      }

      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('address')
          .eq('user_id', user.id)
          .maybeSingle();

        console.log('Profile query result:', { profile, error, hasAddress: !!profile?.address });

        // Check if this is an OAuth redirect first
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('oauth') === 'true') {
          console.log('OAuth redirect detected, profile:', profile);
          // Always show address modal for OAuth redirects when user has no address
          if (!profile?.address) {
            console.log('Showing address modal for OAuth user without address');
            setShowAddressModal(true);
            setSourceContext("oauth");
            setIsLoadingProfile(false);
            return;
          } else {
            console.log('OAuth user already has address, will geocode without modal:', profile.address);
          }
        }

        if (error) {
          console.log('Profile query error:', error);
          // For OAuth users without a profile, show the address modal
          const isOAuthRedirect = urlParams.get('oauth') === 'true';
          if (isOAuthRedirect) {
            console.log('OAuth user has no profile yet, showing address modal');
            setShowAddressModal(true);
            setSourceContext("oauth");
          }
          setIsLoadingProfile(false);
          return;
        }

        if (!profile?.address) {
          console.log('No address found in profile, not showing modal for non-OAuth users');
          setIsLoadingProfile(false);
          return;
        }

        // Immediately set processing state to prevent address input flash
        setIsProcessingSavedAddress(true);
        console.log('Starting geocoding for saved address:', profile.address);
        
        // Geocode the stored address to get coordinates
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
            const locationData: LocationData = {
              latitude: parseFloat(data[0].lat),
              longitude: parseFloat(data[0].lon),
              city: data[0].address?.city || data[0].address?.town || data[0].address?.village || data[0].display_name.split(',')[1]?.trim() || profile.address.split(',')[0],
              state: data[0].address?.state || data[0].address?.['ISO3166-2-lvl4']?.split('-')[1],
            };

            setLocation(locationData);
          }
        }
        
        // Only set loading to false after complete geocoding process
        console.log('Geocoding completed, setting loading to false');
        setIsLoadingProfile(false);
        setIsProcessingSavedAddress(false);
      } catch (error) {
        console.error('Error loading user location:', error);
        setIsLoadingProfile(false);
        setIsProcessingSavedAddress(false);
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

    loadUserLocation();
    loadFavorites();
  }, [user]);

  // Get user's current location
  const getCurrentLocation = async () => {
    setIsLoadingLocation(true);
    try {
      if (!navigator.geolocation) {
        throw new Error("Geolocation is not supported by this browser");
      }

      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000, // 5 minutes
        });
      });

      const locationData: LocationData = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };

      // Try to get city name from coordinates
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${locationData.latitude}&lon=${locationData.longitude}&zoom=10&addressdetails=1`,
          {
            headers: {
              'User-Agent': 'CalmlySettled/1.0'
            }
          }
        );
        
        if (response.ok) {
          const data = await response.json();
          locationData.city = data.address?.city || data.address?.town || data.address?.village || "Your area";
          locationData.state = data.address?.state || data.address?.['ISO3166-2-lvl4']?.split('-')[1];
        }
      } catch (error) {
        console.log("Couldn't get city name, but location coordinates are available");
      }

      setLocation(locationData);
    } catch (error) {
      console.error("Error getting location:", error);
      toast({
        title: "Location access denied",
        description: "Please enter your city or zip code manually",
        variant: "destructive",
      });
    } finally {
      setIsLoadingLocation(false);
    }
  };

  // Handle manual location input
  const handleManualLocation = async () => {
    if (!manualLocation.trim()) return;
    
    setIsLoadingLocation(true);
    try {
      // Geocode the manual location
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=1&q=${encodeURIComponent(manualLocation)}&countrycodes=us`,
        {
          headers: {
            'User-Agent': 'CalmlySettled/1.0'
          }
        }
      );

      if (!response.ok) {
        throw new Error("Geocoding service unavailable");
      }

      const data = await response.json();
      if (data.length === 0) {
        throw new Error("Location not found");
      }

      const locationData: LocationData = {
        latitude: parseFloat(data[0].lat),
        longitude: parseFloat(data[0].lon),
        city: data[0].address?.city || data[0].address?.town || data[0].address?.village || data[0].display_name.split(',')[1]?.trim() || manualLocation,
        state: data[0].address?.state || data[0].address?.['ISO3166-2-lvl4']?.split('-')[1],
      };

      setLocation(locationData);
    } catch (error) {
      console.error("Error geocoding location:", error);
      toast({
        title: "Location not found",
        description: "Please try a different city or zip code",
        variant: "destructive",
      });
    } finally {
      setIsLoadingLocation(false);
    }
  };


  // Handle category selection
  const handleCategoryClick = async (category: { searchTerm: string; name: string }) => {
    if (!location) {
      toast({
        title: "Location required",
        description: "Please allow location access or enter your location first",
        variant: "destructive",
      });
      return;
    }

    // Check if this is a medical category and redirect to US News Health
    if (isMedicalCategory(category.searchTerm)) {
      const statePath = getUSNewsStatePath(location);
      if (statePath) {
        const usNewsURL = getUSNewsHealthURL(statePath);
        window.open(usNewsURL, '_blank');
        toast({
          title: "Redirecting to US News Health",
          description: `Opening ${location.city} medical directory`,
        });
        return;
      } else {
        // Fallback to general US News doctor finder
        window.open('https://health.usnews.com/doctors', '_blank');
        toast({
          title: "Redirecting to US News Health",
          description: "Opening general medical directory",
        });
        return;
      }
    }

    setSelectedCategory(category.name);
    setIsLoadingCategory(true);
    setIsModalOpen(true);
    
    try {
      // CACHE HIERARCHY: L1 Frontend -> L2 Backend -> L3 API Call
      
      // L1: Check frontend cache first
      const cacheKey = {
        type: 'category',
        latitude: location.latitude,
        longitude: location.longitude,
        category: category.searchTerm
      };
      
      console.log(`🔍 L1 FRONTEND CACHE LOOKUP:`, {
        category: category.name,
        cacheKey,
        location: { lat: location.latitude, lng: location.longitude }
      });
      
      let cachedResults = getCached('category_results', cacheKey);
      
      // L1 Hit: Use frontend cached data
      if (cachedResults && Array.isArray(cachedResults) && cachedResults.length > 0) {
        console.log('💰 L1 FRONTEND CACHE HIT - NO API COST!', {
          resultCount: cachedResults.length,
          category: category.name
        });
        setCategoryResults(cachedResults);
        return;
      }

      // L1 Miss: Check backend cache via edge function
      console.log(`❌ L1 FRONTEND CACHE MISS - Checking L2 backend cache`);
      
      const backendCacheResults = await checkBackendCache(
        { lat: location.latitude, lng: location.longitude },
        [category.searchTerm]
      );

      // L2 Hit: Use backend cached data and store in frontend cache
      if (backendCacheResults && backendCacheResults[category.searchTerm]?.length > 0) {
        console.log('💰 L2 BACKEND CACHE HIT - NO API COST!', {
          resultCount: backendCacheResults[category.searchTerm].length,
          category: category.name
        });
        const results = backendCacheResults[category.searchTerm];
        setCategoryResults(results);
        // Store in L1 frontend cache for faster future access
        setCached('category_results', cacheKey, results, 1800000); // Cache for 30 min
        return;
      }

      // L1 & L2 Miss: Make API call
      console.log(`🌐 L3 API CALL - Cache hierarchy exhausted`, {
        category: category.searchTerm,
        coordinates: { lat: location.latitude, lng: location.longitude }
      });

      const data = await batchInvoke('generate-recommendations', {
        body: {
          latitude: location.latitude,
          longitude: location.longitude,
          categories: [category.searchTerm],
          exploreMode: true
        }
      });
      
      const results = data.recommendations?.[category.searchTerm] || [];
      setCategoryResults(results);
      
      // Store in L1 frontend cache (L2 backend cache is handled by the edge function)
      if (results.length > 0) {
        setCached('category_results', cacheKey, results, 1800000); // Cache for 30 min
        console.log(`💾 L1 FRONTEND CACHED after API call:`, {
          resultCount: results.length,
          category: category.name
        });
      }
    } catch (error) {
      console.error("Error loading category results:", error);
      toast({
        title: "Error loading results",
        description: "Please try again later",
        variant: "destructive",
      });
    } finally {
      setIsLoadingCategory(false);
    }
  };

  // Handle themed pack selection  
  const handleThemedPackClick = async (pack: typeof themedPacks[0], specificCategory?: string) => {
    if (!location) {
      toast({
        title: "Location required",
        description: "Please allow location access or enter your location first",
        variant: "destructive",
      });
      return;
    }

    // Check if this is a medical category and redirect to US News Health
    if (specificCategory && isMedicalCategory(specificCategory)) {
      const statePath = getUSNewsStatePath(location);
      if (statePath) {
        const usNewsURL = getUSNewsHealthURL(statePath);
        window.open(usNewsURL, '_blank');
        toast({
          title: "Redirecting to US News Health",
          description: `Opening ${location.city} medical directory`,
        });
        return;
      } else {
        // Fallback to general US News doctor finder
        window.open('https://health.usnews.com/doctors', '_blank');
        toast({
          title: "Redirecting to US News Health",
          description: "Opening general medical directory",
        });
        return;
      }
    }

    // CRITICAL FIX: Don't search all categories if user clicked specific one
    const categoriesToSearch = specificCategory ? [specificCategory] : pack.categories.slice(0, 3); // Limit to 3 categories max
    setSelectedCategory(specificCategory || pack.title);
    setSelectedThemedPack(specificCategory ? null : pack.title);
    setIsLoadingCategory(true);
    setIsModalOpen(true);
    
    console.log('🔍 EXPLORE - Searching for categories:', categoriesToSearch, 'Selected category:', specificCategory || pack.title);
    
    try {
      // CACHE HIERARCHY: L1 Frontend -> L2 Backend -> L3 API Call
      
      // L1: Check frontend cache first
      const cacheKey = {
        type: 'themed_pack',
        latitude: location.latitude,
        longitude: location.longitude,
        categories: categoriesToSearch,
        specificCategory
      };
      
      console.log(`🔍 L1 FRONTEND CACHE LOOKUP (Themed Pack):`, {
        pack: pack.title,
        categories: categoriesToSearch,
        specificCategory,
        cacheKey
      });
      
      let cachedResults = getCached('themed_pack_results', cacheKey);
      
      // L1 Hit: Use frontend cached data
      if (cachedResults) {
        console.log('💰 L1 FRONTEND CACHE HIT - NO API COST!', {
          resultCount: cachedResults.length,
          pack: pack.title
        });
        setCategoryResults(cachedResults);
        return;
      }

      // L1 Miss: Check backend cache via edge function
      console.log(`❌ L1 FRONTEND CACHE MISS - Checking L2 backend cache (Themed Pack)`);
      
      const backendCacheResults = await checkBackendCache(
        { lat: location.latitude, lng: location.longitude },
        categoriesToSearch
      );

      // L2 Hit: Use backend cached data and store in frontend cache
      if (backendCacheResults) {
        let results: Business[] = [];
        let hasResults = false;
        
        // If searching for a specific category, show only those results
        if (specificCategory && backendCacheResults[specificCategory]?.length > 0) {
          results = backendCacheResults[specificCategory];
          hasResults = true;
        } else if (!specificCategory) {
          // Flatten results from all available categories in the pack
          Object.values(backendCacheResults).forEach((businesses: Business[]) => {
            if (businesses?.length > 0) {
              results.push(...businesses);
              hasResults = true;
            }
          });
        }
        
        if (hasResults) {
          console.log('💰 L2 BACKEND CACHE HIT - NO API COST!', {
            resultCount: results.length,
            pack: pack.title,
            foundCategories: Object.keys(backendCacheResults)
          });
          
          // Sort by distance
          const sortedResults = results.sort((a, b) => a.distance_miles - b.distance_miles);
          setCategoryResults(sortedResults);
          // Store in L1 frontend cache for faster future access
          setCached('themed_pack_results', cacheKey, sortedResults, 1800000); // Cache for 30 min
          return;
        }
      }

      // L1 & L2 Miss: Make API call
      console.log(`🌐 L3 API CALL - Cache hierarchy exhausted (Themed Pack)`, {
        pack: pack.title,
        categories: categoriesToSearch,
        coordinates: { lat: location.latitude, lng: location.longitude }
      });

      const data = await batchInvoke('generate-recommendations', {
        body: {
          exploreMode: true,
          latitude: location.latitude,
          longitude: location.longitude,
          categories: categoriesToSearch
        }
      });
      
      let results: Business[] = [];
      
      // If searching for a specific category, show only those results
      if (specificCategory) {
        results = data.recommendations?.[specificCategory] || [];
      } else {
        // Flatten results from limited categories in the pack
        Object.values(data.recommendations || {}).forEach((businesses: Business[]) => {
          results.push(...businesses);
        });
      }
      
      // Sort by distance
      const sortedResults = results.sort((a, b) => a.distance_miles - b.distance_miles);
      setCategoryResults(sortedResults);
      
      // Store in L1 frontend cache (L2 backend cache is handled by the edge function)
      if (sortedResults.length > 0) {
        setCached('themed_pack_results', cacheKey, sortedResults, 1800000); // Cache for 30 min
        console.log(`💾 L1 FRONTEND CACHED after API call (Themed Pack):`, {
          resultCount: sortedResults.length,
          pack: pack.title
        });
      }
    } catch (error) {
      console.error("Error loading themed pack results:", error);
      toast({
        title: "Error loading results",
        description: "Please try again later",
        variant: "destructive",
      });
    } finally {
      setIsLoadingCategory(false);
    }
  };

  const toggleFavorite = async (business: Business, category: string) => {
    if (!user) {
      toast({
        title: "Please log in",
        description: "You need to be logged in to favorite businesses.",
        variant: "destructive"
      });
      return;
    }

    const businessKey = business.name;
    setFavoritingBusinesses(prev => new Set(prev).add(businessKey));

    try {
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

        toast({
          title: newFavoriteStatus ? "Added to favorites" : "Removed from favorites",
          description: `${business.name} has been ${newFavoriteStatus ? 'added to' : 'removed from'} your favorites.`,
        });
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
            is_favorite: true
          });

        if (insertError) {
          throw insertError;
        }

        // Update local state
        setFavoriteBusinesses(prev => new Set(prev).add(businessKey));

        toast({
          title: "Added to favorites",
          description: `${business.name} has been saved and added to your favorites.`,
        });
      }
    } catch (error: any) {
      console.error('Error favoriting business:', error);
      toast({
        title: "Error updating favorite",
        description: "We couldn't update your favorite. Please try again.",
        variant: "destructive"
      });
    } finally {
      setFavoritingBusinesses(prev => {
        const newSet = new Set(prev);
        newSet.delete(businessKey);
        return newSet;
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-page">
      <Header />
      
      <main className="pt-24 pb-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">

          {/* Sign up CTA for unauthenticated users - moved to top */}
          {!user && (
            <div className="text-center mb-8 p-4 bg-gradient-section rounded-lg shadow-soft">
              <p className="text-sm text-muted-foreground mb-3">
                Get started to find your nearby essentials
              </p>
              <Button 
                onClick={() => window.location.href = '/auth?mode=signup&redirect=explore'}
                size="sm"
                className="bg-gradient-hero text-white border-0 shadow-glow hover:shadow-card-hover transition-all"
              >
                Get Started
              </Button>
            </div>
          )}

          {/* Location Section */}
          {!isLoadingProfile && !isProcessingSavedAddress && !location && user ? (
            <div className="max-w-md mx-auto space-y-4 mb-16">
              <Button 
                onClick={getCurrentLocation}
                disabled={isLoadingLocation}
                className="w-full"
                size="lg"
              >
                <MapPin className="mr-2 h-5 w-5" />
                {isLoadingLocation ? "Getting location..." : "Use my current location"}
              </Button>
              
              <div className="flex gap-2">
                <Input
                  placeholder="Enter city or zip code"
                  value={manualLocation}
                  onChange={(e) => setManualLocation(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleManualLocation()}
                />
                <Button 
                  onClick={handleManualLocation}
                  disabled={isLoadingLocation || !manualLocation.trim()}
                >
                  <Search className="h-4 w-4" />
                </Button>
              </div>
              
              <p className="text-sm text-muted-foreground text-center">
                We couldn't find your saved address. Please enter your location to explore nearby places.
              </p>
            </div>
          ) : isLoadingProfile && user ? (
            <div className="flex justify-center items-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="space-y-4"></div>
          )}

          {/* Just Moved Collections - Show for all users */}
          <section className="mb-16 bg-gradient-section rounded-2xl p-8 shadow-soft">
            <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-6 text-center">Just Moved Collections</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8">
              {themedPacks.map((pack) => (
                <Card 
                  key={pack.title}
                  className={`bg-gradient-card shadow-card transition-all duration-300 border-0 ${
                    user 
                      ? "cursor-pointer hover:shadow-card-hover hover:scale-105" 
                      : "opacity-75 cursor-not-allowed"
                  }`}
                  onClick={() => {
                    if (user) {
                      handleThemedPackClick(pack);
                    } else {
                      window.location.href = '/onboarding';
                    }
                  }}
                >
                  <CardHeader>
                    <div className="text-center">
                      <div className="w-16 h-16 mx-auto mb-4 bg-gradient-hero rounded-2xl flex items-center justify-center shadow-glow">
                        <pack.icon className="h-8 w-8 text-white" />
                      </div>
                      <CardTitle className="text-xl">{pack.title}</CardTitle>
                    </div>
                  </CardHeader>
                   <CardContent>
                     <p className="text-muted-foreground text-center mb-4">{pack.description}</p>
                     <div className="flex flex-wrap gap-2 justify-center">
                       {pack.categories.map((category, index) => (
                         <Badge 
                           key={index} 
                           variant="outline" 
                           className={`text-xs transition-colors ${
                             user 
                               ? "cursor-pointer hover:bg-muted" 
                               : "cursor-not-allowed"
                           }`}
                           onClick={(e) => {
                             e.stopPropagation();
                             if (user) {
                               handleThemedPackClick(pack, category);
                             } else {
                               window.location.href = '/onboarding';
                             }
                           }}
                         >
                           {category.charAt(0).toUpperCase() + category.slice(1)}
                         </Badge>
                       ))}
                     </div>
                   </CardContent>
                </Card>
              ))}
            </div>
          </section>

          {/* Content Sections for authenticated users with location */}
          {location && user && (
            <>


              {/* Category Results Modal */}
              <CategoryResultsModal
                isOpen={isModalOpen}
                onClose={() => {
                  setIsModalOpen(false);
                  setSelectedCategory(null);
                  setSelectedThemedPack(null);
                }}
                categoryName={selectedCategory || ''}
                businesses={categoryResults}
                isLoading={isLoadingCategory}
                favoriteBusinesses={favoriteBusinesses}
                favoritingBusinesses={favoritingBusinesses}
                onToggleFavorite={toggleFavorite}
              />
            </>
          )}
          
          {/* Location Display - Moved to bottom */}
          {location && (
            <div className="flex items-center justify-center gap-2 mt-16 pt-8 border-t border-border/20">
              <Badge variant="secondary" className="text-lg px-4 py-2 bg-gradient-hero text-white border-0 shadow-glow">
                <MapPin className="mr-2 h-4 w-4" />
                {location.city}
              </Badge>
            </div>
          )}
        </div>
      </main>
      
      <AddressCaptureModal
        isOpen={showAddressModal}
        onClose={() => setShowAddressModal(false)}
        onComplete={() => {
          setShowAddressModal(false);
          // Clear OAuth params from URL
          const newUrl = window.location.pathname;
          window.history.replaceState({}, '', newUrl);
          // Reload the component to fetch user profile with new address
          window.location.reload();
        }}
        sourceContext={sourceContext}
      />
    </div>
  );
}