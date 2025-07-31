import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, Phone, Star, ExternalLink, ArrowLeft, Heart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

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
}

const trendingCategories = [
  { 
    name: "Coffee & Cafes", 
    icon: "☕", 
    searchTerms: ["coffee shop", "cafe", "specialty coffee"],
    color: "bg-amber-500",
    description: "Discover the local coffee culture"
  },
  { 
    name: "Nightlife", 
    icon: "🍸", 
    searchTerms: ["bar", "cocktail lounge", "nightclub"],
    color: "bg-purple-500",
    description: "Where the locals go after dark"
  },
  { 
    name: "Food Trucks", 
    icon: "🚚", 
    searchTerms: ["food truck", "mobile food", "street food"],
    color: "bg-orange-500",
    description: "Mobile flavors around town"
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
  const [location, setLocation] = useState<LocationData | null>(null);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [favoriteBusinesses, setFavoriteBusinesses] = useState<Set<string>>(new Set());

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

    loadLocation();
    loadFavorites();
  }, [user]);

  useEffect(() => {
    if (location && categoryConfig) {
      fetchCategoryPlaces();
    }
  }, [location, categoryConfig]);

  const fetchCategoryPlaces = async () => {
    if (!location || !categoryConfig) return;

    setLoading(true);

    try {
      const searchTerms = categoryConfig.searchTerms;
      
      const { data, error } = await supabase.functions.invoke('generate-recommendations', {
        body: {
          exploreMode: true,
          latitude: location.latitude,
          longitude: location.longitude,
          categories: searchTerms
        }
      });

      if (error) throw error;

      if (data?.recommendations) {
        // Flatten results from all search terms
        const allResults: Business[] = [];
        Object.values(data.recommendations).forEach((businesses: Business[]) => {
          allResults.push(...businesses);
        });
        
        // Sort by distance and take top results
        const sortedResults = allResults
          .sort((a, b) => (a.distance_miles || 0) - (b.distance_miles || 0))
          .slice(0, 12); // Limit to 12 results

        setBusinesses(sortedResults);
        toast.success(`Found ${sortedResults.length} popular places`);
      }
    } catch (error) {
      console.error('Error fetching category places:', error);
      toast.error('Failed to load places. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getGoogleMapsUrl = (address: string) => {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  };

  const toggleFavorite = (business: Business) => {
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
        toast.success("Removed from favorites");
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
          category: 'name' in categoryConfig ? categoryConfig.name : categoryConfig.title,
          distance_miles: business.distance_miles,
          favorited_at: new Date().toISOString()
        };
        
        favorites.push(favoriteData);
        setFavoriteBusinesses(prev => new Set(prev).add(businessKey));
        toast.success("Added to favorites");
        
        // Additional toast with navigation hint
        setTimeout(() => {
          toast.success("Find all your favorites in the Dashboard!", {
            duration: 4000
          });
        }, 1000);
      }
      
      localStorage.setItem('favorites', JSON.stringify(favorites));
      
      // Trigger manual event for same-window updates
      window.dispatchEvent(new CustomEvent('favoritesUpdated'));
    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast.error("Failed to update favorites");
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
      
      <main className="pt-24 pb-16">
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
              <div className="flex items-center justify-center gap-4 mb-4">
                {'icon' in categoryConfig && (
                  <div className={`w-16 h-16 rounded-full ${trendingCategories.find(cat => cat.name === categoryConfig.name)?.color || 'bg-primary'} flex items-center justify-center text-2xl`}>
                    {categoryConfig.icon}
                  </div>
                )}
                <h1 className="text-4xl md:text-5xl font-bold">
                  {'name' in categoryConfig ? categoryConfig.name : categoryConfig.title}
                </h1>
              </div>
              <p className="text-xl text-muted-foreground mb-8">
                {categoryConfig.description}
              </p>

              {/* Location Display */}
              {location && (
                <div className="mb-8">
                  <Badge variant="secondary" className="text-lg px-4 py-2 bg-gradient-hero text-white border-0 shadow-glow">
                    <MapPin className="mr-2 h-4 w-4" />
                    {location.city}
                  </Badge>
                </div>
              )}
            </div>
          </div>

          {/* Results Section */}
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
                            {business.website ? (
                              <a 
                                href={business.website}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-lg font-semibold hover:text-primary transition-colors flex items-center gap-1 group/link"
                              >
                                {business.name}
                                <ExternalLink className="h-3 w-3 opacity-0 group-hover/link:opacity-100 transition-opacity" />
                              </a>
                            ) : (
                              <h3 className="text-lg font-semibold">{business.name}</h3>
                            )}
                            
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleFavorite(business)}
                              className="p-1 hover:bg-background/80"
                            >
                              <Heart 
                                className={`h-4 w-4 transition-colors ${
                                  favoriteBusinesses.has(business.name)
                                    ? 'fill-red-500 text-red-500' 
                                    : 'text-muted-foreground hover:text-red-500'
                                }`} 
                              />
                            </Button>
                          </div>
                        
                          <div className="space-y-2">
                            <div className="flex items-center text-sm text-muted-foreground">
                              <MapPin className="mr-1 h-3 w-3" />
                              <span className="line-clamp-1">{business.address}</span>
                              <span className="ml-auto text-xs">
                                {business.distance_miles?.toFixed(1)} mi
                              </span>
                            </div>
                            
                            {business.phone && (
                              <div className="flex items-center text-sm text-muted-foreground">
                                <Phone className="mr-1 h-3 w-3" />
                                <a 
                                  href={`tel:${business.phone}`}
                                  className="hover:text-primary transition-colors"
                                >
                                  {business.phone}
                                </a>
                              </div>
                            )}
                            
                            {business.rating && (
                              <div className="flex items-center text-sm">
                                <Star className="mr-1 h-3 w-3 fill-yellow-400 text-yellow-400" />
                                <span>{business.rating.toFixed(1)}</span>
                              </div>
                            )}
                          </div>
                        
                        <div className="mt-4 flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex-1"
                            onClick={() => window.open(getGoogleMapsUrl(business.address), '_blank')}
                          >
                            <MapPin className="mr-1 h-3 w-3" />
                            Directions
                          </Button>
                          
                          {business.website && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => window.open(business.website, '_blank')}
                            >
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                          )}
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
        </div>
      </main>
    </div>
  );
};

export default PopularCategory;