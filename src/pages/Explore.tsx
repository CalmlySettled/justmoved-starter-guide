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
  
  const { user } = useAuth();

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

    const loadFavorites = () => {
      try {
        const storedFavorites = localStorage.getItem('favorites');
        if (storedFavorites) {
          const favorites: any[] = JSON.parse(storedFavorites);
          const favoriteNames = new Set(favorites.map(fav => fav.business_name));
          setFavoriteBusinesses(favoriteNames);
        } else {
          setFavoriteBusinesses(new Set());
        }
      } catch (error) {
        console.error('Error loading favorites:', error);
      }
    };

    const handleFavoritesUpdate = () => {
      console.log('🔥 EXPLORE - Received favorites update event');
      loadFavorites();
    };

    loadUserLocation();
    loadFavorites();
    
    // Listen for favorites updates from dropdown
    window.addEventListener('favoritesUpdated', handleFavoritesUpdate);
    
    return () => {
      window.removeEventListener('favoritesUpdated', handleFavoritesUpdate);
    };
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
      const { data, error } = await supabase.functions.invoke('generate-recommendations', {
        body: {
          exploreMode: true,
          latitude: locationData.latitude,
          longitude: locationData.longitude,
          categories: sampleCategories
        }
      });

      if (error) throw error;
      
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
      const { data, error } = await supabase.functions.invoke('generate-recommendations', {
        body: {
          exploreMode: true,
          latitude: location.latitude,
          longitude: location.longitude,
          categories: [category.searchTerm]
        }
      });

      if (error) throw error;
      
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
        const response = await supabase.functions.invoke('generate-recommendations', {
          body: {
            exploreMode: true,
            latitude: location.latitude,
            longitude: location.longitude,
            categories: categoriesToSearch
          }
        });

        if (response.error) throw response.error;
        data = response.data;
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

  const toggleFavorite = (business: Business, category: string) => {
    console.log('🌟 EXPLORE - Attempting to favorite business:', business.name, 'Category:', category);
    try {
      const storedFavorites = localStorage.getItem('favorites');
      const favorites: any[] = storedFavorites ? JSON.parse(storedFavorites) : [];
      
      const businessKey = business.name;
      const existingIndex = favorites.findIndex(fav => fav.business_name === businessKey);
      
      if (existingIndex >= 0) {
        // Remove from favorites
        favorites.splice(existingIndex, 1);
        setFavoriteBusinesses(prev => {
          const newSet = new Set(prev);
          newSet.delete(businessKey);
          return newSet;
        });
        toast({
          title: "Removed from favorites",
          description: `${business.name} has been removed from your favorites.`,
        });
      } else {
        // Add to favorites
        const favoriteData = {
          business_name: business.name,
          business_address: business.address,
          business_description: business.description,
          business_phone: business.phone,
          business_website: business.website,
          business_image: business.image_url,
          business_features: business.features || [],
          category: category,
          distance_miles: business.distance_miles,
          favorited_at: new Date().toISOString()
        };
        
        favorites.push(favoriteData);
        console.log('💾 EXPLORE - Adding to favorites array, new length:', favorites.length);
        
        setFavoriteBusinesses(prev => {
          const newSet = new Set(prev).add(businessKey);
          console.log('⭐ EXPLORE - Updated favoriteBusinesses set, now has:', Array.from(newSet));
          return newSet;
        });
        
        toast({
          title: "Added to favorites",
          description: `${business.name} has been added to your favorites.`,
        });
        
        // Additional toast with navigation hint
        setTimeout(() => {
          toast({
            title: "Find all your favorites in the Dashboard!",
            description: "Visit the Dashboard to see all your saved places",
            duration: 4000
          });
        }, 1000);
      }
      
      localStorage.setItem('favorites', JSON.stringify(favorites));
      
      // Trigger manual event for same-window updates
      window.dispatchEvent(new CustomEvent('favoritesUpdated'));
    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast({
        title: "Error",
        description: "Failed to update favorite",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-page">
      <Header />
      
      <main className="pt-24 pb-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">

          {/* Location Section */}
          {!location ? (
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
                // Non-authenticated users see disabled inputs with sign up prompt
                <>
                  <Button 
                    disabled
                    className="w-full opacity-50 cursor-not-allowed"
                    size="lg"
                  >
                    <MapPin className="mr-2 h-5 w-5" />
                    Use my current location
                  </Button>
                  
                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter city or zip code"
                      disabled
                      className="opacity-50"
                    />
                    <Button disabled className="opacity-50">
                      <Search className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className="text-center space-y-3 p-4 bg-muted/50 rounded-lg border">
                    <p className="text-sm font-medium">Take the quiz to explore your area</p>
                    <p className="text-xs text-muted-foreground">
                      Complete our quick quiz to find nearby essentials and save your favorites
                    </p>
                    <Button 
                      onClick={() => window.location.href = '/onboarding'}
                      size="sm"
                      className="mt-2"
                    >
                      Take the Quiz
                    </Button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-4"></div>
          )}

          {/* Content Sections */}
          {location && (
            <>

              {/* Just Moved Collections */}
              <section className="mb-16 bg-gradient-section rounded-2xl p-8 shadow-soft">
                <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-6 text-center">Just Moved Collections</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8">
                  {themedPacks.map((pack) => (
                    <Card 
                      key={pack.title}
                      className="cursor-pointer bg-gradient-card shadow-card hover:shadow-card-hover transition-all duration-300 hover:scale-105 border-0"
                      onClick={() => handleThemedPackClick(pack)}
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
                               className="text-xs cursor-pointer hover:bg-muted transition-colors"
                               onClick={(e) => {
                                 e.stopPropagation();
                                 handleThemedPackClick(pack, category);
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