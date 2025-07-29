import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { MapPin, Phone, Star, ExternalLink, Heart, Sparkles, TrendingUp, Clock } from "lucide-react";
import { AddressAutocomplete } from "@/components/AddressAutocomplete";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface LocationData {
  latitude: number;
  longitude: number;
  city?: string;
}

interface Business {
  id: string;
  name: string;
  address: string;
  description: string;
  phone?: string;
  website?: string;
  features: string[];
  rating?: number;
  distance?: number;
  image?: string;
}

interface PopularRecommendations {
  [category: string]: Business[];
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
    icon: <Sparkles className="h-5 w-5" />,
    description: "Where locals spend their weekends",
    searchTerms: ["popular restaurant", "weekend market", "entertainment venue"]
  },
  {
    title: "Late Night Eats",
    icon: <Clock className="h-5 w-5" />,
    description: "Open when hunger strikes after hours",
    searchTerms: ["late night food", "24 hour restaurant", "midnight snack"]
  },
  {
    title: "Social Scene",
    icon: <TrendingUp className="h-5 w-5" />,
    description: "Meet new people and make connections",
    searchTerms: ["social club", "meetup space", "community center"]
  }
];

const Popular = () => {
  const { user } = useAuth();
  const [location, setLocation] = useState<LocationData | null>(null);
  const [recommendations, setRecommendations] = useState<PopularRecommendations>({});
  const [loading, setLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  // Load saved location on component mount
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

    loadLocation();
  }, [user]);

  const handleLocationSelect = (selectedLocation: LocationData) => {
    setLocation(selectedLocation);
  };

  const fetchTrendingPlaces = async (category: string, searchTerms: string[]) => {
    if (!location) return;

    setLoading(true);
    setActiveCategory(category);

    try {
      const { data, error } = await supabase.functions.invoke('generate-recommendations', {
        body: {
          mode: 'explore',
          location: {
            latitude: location.latitude,
            longitude: location.longitude
          },
          category,
          searchTerms,
          userId: user?.id
        }
      });

      if (error) throw error;

      if (data?.recommendations) {
        setRecommendations(prev => ({
          ...prev,
          [category]: data.recommendations[category] || []
        }));
      }
    } catch (error) {
      console.error('Error fetching trending places:', error);
      toast.error('Failed to load trending places');
    } finally {
      setLoading(false);
      setActiveCategory(null);
    }
  };

  const getGoogleMapsUrl = (address: string) => {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  };

  const toggleFavorite = async (business: Business, category: string) => {
    if (!user) {
      toast.error('Please sign in to save favorites');
      return;
    }

    try {
      const { data: existing } = await supabase
        .from('user_recommendations')
        .select('id, is_favorite')
        .eq('user_id', user.id)
        .eq('business_name', business.name)
        .single();

      if (existing) {
        await supabase
          .from('user_recommendations')
          .update({ is_favorite: !existing.is_favorite })
          .eq('id', existing.id);
      } else {
        await supabase
          .from('user_recommendations')
          .insert({
            user_id: user.id,
            business_name: business.name,
            business_address: business.address,
            business_description: business.description,
            business_phone: business.phone,
            business_website: business.website,
            business_features: business.features,
            category,
            is_favorite: true,
            distance_miles: business.distance
          });
      }

      toast.success(existing?.is_favorite ? 'Removed from favorites' : 'Added to favorites');
    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast.error('Failed to update favorite');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <Header />
      
      <main className="pt-24 pb-16">
        <div className="max-w-6xl mx-auto px-6">
          {/* Header Section */}
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-2 mb-4">
              <TrendingUp className="h-8 w-8 text-primary" />
              <h1 className="text-4xl md:text-5xl font-bold">
                Popular Near You
              </h1>
            </div>
            <p className="text-xl text-muted-foreground mb-8">
              Discover what's trending and where locals love to go
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

          {location ? (
            <>
              {/* Trending Categories Grid */}
              <div className="mb-16">
                <h2 className="text-2xl font-bold mb-8 text-center">Trending Categories</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {trendingCategories.map((category) => (
                    <Card 
                      key={category.name}
                      className="group cursor-pointer transition-all duration-300 hover:shadow-elegant hover:-translate-y-1 border-border/50"
                      onClick={() => fetchTrendingPlaces(category.name, category.searchTerms)}
                    >
                      <CardContent className="p-6 text-center">
                        <div className={`w-16 h-16 mx-auto mb-4 rounded-full ${category.color} flex items-center justify-center text-2xl group-hover:scale-110 transition-transform`}>
                          {category.icon}
                        </div>
                        <h3 className="font-semibold mb-2">{category.name}</h3>
                        <p className="text-sm text-muted-foreground">{category.description}</p>
                        {activeCategory === category.name && (
                          <div className="mt-4">
                            <div className="h-1 bg-primary/20 rounded-full overflow-hidden">
                              <div className="h-full bg-primary rounded-full animate-pulse w-3/4"></div>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Spotlight Sections */}
              <div className="mb-16">
                <h2 className="text-2xl font-bold mb-8 text-center">Local Spotlight</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {spotlightSections.map((section) => (
                    <Card 
                      key={section.title}
                      className="group cursor-pointer transition-all duration-300 hover:shadow-elegant hover:-translate-y-1 border-border/50"
                      onClick={() => fetchTrendingPlaces(section.title, section.searchTerms)}
                    >
                      <CardContent className="p-6 text-center">
                        <div className="text-primary mb-4 group-hover:scale-110 transition-transform">
                          {section.icon}
                        </div>
                        <h3 className="font-semibold mb-2">{section.title}</h3>
                        <p className="text-sm text-muted-foreground">{section.description}</p>
                        {activeCategory === section.title && (
                          <div className="mt-4">
                            <div className="h-1 bg-primary/20 rounded-full overflow-hidden">
                              <div className="h-full bg-primary rounded-full animate-pulse w-3/4"></div>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Results Section */}
              {Object.entries(recommendations).map(([category, businesses]) => (
                <div key={category} className="mb-12">
                  <div className="flex items-center gap-2 mb-6">
                    <Sparkles className="h-5 w-5 text-primary" />
                    <h2 className="text-2xl font-bold">{category}</h2>
                    <Badge variant="secondary">{businesses.length} places</Badge>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {businesses.map((business) => (
                      <Card key={business.id} className="group transition-all duration-300 hover:shadow-elegant hover:-translate-y-1">
                        <CardContent className="p-0">
                          {business.image && (
                            <div className="h-48 bg-muted rounded-t-lg overflow-hidden">
                              <img 
                                src={business.image} 
                                alt={business.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                            </div>
                          )}
                          
                          <div className="p-4">
                            <div className="flex items-start justify-between mb-2">
                              <h3 className="font-semibold line-clamp-1">{business.name}</h3>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleFavorite(business, category)}
                                className="h-8 w-8 p-0 hover:bg-primary/10"
                              >
                                <Heart className="h-4 w-4" />
                              </Button>
                            </div>
                            
                            <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                              {business.description}
                            </p>
                            
                            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                              <MapPin className="h-3 w-3" />
                              <span className="line-clamp-1">{business.address}</span>
                            </div>
                            
                            {business.rating && (
                              <div className="flex items-center gap-1 mb-3">
                                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                <span className="text-sm font-medium">{business.rating}</span>
                              </div>
                            )}
                            
                            <div className="flex gap-2">
                              {business.phone && (
                                <Button variant="outline" size="sm" asChild>
                                  <a href={`tel:${business.phone}`}>
                                    <Phone className="h-3 w-3 mr-1" />
                                    Call
                                  </a>
                                </Button>
                              )}
                              <Button variant="outline" size="sm" asChild>
                                <a href={getGoogleMapsUrl(business.address)} target="_blank" rel="noopener noreferrer">
                                  <ExternalLink className="h-3 w-3 mr-1" />
                                  Visit
                                </a>
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[...Array(6)].map((_, i) => (
                    <Card key={i}>
                      <CardContent className="p-4">
                        <Skeleton className="h-4 w-3/4 mb-2" />
                        <Skeleton className="h-3 w-full mb-2" />
                        <Skeleton className="h-3 w-2/3" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-16">
              <MapPin className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-2xl font-semibold mb-2">Share Your Location</h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                Let us know where you are to discover the hottest spots and trending places near you
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Popular;