import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { EventCard } from "@/components/EventCard";
import { MapPin, Phone, Star, ExternalLink, Sparkles, TrendingUp, Clock, Calendar } from "lucide-react";
import { AddressAutocomplete } from "@/components/AddressAutocomplete";
import { AddressCaptureModal } from "@/components/AddressCaptureModal";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useRequestCache } from "@/hooks/useRequestCache";
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
    name: "Happy Hours & Breweries", 
    icon: "🍺", 
    searchTerms: ["brewery", "brewpub", "craft beer", "happy hour", "bar"],
    color: "bg-orange-500",
    description: "Local brews and after-work spots"
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
  const [events, setEvents] = useState<any[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const { getCached, setCached } = useRequestCache();

  // Handle OAuth redirect and show address modal for new users
  useEffect(() => {
    const urlParams = new URLSearchParams(routerLocation.search);
    const isOAuth = urlParams.get('oauth') === 'true';
    const redirect = urlParams.get('redirect');
    
    console.log('🟡 POPULAR - OAuth check:', { isOAuth, redirect, user: !!user });
    
    if (isOAuth && user && redirect === 'popular') {
      console.log('🟡 POPULAR - Showing address modal for OAuth user');
      setShowAddressModal(true);
      
      // Clean up URL
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
  }, [user, routerLocation]);

  // Clear all data when user signs out
  useEffect(() => {
    if (!user) {
      setLocation(null);
      setEvents([]);
      setEventsLoading(false);
      setShowAddressModal(false);
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
      
      // If no saved location, try to get current location (only for authenticated users)
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            // Check if user is still authenticated before setting location
            if (!user) return;
            
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
                
                // Check again after async operation in case user signed out
                if (!user) return;
                
                setLocation({
                  latitude: position.coords.latitude,
                  longitude: position.coords.longitude,
                  city
                });
              }
            } catch (error) {
              console.error('Error reverse geocoding:', error);
              // Check if user is still authenticated before setting fallback location
              if (!user) return;
              
              setLocation({
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                city: 'Your Location'
              });
            }
          },
          (error) => {
            console.error('Error getting location:', error);
            // No need to set location on error - user will see location sharing prompt
          }
        );
      }
    };

    loadLocation();
  }, [user]);

  // Fetch events when location changes with comprehensive caching
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

        // Create cache key for events
        const cacheKey = {
          type: 'events',
          latitude: location.latitude,
          longitude: location.longitude
        };

        // Check app-level cache first (localStorage)
        let cachedEvents = getCached('popular_events', cacheKey);
        if (cachedEvents && Array.isArray(cachedEvents) && cachedEvents.length > 0) {
          console.log('💰 APP CACHE HIT: Popular events - NO API COST!');
          setEvents(cachedEvents);
          setEventsLoading(false);
          return;
        }

        // Check database cache for popular events
        const dbCacheKey = `popular_events_${location.latitude.toFixed(2)}_${location.longitude.toFixed(2)}`;
        const { data: cachedData, error: cacheError } = await supabase
          .from('recommendations_cache')
          .select('recommendations, expires_at')
          .eq('cache_key', dbCacheKey)
          .gte('expires_at', new Date().toISOString())
          .limit(1)
          .maybeSingle();

        if (!cacheError && cachedData?.recommendations && Array.isArray(cachedData.recommendations) && cachedData.recommendations.length > 0) {
          console.log('💰 DB CACHE HIT: Popular events - NO API COST!');
          const events = cachedData.recommendations as any[];
          setEvents(events);
          // Use database TTL (7 days) for app-level cache when from DB hit
          const dbExpiry = new Date(cachedData.expires_at).getTime();
          const remainingTTL = dbExpiry - Date.now();
          setCached('popular_events', cacheKey, events, Math.max(remainingTTL, 604800000)); // At least 7 days
          setEventsLoading(false);
          return;
        }

        console.log('❌ No cache for popular events - making API call');

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
          const events = data?.events || [];
          setEvents(events);
          
          // Cache in app-level for 7 days if we have results
          if (events.length > 0) {
            setCached('popular_events', cacheKey, events); // Use default 7-day TTL for events
            
            // Also cache in database for 7 days
            const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
            await supabase
              .from('recommendations_cache')
              .upsert({
                cache_key: dbCacheKey,
                user_coordinates: `(${location.latitude},${location.longitude})`,
                recommendations: events,
                categories: ['popular_events'],
                preferences: {},
                expires_at: expiresAt,
              });
            console.log('💾 CACHED: Popular events for 7 days in database');
          }
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
  }, [location, user, getCached, setCached]);

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

              {/* Happening Near You - Events Section */}
              <div className="mb-16">
                <div className="flex items-center justify-center gap-2 mb-8">
                  <Calendar className="h-6 w-6 text-primary" />
                  <h2 className="text-2xl font-bold text-center">Happening Near You</h2>
                </div>
                
                {eventsLoading ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                    {[...Array(6)].map((_, i) => (
                      <Card key={i} className="h-64">
                        <CardContent className="p-6">
                          <Skeleton className="h-6 w-3/4 mb-3" />
                          <Skeleton className="h-4 w-full mb-2" />
                          <Skeleton className="h-4 w-2/3 mb-4" />
                          <Skeleton className="h-4 w-1/2" />
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : events.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                    {events.slice(0, 6).map((event) => (
                      <EventCard
                        key={event.id}
                        event={event}
                        onClick={(event) => {
                          // Track event interaction
                          console.log('Event clicked:', event.name);
                        }}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No Events Found</h3>
                    <p className="text-muted-foreground">
                      Check back later for upcoming events in your area
                    </p>
                  </div>
                )}
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
                  onClick={() => window.location.href = '/auth?mode=signup&redirect=popular'}
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

      {/* Address Modal for OAuth users */}
      <AddressCaptureModal
        isOpen={showAddressModal}
        onClose={() => setShowAddressModal(false)}
        onComplete={(redirectPath) => {
          setShowAddressModal(false);
          // Since we're already on the popular page, just reload location
          window.location.reload();
        }}
        sourceContext="popular"
      />
    </div>
  );
};

export default Popular;