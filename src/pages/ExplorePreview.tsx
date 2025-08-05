import { toast } from "@/utils/notificationRemover";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { MapPin, Heart, HeartIcon, Star, ExternalLink, Navigation } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { useBatchRequests } from "@/hooks/useBatchRequests";
import { ImageWithFallback } from "@/components/ui/image-with-fallback";
import { SignupModal } from "@/components/SignupModal";

import { Header } from "@/components/Header";

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
  review_count?: number;
}

interface ExploreRecommendations {
  [category: string]: Business[];
}

const trendingCategories = [
  { name: "Coffee shops", icon: "☕", searchTerms: ["coffee", "cafe"], color: "bg-amber-100 text-amber-800" },
  { name: "Fitness options", icon: "🏋️", searchTerms: ["gym", "fitness"], color: "bg-blue-100 text-blue-800" },
  { name: "Grocery stores", icon: "🛒", searchTerms: ["grocery", "supermarket"], color: "bg-green-100 text-green-800" },
  { name: "Parks recreation", icon: "🌳", searchTerms: ["parks", "recreation"], color: "bg-emerald-100 text-emerald-800" },
  { name: "Restaurants", icon: "🍽️", searchTerms: ["restaurants", "dining"], color: "bg-red-100 text-red-800" },
  { name: "Beauty", icon: "💄", searchTerms: ["beauty", "salon"], color: "bg-pink-100 text-pink-800" },
  { name: "Shopping", icon: "🛍️", searchTerms: ["shopping", "retail"], color: "bg-purple-100 text-purple-800" },
  { name: "Entertainment", icon: "🎭", searchTerms: ["entertainment", "venues"], color: "bg-indigo-100 text-indigo-800" },
];

const themedPacks = [
  {
    title: "First 48 Hours",
    description: "Immediate essentials for your first days",
    categories: ["Grocery stores", "Pharmacies", "Restaurants"],
    icon: "⏰",
    color: "bg-orange-100 text-orange-800"
  },
  {
    title: "Setting Up Home",
    description: "Everything to make your new place feel like home",
    categories: ["Furniture stores", "Hardware stores", "Home improvement"],
    icon: "🏠",
    color: "bg-blue-100 text-blue-800"
  },
  {
    title: "Getting Connected",
    description: "Essential services to get organized",
    categories: ["Banks", "Post offices", "Internet providers"],
    icon: "⚡",
    color: "bg-green-100 text-green-800"
  },
  {
    title: "Family Essentials",
    description: "Important services for families",
    categories: ["Pediatricians", "Schools", "Parks recreation"],
    icon: "👨‍👩‍👧‍👦",
    color: "bg-purple-100 text-purple-800"
  },
];

export default function ExplorePreview() {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [manualLocation, setManualLocation] = useState("");
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [popularPlaces, setPopularPlaces] = useState<ExploreRecommendations>({});
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedThemedPack, setSelectedThemedPack] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [showSignupModal, setShowSignupModal] = useState(false);
  const [signupContext, setSignupContext] = useState<string>("");
  const { user } = useAuth();
  const { batchInvoke } = useBatchRequests();

  // Get user's current location
  const getCurrentLocation = () => {
    setIsLoadingLocation(true);
    
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          
          try {
            // Get city name from coordinates
            const data = await batchInvoke('geocode-address', {
              latitude,
              longitude
            });
            
            if (data?.city) {
              const locationData = { latitude, longitude, city: data.city };
              setLocation(locationData);
              loadPopularPlaces(locationData);
            }
          } catch (error) {
            console.error('Error getting city name:', error);
            const locationData = { latitude, longitude, city: 'Unknown City' };
            setLocation(locationData);
            loadPopularPlaces(locationData);
          } finally {
            setIsLoadingLocation(false);
          }
        },
        (error) => {
          console.error('Error getting location:', error);
          setIsLoadingLocation(false);
          toast({
            title: "Location access denied",
            description: "Please enter your location manually or enable location access.",
            variant: "destructive",
          });
        }
      );
    } else {
      setIsLoadingLocation(false);
      toast({
        title: "Geolocation not supported",
        description: "Please enter your location manually.",
        variant: "destructive",
      });
    }
  };

  const handleManualLocation = async () => {
    if (!manualLocation.trim()) return;
    
    setIsLoadingLocation(true);
    
    try {
      const data = await batchInvoke('geocode-address', {
        address: manualLocation
      });
      
      if (data?.latitude && data?.longitude) {
        const locationData = {
          latitude: data.latitude,
          longitude: data.longitude,
          city: data.city || manualLocation
        };
        setLocation(locationData);
        loadPopularPlaces(locationData);
      } else {
        throw new Error('Could not find location');
      }
    } catch (error) {
      console.error('Error geocoding address:', error);
      toast({
        title: "Location not found",
        description: "Please try a different location or be more specific.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingLocation(false);
    }
  };

  const loadPopularPlaces = async (selectedLocation: LocationData) => {
    setIsLoading(true);
    setPopularPlaces({});
    
    try {
      const quizResponse = {
        address: `${selectedLocation.city}`,
        householdType: "Individual",
        priorities: ["Grocery stores", "Restaurants", "Coffee shops"],
        transportationStyle: "Car",
        budgetPreference: "Mid-range",
        lifeStage: "Young Professional",
        settlingTasks: ["Essential Shopping"]
      };

      console.log('Loading popular places for:', selectedLocation);
      
      const data = await batchInvoke('generate-recommendations', {
        responses: quizResponse
      }, { previewMode: !user }); // Use preview mode for unauthenticated users

      if (data && typeof data === 'object') {
        setPopularPlaces(data);
      }
    } catch (error) {
      console.error('Error loading popular places:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCategorySelect = async (category: string, searchTerms: string[]) => {
    if (!location) {
      alert('Please set your location first');
      return;
    }

    // Show signup modal for unauthenticated users
    if (!user) {
      setSignupContext(`Sign up to discover all ${category.toLowerCase()} in ${location.city}`);
      setShowSignupModal(true);
      return;
    }

    setSelectedCategory(category);
    setIsLoading(true);
    setPopularPlaces({});

    try {
      // Create a focused quiz response for the selected category
      const quizResponse = {
        address: `${location.city}`,
        householdType: "Individual",
        priorities: [category], // Focus on the selected category
        transportationStyle: "Car",
        budgetPreference: "Mid-range",
        lifeStage: "Young Professional",
        settlingTasks: ["Essential Shopping"]
      };

      console.log('Loading recommendations for category:', category);
      
      const data = await batchInvoke('generate-recommendations', {
        responses: quizResponse
      });

      if (data && typeof data === 'object') {
        setPopularPlaces(data);
      }
    } catch (error) {
      console.error('Error loading category recommendations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleThemedPackSelect = async (pack: any) => {
    if (!location) {
      alert('Please set your location first');
      return;
    }

    // Show signup modal for unauthenticated users
    if (!user) {
      setSignupContext(`Sign up to explore ${pack.title.toLowerCase()} in ${location.city}`);
      setShowSignupModal(true);
      return;
    }

    setSelectedThemedPack(pack.title);
    setIsLoading(true);
    setPopularPlaces({});

    try {
      // Create a quiz response based on the themed pack
      const quizResponse = {
        address: `${location.city}`,
        householdType: "Individual",
        priorities: pack.categories, // Use the pack's categories
        transportationStyle: "Car",
        budgetPreference: "Mid-range",
        lifeStage: "Young Professional",
        settlingTasks: ["Essential Shopping"]
      };

      console.log('Loading recommendations for themed pack:', pack.title);
      
      const data = await batchInvoke('generate-recommendations', {
        responses: quizResponse
      });

      if (data && typeof data === 'object') {
        setPopularPlaces(data);
      }
    } catch (error) {
      console.error('Error loading themed pack recommendations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleFavorite = async (business: Business) => {
    if (!user) {
      setSignupContext(`Sign up to save ${business.name} to your favorites`);
      setShowSignupModal(true);
      return;
    }

    // Implement favorite toggle logic here
    console.log('Toggle favorite for:', business.name);
  };

  const generateGoogleMapsUrl = (business: Business) => {
    const query = encodeURIComponent(`${business.name} ${business.address}`);
    return `https://www.google.com/maps/search/?api=1&query=${query}`;
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">Explore Your New City</h1>
          <p className="text-lg text-muted-foreground">
            Discover local favorites and essential services
          </p>
        </div>

        {/* Location Input Section */}
        {!location && (
          <div className="bg-muted/50 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">Where are you exploring?</h2>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Enter city or address..."
                  value={manualLocation}
                  onChange={(e) => setManualLocation(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleManualLocation()}
                />
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={handleManualLocation}
                  disabled={isLoadingLocation || !manualLocation.trim()}
                >
                  Search
                </Button>
                <Button 
                  variant="outline"
                  onClick={getCurrentLocation}
                  disabled={isLoadingLocation}
                >
                  <Navigation className="h-4 w-4 mr-2" />
                  Use Current Location
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Just Moved Collections */}
        {location && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-6">Just Moved Collections</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {themedPacks.map((pack) => (
                <Card 
                  key={pack.title}
                  className={`cursor-pointer hover:shadow-lg transition-all duration-300 ${
                    selectedThemedPack === pack.title ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => handleThemedPackSelect(pack)}
                >
                  <CardContent className="p-4 text-center">
                    <div className="text-3xl mb-2">{pack.icon}</div>
                    <h3 className="font-semibold mb-1">{pack.title}</h3>
                    <p className="text-sm text-muted-foreground mb-2">{pack.description}</p>
                    <Badge variant="secondary" className={pack.color}>
                      {pack.categories.length} categories
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Category Selection */}
        {location && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-6">Explore by Category</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {trendingCategories.map((category) => (
                <Card 
                  key={category.name}
                  className={`cursor-pointer hover:shadow-lg transition-all duration-300 ${
                    selectedCategory === category.name ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => handleCategorySelect(category.name, category.searchTerms)}
                >
                  <CardContent className="p-4 text-center">
                    <div className="text-3xl mb-2">{category.icon}</div>
                    <h3 className="font-semibold">{category.name}</h3>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Results Section */}
        {location && Object.keys(popularPlaces).length > 0 && (
          <div className="space-y-8">
            {Object.entries(popularPlaces).map(([category, businesses]) => (
              <div key={category}>
                <h3 className="text-xl font-semibold mb-4 capitalize">{category}</h3>
                <div className="grid gap-4">
                  {businesses.map((business, index) => (
                    <Card key={business.name} className={`group hover:shadow-lg transition-all duration-300 border border-border/50 ${!user && index < 2 ? 'relative' : ''}`}>
                      <CardContent className="p-4">
                        {!user && index < 2 && (
                          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/20 to-background/80 backdrop-blur-[2px] rounded-lg z-10 flex items-center justify-center">
                            <div className="text-center p-4">
                              <p className="text-sm font-medium mb-2">Preview Mode</p>
                              <Button 
                                onClick={() => {
                                  setSignupContext(`Sign up to see all ${category.toLowerCase()} in ${location?.city}`);
                                  setShowSignupModal(true);
                                }}
                                size="sm"
                              >
                                Sign up to unlock
                              </Button>
                            </div>
                          </div>
                        )}
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg mb-1 group-hover:text-primary transition-colors">
                              {business.name}
                            </h3>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                              <MapPin className="h-4 w-4" />
                              <span>{business.address}</span>
                              {business.distance_miles && (
                                <span>• {business.distance_miles} mi</span>
                              )}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleFavorite(business)}
                            className="text-muted-foreground hover:text-primary ml-2"
                          >
                            {favorites.has(business.name) ? (
                              <Heart className="h-5 w-5 fill-current text-primary" />
                            ) : (
                              <HeartIcon className="h-5 w-5" />
                            )}
                          </Button>
                        </div>

                        {business.image_url && (
                          <div className="mb-3">
                            <ImageWithFallback
                              src={business.image_url}
                              alt={business.name}
                              className="w-full h-48 object-cover rounded-lg"
                            />
                          </div>
                        )}

                        <div className="flex items-center gap-2 mb-3">
                          {business.rating && (
                            <div className="flex items-center gap-1">
                              <Star className="h-4 w-4 fill-current text-yellow-400" />
                              <span className="text-sm font-medium">{business.rating}</span>
                              {business.review_count && (
                                <span className="text-sm text-muted-foreground">
                                  ({business.review_count} reviews)
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        <p className="text-sm text-muted-foreground mb-3">{business.description}</p>

                        {business.features && business.features.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-3">
                            {business.features.slice(0, 3).map((feature, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {feature}
                              </Badge>
                            ))}
                            {business.features.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{business.features.length - 3} more
                              </Badge>
                            )}
                          </div>
                        )}

                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(generateGoogleMapsUrl(business), '_blank')}
                            className="flex-1"
                          >
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Directions
                          </Button>
                          {business.website && (
                            <Button
                              variant="outline" 
                              size="sm"
                              onClick={() => window.open(business.website, '_blank')}
                              className="flex-1"
                            >
                              <ExternalLink className="h-4 w-4 mr-2" />
                              Website
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Finding amazing places near you...</p>
          </div>
        )}

        {location && (
          <Badge variant="secondary" className="mb-4">
            <MapPin className="h-3 w-3 mr-1" />
            Currently showing results for {location.city}
          </Badge>
        )}
        
        <SignupModal 
          isOpen={showSignupModal}
          onClose={() => setShowSignupModal(false)}
          contextMessage={signupContext}
          onSignupComplete={() => {
            // Reload the page to show full results
            if (location) {
              loadPopularPlaces(location);
            }
          }}
        />
      </div>
    </div>
  );
}