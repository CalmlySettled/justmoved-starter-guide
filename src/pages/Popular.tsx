import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { MapPin, Phone, Star, ExternalLink, Sparkles, TrendingUp, Clock } from "lucide-react";
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
  const routerLocation = useLocation();
  const navigate = useNavigate();
  const [location, setLocation] = useState<LocationData | null>(null);

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

  const navigateToCategory = (categoryName: string) => {
    const urlFriendlyName = categoryName.toLowerCase().replace(/\s+/g, '-').replace(/&/g, 'and');
    navigate(`/popular/${urlFriendlyName}`);
  };


  return (
    <div className="min-h-screen bg-gradient-subtle">
      <Header />
      
      <main className="pt-24 pb-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
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
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  {trendingCategories.map((category) => (
                    <Card 
                      key={category.name}
                      className="group cursor-pointer transition-all duration-300 hover:shadow-elegant hover:-translate-y-1 border-border/50"
                      onClick={() => navigateToCategory(category.name)}
                    >
                      <CardContent className="p-6 text-center">
                        <div className={`w-16 h-16 mx-auto mb-4 rounded-full ${category.color} flex items-center justify-center text-2xl group-hover:scale-110 transition-transform`}>
                          {category.icon}
                        </div>
                        <h3 className="font-semibold mb-2">{category.name}</h3>
                        <p className="text-sm text-muted-foreground">{category.description}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Spotlight Sections */}
              <div className="mb-16">
                <h2 className="text-2xl font-bold mb-8 text-center">Local Spotlight</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  {spotlightSections.map((section) => (
                    <Card 
                      key={section.title}
                      className="group cursor-pointer transition-all duration-300 hover:shadow-elegant hover:-translate-y-1 border-border/50"
                      onClick={() => navigateToCategory(section.title)}
                    >
                      <CardContent className="p-6 text-center">
                        <div className="text-primary mb-4 group-hover:scale-110 transition-transform">
                          {section.icon}
                        </div>
                        <h3 className="font-semibold mb-2">{section.title}</h3>
                        <p className="text-sm text-muted-foreground">{section.description}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>


            </>
          ) : user ? (
            <div className="text-center py-16">
              <MapPin className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-2xl font-semibold mb-2">Share Your Location</h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                Let us know where you are to discover the hottest spots and trending places near you
              </p>
            </div>
          ) : (
            // Non-authenticated users see sign up prompt
            <div className="text-center py-16">
              <div className="max-w-lg mx-auto space-y-6 p-8 bg-muted/50 rounded-lg border">
                <TrendingUp className="h-16 w-16 text-primary mx-auto" />
                <h2 className="text-3xl font-bold">Discover What's Popular</h2>
                <p className="text-muted-foreground">
                  Take our quick quiz to explore trending places, hot spots, and local favorites in your area
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 my-8 opacity-60">
                  {trendingCategories.slice(0, 6).map((category) => (
                    <div key={category.name} className="text-center">
                      <div className={`w-12 h-12 mx-auto mb-2 rounded-full ${category.color} flex items-center justify-center text-lg`}>
                        {category.icon}
                      </div>
                      <p className="text-sm font-medium">{category.name}</p>
                    </div>
                  ))}
                </div>
                <Button 
                  onClick={() => window.location.href = '/onboarding'}
                  size="lg"
                  className="mt-6"
                >
                  Take the Quiz to Discover Popular Places
                </Button>
                <p className="text-sm text-muted-foreground">
                  Already completed the quiz? <button onClick={() => window.location.href = '/auth'} className="text-primary hover:underline">Sign in</button>
                </p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Popular;