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
    categories: ["pediatricians", "schools", "daycares", "parks", "libraries"],
    icon: Users,
  },
];

export default function Explore() {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [manualLocation, setManualLocation] = useState("");
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [popularPlaces, setPopularPlaces] = useState<ExploreRecommendations>({});
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedThemedPack, setSelectedThemedPack] = useState<string | null>(null);
  const [categoryResults, setCategoryResults] = useState<Business[]>([]);
  const [isLoadingCategory, setIsLoadingCategory] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [favoriteBusinesses, setFavoriteBusinesses] = useState<Set<string>>(new Set());
  const [favoritingBusinesses, setFavoritingBusinesses] = useState<Set<string>>(new Set());
  
  const { user } = useAuth();
  const { batchInvoke } = useBatchRequests();

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
          .single();

        if (error || !profile?.address) {
          console.log('No profile address found, user will need to enter location manually');
          setIsLoadingProfile(false);
          return;
        }

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
            };

            setLocation(locationData);
            await loadPopularPlaces(locationData);
          }
        }
      } catch (error) {
        console.error('Error loading user location:', error);
      } finally {
        setIsLoadingProfile(false);
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
        }
      } catch (error) {
        console.log("Couldn't get city name, but location coordinates are available");
      }

      setLocation(locationData);
      await loadPopularPlaces(locationData);
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
      };

      setLocation(locationData);
      await loadPopularPlaces(locationData);
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

  // Load popular places for the location
  const loadPopularPlaces = async (locationData: LocationData) => {
    try {
      const sampleCategories = ["restaurants", "coffee shops", "parks recreation"];
      
      // First, try to get cached recommendations
      const { data: cachedData, error: cacheError } = await supabase
        .from('recommendations_cache')
        .select('recommendations, expires_at')
        .gte('expires_at', new Date().toISOString())
        .overlaps('categories', sampleCategories)
        .limit(1)
        .single();

      if (!cacheError && cachedData?.recommendations) {
        console.log('✅ Using cached data for explore popular places - NO API COST!');
        setPopularPlaces(cachedData.recommendations as any);
        return;
      }

      console.log('❌ No valid cache found, making fresh API call for explore popular places');
      
      // Only make API call if no cache found
      const data = await batchInvoke('generate-recommendations', {
        body: {
          exploreMode: true,
          latitude: locationData.latitude,
          longitude: locationData.longitude,
          categories: sampleCategories
        }
      });
      
      setPopularPlaces(data.recommendations || {});
    } catch (error) {
      console.error("Error loading popular places:", error);
      toast({
        title: "Error loading recommendations",
        description: "Please try again later",
        variant: "destructive",
      });
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

    setSelectedCategory(category.name);
    setIsLoadingCategory(true);
    
    try {
      // Check cache first for single category
      const { data: cachedData, error: cacheError } = await supabase
        .from('recommendations_cache')
        .select('recommendations, expires_at')
        .gte('expires_at', new Date().toISOString())
        .overlaps('categories', [category.searchTerm])
        .limit(1)
        .single();

      if (!cacheError && cachedData?.recommendations?.[category.searchTerm]) {
        console.log('✅ Using cached data for category:', category.searchTerm, '- NO API COST!');
        setCategoryResults(cachedData.recommendations[category.searchTerm]);
        return;
      }

      console.log('❌ No cache for category:', category.searchTerm, '- making API call');
      const data = await batchInvoke('generate-recommendations', {
        body: {
          exploreMode: true,
          latitude: location.latitude,
          longitude: location.longitude,
          categories: [category.searchTerm]
        }
      });
      
      setCategoryResults(data.recommendations?.[category.searchTerm] || []);
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

    const categoriesToSearch = specificCategory ? [specificCategory] : pack.categories;
    setSelectedCategory(specificCategory || pack.title);
    setSelectedThemedPack(specificCategory ? null : pack.title);
    setIsLoadingCategory(true);
    
    console.log('🔍 EXPLORE - Searching for categories:', categoriesToSearch, 'Selected category:', specificCategory || pack.title);
    
    try {
      // Check cache first for themed pack categories
      const { data: cachedData, error: cacheError } = await supabase
        .from('recommendations_cache')
        .select('recommendations, expires_at')
        .gte('expires_at', new Date().toISOString())
        .overlaps('categories', categoriesToSearch)
        .limit(1)
        .single();

      let data: any;
      if (!cacheError && cachedData?.recommendations) {
        console.log('✅ Using cached data for themed pack - NO API COST!');
        data = { recommendations: cachedData.recommendations };
      } else {
        console.log('❌ No cache for themed pack - making API call');
        data = await batchInvoke('generate-recommendations', {
          body: {
            exploreMode: true,
            latitude: location.latitude,
            longitude: location.longitude,
            categories: categoriesToSearch
          }
        });
      }
      
      // If searching for a specific category, show only those results
      if (specificCategory) {
        const categoryResults = data.recommendations?.[specificCategory] || [];
        setCategoryResults(categoryResults.sort((a, b) => a.distance_miles - b.distance_miles));
      } else {
        // Flatten results from all categories in the pack
        const allResults: Business[] = [];
        Object.values(data.recommendations || {}).forEach((businesses: Business[]) => {
          allResults.push(...businesses);
        });
        // Sort by distance
        setCategoryResults(allResults.sort((a, b) => a.distance_miles - b.distance_miles));
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

          {/* Location Section */}
          {!isLoadingProfile && !location ? (
            <div className="max-w-md mx-auto space-y-4">
              {user ? (
                // Authenticated users get full functionality
                <>
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
                </>
              ) : (
                // Non-authenticated users see only the quiz prompt
                <div className="text-center space-y-3 p-4 bg-muted/50 rounded-lg border">
                  <p className="text-sm font-medium">Sign up to explore your area</p>
                  <Button 
                    onClick={() => window.location.href = '/onboarding'}
                    size="sm"
                    className="mt-2 bg-gradient-hero text-white border-0 shadow-glow hover:shadow-card-hover transition-all"
                  >
                    Sign up
                  </Button>
                </div>
              )}
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
            {!user && (
              <div className="text-center mt-6">
                <p className="text-sm text-muted-foreground mb-3">
                  Sign up to explore these collections and discover local businesses
                </p>
                <Button 
                  onClick={() => window.location.href = '/onboarding'}
                  className="bg-gradient-hero text-white border-0 shadow-glow hover:shadow-card-hover transition-all"
                >
                  Get Started
                </Button>
              </div>
            )}
          </section>

          {/* Content Sections for authenticated users with location */}
          {location && user && (
            <>


              {/* Category Results */}
              {selectedCategory && (
                <section>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl sm:text-3xl font-bold">{selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1)}</h2>
                    <Button variant="outline" onClick={() => setSelectedCategory(null)}>
                      Clear
                    </Button>
                  </div>
                  
                  {isLoadingCategory ? (
                    <div className="text-center py-12">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                      <p className="mt-4 text-muted-foreground">Loading recommendations...</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                      {categoryResults.map((business, index) => (
                        <Card key={index} className="group hover:shadow-card-hover transition-all duration-300 border-0 shadow-card bg-gradient-card rounded-2xl overflow-hidden">
                           {/* Business Image */}
                           <div className="aspect-video overflow-hidden bg-muted">
                             <ImageWithFallback
                               src={business.image_url || ''}
                               alt={business.name}
                               businessName={business.name}
                               category={selectedThemedPack || selectedCategory || ''}
                               className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                             />
                          </div>
                          
                          <CardHeader className="pb-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <a 
                                  href={business.website ? 
                                    (business.website.startsWith('http') ? business.website : `https://${business.website}`) : 
                                    getGoogleMapsDirectionsUrl(business.address, business.name)
                                  }
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xl font-semibold text-foreground hover:text-primary hover:font-bold transition-all hover:underline"
                                >
                                  {business.name}
                                </a>
                                <div className="flex items-center gap-2 mt-1">
                                  {business.distance_miles && (
                                    <>
                                      <MapPin className="h-3 w-3 text-muted-foreground" />
                                      <span className="text-xs text-muted-foreground font-medium">
                                        {business.distance_miles} miles away
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => toggleFavorite(business, selectedCategory || 'essentials')}
                                disabled={favoritingBusinesses.has(business.name)}
                                className="h-10 w-10 p-0 hover:bg-primary/10 min-h-[44px] min-w-[44px]"
                              >
                                <Star 
                                  className="h-5 w-5" 
                                  fill={favoriteBusinesses.has(business.name) ? "currentColor" : "none"}
                                />
                              </Button>
                            </div>
                          </CardHeader>
                          
                          <CardContent className="space-y-4">
                            {business.address && (
                              <a 
                                href={getGoogleMapsDirectionsUrl(business.address, business.name)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-start gap-2 text-sm text-primary hover:text-primary/80 transition-colors group cursor-pointer"
                              >
                                <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0 group-hover:scale-110 transition-transform" />
                                <span className="underline-offset-2 hover:underline hover:text-blue-600 transition-colors">
                                  {business.address}
                                </span>
                              </a>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </section>
              )}
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
    </div>
  );
}