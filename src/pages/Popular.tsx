import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { EventCard } from "@/components/EventCard";
import { MapPin, Phone, Star, ExternalLink, Sparkles, TrendingUp, Clock, Calendar, Church } from "lucide-react";
import { AddressAutocomplete } from "@/components/AddressAutocomplete";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAnalytics } from "@/hooks/useAnalytics";
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
    name: "Drink Time", 
    icon: "☕🍺", 
    searchTerms: ["coffee shop", "cafe", "specialty coffee", "brewery", "brewpub", "craft beer", "happy hour", "bar"],
    color: "bg-amber-500",
    description: "Coffee culture and local brews"
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
    searchTerms: ["boutique", "shopping center", "retail store"],
    color: "bg-cyan-500",
    description: "Boutiques and specialty retail"
  },
  { 
    name: "Personal Care & Wellness", 
    icon: "💇‍♂️✂️🧘‍♀️", 
    searchTerms: ["barbershop", "hair salon", "nail salon", "spa", "wellness center", "massage therapy", "beauty salon", "barber shop"],
    color: "bg-emerald-500",
    description: "Personal care and wellness services"
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
    name: "Nearby Events", 
    icon: "📅", 
    searchTerms: ["event venue", "community center", "entertainment venue"],
    color: "bg-violet-500",
    description: "See what's happening nearby"
  },
  { 
    name: "Faith Communities", 
    icon: "⛪", 
    searchTerms: ["church", "synagogue", "mosque", "temple", "faith community", "religious services"],
    color: "bg-indigo-500",
    description: "Find spiritual communities and places of worship"
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
  const { trackUIInteraction } = useAnalytics();
  const routerLocation = useLocation();
  const navigate = useNavigate();
  const [location, setLocation] = useState<LocationData | null>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  

  // Clean up URL parameters on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(routerLocation.search);
    if (urlParams.has('oauth') || urlParams.has('redirect')) {
      // Clean up URL without triggering modal
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
  }, [routerLocation]);

  // Clear all data when user signs out
  useEffect(() => {
    if (!user) {
      setLocation(null);
      setEvents([]);
      setEventsLoading(false);
    }
  }, [user]);

  // Load saved location on component mount - only for authenticated users
  useEffect(() => {
    const loadLocation = async () => {
      // Only proceed if user is authenticated
      if (!user) {
        return;
      }

      try {
        // Check if user is still authenticated before querying profile
        if (!user) return;
        
        const { data: profile } = await supabase
          .from('profiles')
          .select('address')
          .eq('user_id', user.id)
          .single();

        // Check again after async operation
        if (!user) return;

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

          // Check if user is still authenticated after geocoding request
          if (!user) return;

          if (response.ok) {
            const data = await response.json();
            if (data.length > 0) {
              // Final check before setting location
              if (!user) return;
              
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
      
      // Security: Do not use browser geolocation as fallback
      // User must have saved address in profile to access location-based features
    };

    loadLocation();
  }, [user]);

  // Fetch events when location changes
  useEffect(() => {
    const fetchEvents = async () => {
      if (!location || !user) return;
      
      setEventsLoading(true);
      try {
        // Check if user is still authenticated before making API call
        if (!user) {
          setEventsLoading(false);
          return;
        }

        const { data, error } = await supabase.functions.invoke('fetch-events', {
          body: {
            latitude: location.latitude,
            longitude: location.longitude
          }
        });

        // Check again after async operation in case user signed out
        if (!user) {
          setEventsLoading(false);
          return;
        }

        if (error) {
          console.error('Error fetching events:', error);
          toast.error('Failed to load events');
          setEvents([]);
        } else {
          setEvents(data?.events || []);
        }
      } catch (error) {
        console.error('Error fetching events:', error);
        toast.error('Failed to load events');
        setEvents([]);
      } finally {
        setEventsLoading(false);
      }
    };

    fetchEvents();
  }, [location, user]);

  const handleLocationSelect = (selectedLocation: LocationData) => {
    setLocation(selectedLocation);
  };

  const navigateToCategory = (categoryName: string) => {
    // Special handling for Nearby Events - redirect to dedicated events page
    if (categoryName === "Nearby Events") {
      trackUIInteraction('nearby_events', 'clicked', 'popular', {
        category: categoryName,
        location: location?.city || 'Unknown'
      });
      navigate('/events');
      return;
    }

    // Track popular category click
    const category = trendingCategories.find(cat => cat.name === categoryName);
    trackUIInteraction('popular_category', 'clicked', 'popular', {
      category: categoryName,
      searchTerms: category?.searchTerms || [],
      location: location?.city || 'Unknown'
    });

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

          </div>

          {location ? (
            <>
              {/* Trending Categories Grid */}
              <div className="mb-16">
                
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
                  Explore trending places, hot spots, and local favorites in your area
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
                  onClick={() => window.location.href = '/auth?mode=signup&redirect=explore'}
                  size="lg"
                  className="mt-6 bg-gradient-hero text-white border-0 shadow-glow hover:shadow-card-hover transition-all"
                >
                  Discover Popular Places
                </Button>
              </div>
            </div>
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
};

export default Popular;