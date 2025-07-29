import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { MapPin, Coffee, Dumbbell, ShoppingCart, TreePine, Heart, Camera, Search, Star, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
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
  { name: "Restaurants", icon: Heart, searchTerm: "restaurants", color: "bg-red-500" },
  { name: "Entertainment", icon: Camera, searchTerm: "entertainment venues", color: "bg-purple-500" },
];

const themedPacks = [
  {
    title: "Just Moved Essentials",
    description: "Everything you need to get settled",
    categories: ["grocery stores", "pharmacy", "bank", "post office"],
    icon: "🏠",
  },
  {
    title: "Explore Like a Local",
    description: "Hidden gems and neighborhood favorites",
    categories: ["coffee shops", "bookstores", "farmers markets", "local shops"],
    icon: "🗺️",
  },
  {
    title: "Weekend Warriors",
    description: "Adventure and relaxation spots",
    categories: ["hiking trails", "breweries", "entertainment venues", "parks recreation"],
    icon: "🏃‍♀️",
  },
];

export default function Explore() {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [manualLocation, setManualLocation] = useState("");
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [popularPlaces, setPopularPlaces] = useState<ExploreRecommendations>({});
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [categoryResults, setCategoryResults] = useState<Business[]>([]);
  const [isLoadingCategory, setIsLoadingCategory] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();

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
              city: data[0].address?.city || data[0].address?.town || data[0].address?.village || data[0].display_name.split(',').find(part => !part.trim().match(/^\d/)) || profile.address.split(',')[1]?.trim() || profile.address.split(',')[0],
            };

            setLocation(locationData);
            await loadPopularPlaces(locationData);
            
            toast({
              title: "Welcome back!",
              description: `Showing recommendations for ${locationData.city}`,
            });
          }
        }
      } catch (error) {
        console.error('Error loading user location:', error);
      } finally {
        setIsLoadingProfile(false);
      }
    };

    loadUserLocation();
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
      
      toast({
        title: "Location detected",
        description: `Found your location${locationData.city ? ` in ${locationData.city}` : ""}`,
      });
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
        city: data[0].address?.city || data[0].address?.town || data[0].address?.village || data[0].display_name.split(',').find(part => !part.trim().match(/^\d/)) || manualLocation,
      };

      setLocation(locationData);
      await loadPopularPlaces(locationData);
      
      toast({
        title: "Location set",
        description: `Exploring ${locationData.city}`,
      });
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
      const { data, error } = await supabase.functions.invoke('generate-recommendations', {
        body: {
          exploreMode: true,
          latitude: locationData.latitude,
          longitude: locationData.longitude,
          categories: ["restaurants", "coffee shops", "parks recreation"] // Sample popular categories
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
  const handleThemedPackClick = async (pack: typeof themedPacks[0]) => {
    if (!location) {
      toast({
        title: "Location required",
        description: "Please allow location access or enter your location first",
        variant: "destructive",
      });
      return;
    }

    setSelectedCategory(pack.title);
    setIsLoadingCategory(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-recommendations', {
        body: {
          exploreMode: true,
          latitude: location.latitude,
          longitude: location.longitude,
          categories: pack.categories
        }
      });

      if (error) throw error;
      
      // Flatten results from all categories in the pack
      const allResults: Business[] = [];
      Object.values(data.recommendations || {}).forEach((businesses: Business[]) => {
        allResults.push(...businesses);
      });
      
      setCategoryResults(allResults);
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

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-24 pb-16">
        <div className="max-w-6xl mx-auto px-6">
          {/* Header Section */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Explore Nearby Trends
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              Discover popular spots and hidden gems near you
            </p>

            {/* Location Section */}
            {isLoadingProfile ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading your location...</p>
              </div>
            ) : !location ? (
              <div className="max-w-md mx-auto space-y-4">
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
                
                {user && (
                  <p className="text-sm text-muted-foreground text-center">
                    We couldn't find your saved address. Please enter your location to explore nearby places.
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <Badge variant="secondary" className="text-lg px-4 py-2">
                  <MapPin className="mr-2 h-4 w-4" />
                  {location.city}
                </Badge>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    setLocation(null);
                    setPopularPlaces({});
                    setSelectedCategory(null);
                  }}
                >
                  Change Location
                </Button>
              </div>
            )}
          </div>

          {/* Content Sections */}
          {location && (
            <>
              {/* Popular Near You */}
              {Object.keys(popularPlaces).length > 0 && (
                <section className="mb-16">
                  <h2 className="text-3xl font-bold mb-6">Popular Near You</h2>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {Object.entries(popularPlaces).map(([category, businesses]) =>
                      businesses.slice(0, 3).map((business, index) => (
                        <Card key={`${category}-${index}`} className="hover:shadow-lg transition-shadow">
                          <CardContent className="p-0">
                            {business.image_url && (
                              <img 
                                src={business.image_url} 
                                alt={business.name}
                                className="w-full h-48 object-cover rounded-t-lg"
                              />
                            )}
                            <div className="p-6">
                              <div className="flex items-start justify-between mb-2">
                                <h3 className="font-semibold text-lg">{business.name}</h3>
                                <Badge variant="secondary">{business.distance_miles} mi</Badge>
                              </div>
                              <p className="text-muted-foreground text-sm mb-3">{business.address}</p>
                              <div className="flex flex-wrap gap-2">
                                {business.features.slice(0, 2).map((feature, featureIndex) => (
                                  <Badge key={featureIndex} variant="outline" className="text-xs">
                                    {feature.includes("High Ratings") && <Star className="w-3 h-3 mr-1" />}
                                    {feature.includes("Open Now") && <Clock className="w-3 h-3 mr-1" />}
                                    {feature}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                </section>
              )}

              {/* Trending Categories */}
              <section className="mb-16">
                <h2 className="text-3xl font-bold mb-6">Trending Categories</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  {trendingCategories.map((category) => (
                    <Card 
                      key={category.name}
                      className="cursor-pointer hover:shadow-lg transition-all hover:scale-105"
                      onClick={() => handleCategoryClick(category)}
                    >
                      <CardContent className="p-6 text-center">
                        <div className={`w-12 h-12 rounded-full ${category.color} flex items-center justify-center mx-auto mb-3`}>
                          <category.icon className="h-6 w-6 text-white" />
                        </div>
                        <h3 className="font-medium text-sm">{category.name}</h3>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>

              {/* Themed Packs */}
              <section className="mb-16">
                <h2 className="text-3xl font-bold mb-6">Themed Collections</h2>
                <div className="grid md:grid-cols-3 gap-6">
                  {themedPacks.map((pack) => (
                    <Card 
                      key={pack.title}
                      className="cursor-pointer hover:shadow-lg transition-all hover:scale-105"
                      onClick={() => handleThemedPackClick(pack)}
                    >
                      <CardHeader>
                        <div className="text-center">
                          <div className="text-4xl mb-3">{pack.icon}</div>
                          <CardTitle className="text-xl">{pack.title}</CardTitle>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-muted-foreground text-center mb-4">{pack.description}</p>
                        <div className="flex flex-wrap gap-2 justify-center">
                          {pack.categories.slice(0, 3).map((category, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {category}
                            </Badge>
                          ))}
                          {pack.categories.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{pack.categories.length - 3} more
                            </Badge>
                          )}
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
                    <h2 className="text-3xl font-bold">{selectedCategory}</h2>
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
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {categoryResults.map((business, index) => (
                        <Card key={index} className="hover:shadow-lg transition-shadow">
                          <CardContent className="p-0">
                            {business.image_url && (
                              <img 
                                src={business.image_url} 
                                alt={business.name}
                                className="w-full h-48 object-cover rounded-t-lg"
                              />
                            )}
                            <div className="p-6">
                              <div className="flex items-start justify-between mb-2">
                                <h3 className="font-semibold text-lg">{business.name}</h3>
                                <Badge variant="secondary">{business.distance_miles} mi</Badge>
                              </div>
                              <p className="text-muted-foreground text-sm mb-3">{business.address}</p>
                              <div className="flex flex-wrap gap-2">
                                {business.features.slice(0, 3).map((feature, featureIndex) => (
                                  <Badge key={featureIndex} variant="outline" className="text-xs">
                                    {feature.includes("High Ratings") && <Star className="w-3 h-3 mr-1" />}
                                    {feature.includes("Open Now") && <Clock className="w-3 h-3 mr-1" />}
                                    {feature}
                                  </Badge>
                                ))}
                              </div>
                              {business.website && (
                                <Button variant="outline" size="sm" className="w-full mt-3" asChild>
                                  <a href={business.website} target="_blank" rel="noopener noreferrer">
                                    Visit Website
                                  </a>
                                </Button>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </section>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}