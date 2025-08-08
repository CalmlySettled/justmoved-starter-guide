import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EventCard } from "@/components/EventCard";
import { Calendar, MapPin, ArrowLeft, Filter } from "lucide-react";
import { AddressCaptureModal } from "@/components/AddressCaptureModal";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAnalytics } from "@/hooks/useAnalytics";
import { toast } from "sonner";

interface LocationData {
  latitude: number;
  longitude: number;
  city?: string;
}

interface Event {
  id: string;
  name: string;
  description: string;
  start_date: string;
  end_date: string;
  venue: {
    name: string;
    address: string;
    latitude: number;
    longitude: number;
  };
  ticket_url: string;
  logo_url?: string;
  category: string;
  is_free: boolean;
  distance_miles: number;
}

const Events = () => {
  const { user } = useAuth();
  const { trackUIInteraction } = useAnalytics();
  const navigate = useNavigate();
  const [location, setLocation] = useState<LocationData | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [showAddressModal, setShowAddressModal] = useState(false);

  // Load saved location on component mount - only for authenticated users
  useEffect(() => {
    const loadLocation = async () => {
      if (!user) {
        return;
      }

      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('address')
          .eq('user_id', user.id)
          .single();

        if (!user) return;

        if (profile?.address) {
          // Geocode the saved address
          const response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=1&q=${encodeURIComponent(profile.address)}&countrycodes=us`,
            {
              headers: {
                'User-Agent': 'CalmlySettled/1.0'
              }
            }
          );

          if (!user) return;

          if (response.ok) {
            const data = await response.json();
            if (data.length > 0) {
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
      
      // If no saved location, try to get current location
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            if (!user) return;
            
            try {
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
                
                if (!user) return;
                
                setLocation({
                  latitude: position.coords.latitude,
                  longitude: position.coords.longitude,
                  city
                });
              }
            } catch (error) {
              console.error('Error reverse geocoding:', error);
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
          }
        );
      }
    };

    loadLocation();
  }, [user]);

  // Fetch events when location changes
  useEffect(() => {
    const fetchEvents = async () => {
      if (!location || !user) return;
      
      setEventsLoading(true);
      try {
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

  const handleEventClick = (event: Event) => {
    trackUIInteraction('event_details', 'viewed', 'events', {
      event_name: event.name,
      event_category: event.category,
      venue: event.venue.name,
      distance: event.distance_miles
    });
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <Header />
      
      <main className="pt-24 pb-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          {/* Header Section */}
          <div className="text-center mb-12">
            <Button
              variant="ghost"
              onClick={() => navigate('/popular')}
              className="mb-6 hover:bg-muted/50"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Popular
            </Button>
            
            <div className="flex items-center justify-center gap-2 mb-4">
              <Calendar className="h-8 w-8 text-primary" />
              <h1 className="text-4xl md:text-5xl font-bold">
                Nearby Events
              </h1>
            </div>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Discover exciting events happening in your area
            </p>
          </div>

          {location ? (
            <>
              {/* Location Badge */}
              <div className="flex items-center justify-center gap-2 mb-8">
                <Badge variant="secondary" className="text-lg px-4 py-2 bg-gradient-hero text-white border-0 shadow-glow">
                  <MapPin className="mr-2 h-4 w-4" />
                  {location.city}
                </Badge>
              </div>

              {/* Events Grid */}
              {eventsLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                  {[...Array(8)].map((_, i) => (
                    <Card key={i} className="h-48">
                      <CardContent className="p-4">
                        <Skeleton className="h-4 w-3/4 mb-2" />
                        <Skeleton className="h-3 w-full mb-2" />
                        <Skeleton className="h-3 w-2/3 mb-3" />
                        <Skeleton className="h-3 w-1/2" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : events.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                  {events.map((event) => (
                    <EventCard
                      key={event.id}
                      event={event}
                      onClick={handleEventClick}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-16">
                  <Calendar className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-2xl font-semibold mb-2">No Events Found</h3>
                  <p className="text-muted-foreground text-lg max-w-md mx-auto">
                    Check back later for upcoming events in your area, or try adjusting your location
                  </p>
                </div>
              )}
            </>
          ) : user ? (
            <div className="text-center py-16">
              <MapPin className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-2xl font-semibold mb-2">Share Your Location</h2>
              <p className="text-muted-foreground max-w-md mx-auto mb-6">
                Let us know where you are to discover events happening near you
              </p>
              <Button onClick={() => setShowAddressModal(true)}>
                Set Location
              </Button>
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="max-w-lg mx-auto space-y-6 p-8 bg-muted/50 rounded-lg border">
                <Calendar className="h-16 w-16 text-primary mx-auto" />
                <h2 className="text-3xl font-bold">Discover Local Events</h2>
                <p className="text-muted-foreground">
                  Sign up to explore exciting events happening in your area
                </p>
                <Button 
                  onClick={() => window.location.href = '/auth?mode=signup&redirect=events'}
                  size="lg"
                  className="mt-6 bg-gradient-hero text-white border-0 shadow-glow hover:shadow-card-hover transition-all"
                >
                  Sign Up to Explore Events
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Address Modal */}
      <AddressCaptureModal
        isOpen={showAddressModal}
        onClose={() => setShowAddressModal(false)}
        onComplete={() => {
          setShowAddressModal(false);
          window.location.reload();
        }}
        sourceContext="events"
      />
    </div>
  );
};

export default Events;