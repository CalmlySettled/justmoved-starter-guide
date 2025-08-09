import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { MapPin, Star, ExternalLink, ArrowLeft, Loader2, Gamepad2, Target, PartyPopper, Dice6, Flag, Navigation } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSmartToast } from "@/hooks/useSmartToast";
import { useBusinessDetails } from "@/hooks/useBusinessDetails";
import { useIsMobile } from "@/hooks/use-mobile";

interface LocationData {
  latitude: number;
  longitude: number;
  city?: string;
}

interface Business {
  name: string;
  address: string;
  description?: string;
  place_id?: string;
  rating?: number;
  user_ratings_total?: number;
  price_level?: number;
  types?: string[];
  business_status?: string;
  opening_hours?: {
    open_now?: boolean;
    weekday_text?: string[];
  };
  geometry?: {
    location: {
      lat: number;
      lng: number;
    };
  };
  photos?: Array<{
    photo_reference: string;
    height: number;
    width: number;
  }>;
  website?: string;
  formatted_phone_number?: string;
  features?: string[];
  image_url?: string;
  distance_miles?: number;
  category?: string;
}

const trendingCategories = [
  { 
    name: "Restaurants & Dining", 
    icon: "🍽️", 
    searchTerm: "restaurant", 
    color: "bg-orange-100 dark:bg-orange-900/30",
    description: "Discover amazing restaurants and dining experiences near you"
  },
  { 
    name: "Coffee & Cafés", 
    icon: "☕", 
    searchTerm: "coffee shop", 
    color: "bg-amber-100 dark:bg-amber-900/30",
    description: "Find your perfect coffee spot or cozy café"
  },
  { 
    name: "Shopping Centers", 
    icon: "🛍️", 
    searchTerm: "shopping mall", 
    color: "bg-pink-100 dark:bg-pink-900/30",
    description: "Explore shopping centers and retail destinations"
  },
  { 
    name: "Grocery Stores", 
    icon: "🛒", 
    searchTerm: "grocery store", 
    color: "bg-green-100 dark:bg-green-900/30",
    description: "Find grocery stores and supermarkets nearby"
  },
  { 
    name: "Gas Stations", 
    icon: "⛽", 
    searchTerm: "gas station", 
    color: "bg-blue-100 dark:bg-blue-900/30",
    description: "Locate gas stations and fuel services"
  },
  { 
    name: "Pharmacies", 
    icon: "💊", 
    searchTerm: "pharmacy", 
    color: "bg-red-100 dark:bg-red-900/30",
    description: "Find pharmacies and drugstores"
  },
  { 
    name: "Personal Care & Wellness", 
    icon: "💅", 
    searchTerm: "beauty salon", 
    color: "bg-purple-100 dark:bg-purple-900/30",
    description: "Discover beauty salons, spas, and wellness centers"
  },
  { 
    name: "Banks & ATMs", 
    icon: "🏦", 
    searchTerm: "bank", 
    color: "bg-indigo-100 dark:bg-indigo-900/30",
    description: "Find banks, ATMs, and financial services"
  },
  { 
    name: "Gyms & Fitness", 
    icon: "💪", 
    searchTerm: "gym", 
    color: "bg-cyan-100 dark:bg-cyan-900/30",
    description: "Locate gyms, fitness centers, and sports facilities"
  },
  { 
    name: "Hotels & Lodging", 
    icon: "🏨", 
    searchTerm: "hotel", 
    color: "bg-emerald-100 dark:bg-emerald-900/30",
    description: "Find hotels and accommodation options"
  },
  { 
    name: "Automotive Services", 
    icon: "🚗", 
    searchTerm: "car repair", 
    color: "bg-slate-100 dark:bg-slate-900/30",
    description: "Discover car repair shops and automotive services"
  },
  { 
    name: "Entertainment", 
    icon: "🎬", 
    searchTerm: "movie theater", 
    color: "bg-violet-100 dark:bg-violet-900/30",
    description: "Find entertainment venues and movie theaters"
  },
  { 
    name: "Food Time", 
    icon: "⏰", 
    searchTerm: "restaurant open now", 
    color: "bg-yellow-100 dark:bg-yellow-900/30",
    description: "Find the perfect meal for any time of day"
  },
  { 
    name: "Drink Time", 
    icon: "🍹", 
    searchTerm: "bar", 
    color: "bg-rose-100 dark:bg-rose-900/30",
    description: "Discover bars, breweries, and drink spots"
  },
];

const spotlightSections = [
  {
    title: "Gaming & Entertainment",
    description: "Level up your fun with gaming lounges, arcades, and entertainment venues",
    searchTerm: "arcade gaming entertainment",
    icon: <Gamepad2 className="w-8 h-8" />,
    color: "bg-blue-100 dark:bg-blue-900/30"
  },
  {
    title: "Sports & Recreation",
    description: "Get active with sports facilities, courts, and recreational activities",
    searchTerm: "sports recreation facility",
    icon: <Target className="w-8 h-8" />,
    color: "bg-green-100 dark:bg-green-900/30"
  },
  {
    title: "Events & Celebrations",
    description: "Celebrate life's moments at event venues and party destinations",
    searchTerm: "event venue party hall",
    icon: <PartyPopper className="w-8 h-8" />,
    color: "bg-pink-100 dark:bg-pink-900/30"
  },
  {
    title: "Lucky Finds",
    description: "Discover hidden gems and unexpected treasures in your area",
    searchTerm: "unique local specialty",
    icon: <Dice6 className="w-8 h-8" />,
    color: "bg-purple-100 dark:bg-purple-900/30"
  },
  {
    title: "Must-Visit Destinations",
    description: "Explore iconic landmarks and must-see attractions",
    searchTerm: "tourist attraction landmark",
    icon: <Flag className="w-8 h-8" />,
    color: "bg-orange-100 dark:bg-orange-900/30"
  }
];

const PopularCategory: React.FC = () => {
  const { category } = useParams<{ category: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useSmartToast();
  const { getBusinessDetails, loadingStates } = useBusinessDetails();
  const isMobile = useIsMobile();

  const [location, setLocation] = useState<LocationData | null>(null);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [favoriteBusinesses, setFavoriteBusinesses] = useState<Set<string>>(new Set());
  const [favoritingBusinesses, setFavoritingBusinesses] = useState<Set<string>>(new Set());
  const [businessWebsites, setBusinessWebsites] = useState<Record<string, string>>({});
  
  // Subcategory state for special categories
  const [subcategoryData, setSubcategoryData] = useState<{
    barbershops: Business[];
    salons: Business[];
    spas: Business[];
    morning: Business[];
    afternoon: Business[];
    evening: Business[];
    happy_hour: Business[];
    late_night: Business[];
    wine_bar: Business[];
  }>({
    barbershops: [],
    salons: [],
    spas: [],
    morning: [],
    afternoon: [],
    evening: [],
    happy_hour: [],
    late_night: [],
    wine_bar: []
  });
  
  const [subcategoryLoading, setSubcategoryLoading] = useState<{
    barbershops: boolean;
    salons: boolean;
    spas: boolean;
    morning: boolean;
    afternoon: boolean;
    evening: boolean;
    happy_hour: boolean;
    late_night: boolean;
    wine_bar: boolean;
  }>({
    barbershops: false,
    salons: false,
    spas: false,
    morning: false,
    afternoon: false,
    evening: false,
    happy_hour: false,
    late_night: false,
    wine_bar: false
  });

  const getUserLocation = () => {
    return new Promise<LocationData>((resolve, reject) => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            resolve({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude
            });
          },
          (error) => {
            console.error("Error getting location:", error);
            reject(error);
          }
        );
      } else {
        reject(new Error("Geolocation is not supported by this browser"));
      }
    });
  };

  const fetchFavoriteBusinesses = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_favorite_businesses')
        .select('business_name')
        .eq('user_id', user.id);

      if (error) throw error;

      const favoriteNames = new Set(data.map(fav => fav.business_name));
      setFavoriteBusinesses(favoriteNames);
    } catch (error) {
      console.error('Error fetching favorites:', error);
    }
  };

  const fetchCategoryPlaces = async (
    searchTerm: string, 
    location: LocationData, 
    subcategory?: 'barbershops' | 'salons' | 'spas' | 'morning' | 'afternoon' | 'evening' | 'happy_hour' | 'late_night' | 'wine_bar'
  ) => {
    try {
      if (subcategory) {
        setSubcategoryLoading(prev => ({ ...prev, [subcategory]: true }));
      } else {
        setIsLoading(true);
      }

      const { data, error } = await supabase.functions.invoke('generate-recommendations', {
        body: { 
          latitude: location.latitude, 
          longitude: location.longitude,
          searchTerm: searchTerm,
          radiusInMiles: 25,
          maxResults: subcategory ? 8 : 12
        }
      });

      if (error) {
        console.error('Error fetching places:', error);
        throw error;
      }

      const placesWithDistance = data?.businesses || [];
      
      if (subcategory) {
        setSubcategoryData(prev => ({ ...prev, [subcategory]: placesWithDistance }));
        setSubcategoryLoading(prev => ({ ...prev, [subcategory]: false }));
      } else {
        setBusinesses(placesWithDistance);
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Error fetching category places:', error);
      if (subcategory) {
        setSubcategoryLoading(prev => ({ ...prev, [subcategory]: false }));
      } else {
        setIsLoading(false);
      }
      toast({
        title: "Error",
        description: "Failed to load places. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getGoogleMapsUrl = (address: string) => {
    const encodedAddress = encodeURIComponent(address);
    return `https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}`;
  };

  const handlePersonalCareTabChange = (tab: string) => {
    if (!location) return;
    
    const searchTerms = {
      barbershops: "barbershop hair cut men",
      salons: "hair salon beauty",
      spas: "spa massage wellness"
    };
    
    const searchTerm = searchTerms[tab as keyof typeof searchTerms];
    if (searchTerm) {
      fetchCategoryPlaces(searchTerm, location, tab as 'barbershops' | 'salons' | 'spas');
    }
  };

  const handleFoodSceneTabChange = (tab: string) => {
    if (!location) return;
    
    const searchTerms = {
      morning: "breakfast brunch coffee shop",
      afternoon: "lunch restaurant casual dining",
      evening: "dinner restaurant fine dining"
    };
    
    const searchTerm = searchTerms[tab as keyof typeof searchTerms];
    if (searchTerm) {
      fetchCategoryPlaces(searchTerm, location, tab as 'morning' | 'afternoon' | 'evening');
    }
  };

  const handleDrinkSceneTabChange = (tab: string) => {
    if (!location) return;
    
    const searchTerms = {
      happy_hour: "bar happy hour sports bar",
      late_night: "late night bar pub nightclub",
      wine_bar: "wine bar cocktail lounge"
    };
    
    const searchTerm = searchTerms[tab as keyof typeof searchTerms];
    if (searchTerm) {
      fetchCategoryPlaces(searchTerm, location, tab as 'happy_hour' | 'late_night' | 'wine_bar');
    }
  };

  const categorizeBusinesses = (businesses: Business[]) => {
    const categories = {
      restaurants: [] as Business[],
      cafes: [] as Business[],
      retail: [] as Business[],
      services: [] as Business[],
      entertainment: [] as Business[],
      other: [] as Business[]
    };

    businesses.forEach(business => {
      const types = business.types || [];
      const name = business.name.toLowerCase();
      
      if (types.includes('restaurant') || types.includes('meal_takeaway') || types.includes('meal_delivery')) {
        categories.restaurants.push(business);
      } else if (types.includes('cafe') || name.includes('coffee') || name.includes('café')) {
        categories.cafes.push(business);
      } else if (types.includes('store') || types.includes('shopping_mall') || types.includes('clothing_store')) {
        categories.retail.push(business);
      } else if (types.includes('beauty_salon') || types.includes('spa') || types.includes('gym')) {
        categories.services.push(business);
      } else if (types.includes('movie_theater') || types.includes('amusement_park') || types.includes('bowling_alley')) {
        categories.entertainment.push(business);
      } else {
        categories.other.push(business);
      }
    });

    return categories;
  };

  const handleGetWebsite = async (business: Business) => {
    if (!business.place_id) return;
    
    try {
      const details = await getBusinessDetails(business.place_id, business.name);
      if (details?.website) {
        setBusinessWebsites(prev => ({
          ...prev,
          [business.place_id!]: details.website!
        }));
        window.open(details.website, '_blank');
      } else {
        toast({
          title: "No website found",
          description: "This business doesn't have a website listed.",
          variant: "default",
        });
      }
    } catch (error) {
      console.error('Error getting website:', error);
      toast({
        title: "Error",
        description: "Failed to get website information.",
        variant: "destructive",
      });
    }
  };

  const toggleFavorite = async (business: Business) => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to save favorites.",
        variant: "destructive",
      });
      return;
    }

    const businessKey = business.name;
    setFavoritingBusinesses(prev => new Set(prev).add(businessKey));

    try {
      const isFavorited = favoriteBusinesses.has(businessKey);
      
      if (isFavorited) {
        const { error } = await supabase
          .from('user_favorite_businesses')
          .delete()
          .eq('user_id', user.id)
          .eq('business_name', businessKey);

        if (error) throw error;

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
        const { error } = await supabase
          .from('user_favorite_businesses')
          .insert({
            user_id: user.id,
            business_name: businessKey,
            business_address: business.address,
            business_place_id: business.place_id
          });

        if (error) throw error;

        setFavoriteBusinesses(prev => new Set(prev).add(businessKey));

        toast({
          title: "Added to favorites",
          description: `${business.name} has been added to your favorites.`,
        });
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast({
        title: "Error",
        description: "Failed to update favorites. Please try again.",
        variant: "destructive",
      });
    } finally {
      setFavoritingBusinesses(prev => {
        const newSet = new Set(prev);
        newSet.delete(businessKey);
        return newSet;
      });
    }
  };

  useEffect(() => {
    const initializeData = async () => {
      try {
        const locationData = await getUserLocation();
        setLocation(locationData);
        await fetchFavoriteBusinesses();
      } catch (error) {
        console.error('Error getting location:', error);
        toast({
          title: "Location required",
          description: "Please enable location services to see nearby places.",
          variant: "destructive",
        });
      }
    };

    initializeData();
  }, [user]);

  useEffect(() => {
    if (location && category) {
      const categoryConfig = [...trendingCategories, ...spotlightSections].find(
        cat => ('name' in cat ? cat.name : cat.title).toLowerCase().replace(/\s+/g, '-') === category
      );
      
      if (categoryConfig) {
        fetchCategoryPlaces(categoryConfig.searchTerm, location);
        
        // Fetch subcategory data for special categories
        if ('name' in categoryConfig && categoryConfig.name === "Personal Care & Wellness") {
          handlePersonalCareTabChange('barbershops');
          handlePersonalCareTabChange('salons');
          handlePersonalCareTabChange('spas');
        } else if ('name' in categoryConfig && categoryConfig.name === "Food Time") {
          handleFoodSceneTabChange('morning');
          handleFoodSceneTabChange('afternoon');
          handleFoodSceneTabChange('evening');
        } else if ('name' in categoryConfig && categoryConfig.name === "Drink Time") {
          handleDrinkSceneTabChange('happy_hour');
          handleDrinkSceneTabChange('late_night');
          handleDrinkSceneTabChange('wine_bar');
        }
      }
    }
  }, [location, category]);

  const categoryConfig = [...trendingCategories, ...spotlightSections].find(
    cat => ('name' in cat ? cat.name : cat.title).toLowerCase().replace(/\s+/g, '-') === category
  );

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
      
      {/* Mobile Header with Back Button */}
      {isMobile && (
        <div className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
          <div className="flex items-center gap-3 px-4 py-3">
            <Button
              onClick={() => navigate('/popular')}
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-lg font-semibold text-foreground truncate">
              {'name' in categoryConfig ? categoryConfig.name : categoryConfig.title}
            </h1>
          </div>
        </div>
      )}
      
      <main className={isMobile ? "pb-16" : "pt-24 pb-16"}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          {/* Header Section */}
          <div className="mb-8">
            <Button 
              variant="ghost" 
              onClick={() => navigate('/popular')}
              className="mb-6 hover:bg-background/80"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Popular
            </Button>

            <div className="text-center">
              <div className="flex items-center justify-center mb-6">
                {'icon' in categoryConfig && (
                  <div className={`w-16 h-16 rounded-full ${trendingCategories.find(cat => cat.name === categoryConfig.name)?.color || 'bg-primary'} flex items-center justify-center text-2xl`}>
                    {categoryConfig.icon}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Content based on category type */}
          {('name' in categoryConfig && categoryConfig.name === "Personal Care & Wellness") ? (
            // Special tabbed layout for Personal Care & Wellness
            <Tabs defaultValue="barbershops" className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-8 h-auto py-2">
                <TabsTrigger value="barbershops" className="flex items-center gap-1 text-xs sm:text-sm px-2 py-2 sm:px-3 sm:py-1.5" onClick={() => handlePersonalCareTabChange('barbershops')}>
                  💇‍♂️ <span className="hidden xs:inline">Barbershops</span>
                </TabsTrigger>
                <TabsTrigger value="salons" className="flex items-center gap-1 text-xs sm:text-sm px-2 py-2 sm:px-3 sm:py-1.5" onClick={() => handlePersonalCareTabChange('salons')}>
                  💅 <span className="hidden xs:inline">Salons</span>
                </TabsTrigger>
                <TabsTrigger value="spas" className="flex items-center gap-1 text-xs sm:text-sm px-2 py-2 sm:px-3 sm:py-1.5" onClick={() => handlePersonalCareTabChange('spas')}>
                  🧘 <span className="hidden xs:inline">Spas</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="barbershops">
                {subcategoryLoading.barbershops ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                    {[...Array(4)].map((_, i) => (
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
                ) : subcategoryData.barbershops.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                    {subcategoryData.barbershops.map((business) => (
                      <Card key={`barbershop-${business.name}`} className="group transition-all duration-300 hover:shadow-elegant hover:-translate-y-1">
                        <CardContent className="p-0">
                          {business.image_url && (
                            <div className="h-32 bg-muted rounded-t-lg overflow-hidden">
                              <img 
                                src={business.image_url} 
                                alt={business.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                            </div>
                          )}
                          
                          <div className="p-3">
                            <div className="flex items-start justify-between mb-2">
                              <h3 className="text-sm font-semibold leading-tight">{business.name}</h3>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleFavorite(business)}
                                disabled={favoritingBusinesses.has(business.name)}
                                className="p-1 hover:bg-background/80"
                              >
                                <Star 
                                  className={`h-3 w-3 transition-colors ${
                                    favoriteBusinesses.has(business.name)
                                      ? 'fill-current text-yellow-500' 
                                      : 'text-muted-foreground hover:text-yellow-500'
                                  }`} 
                                />
                              </Button>
                            </div>
                          
                            <a 
                              href={getGoogleMapsUrl(business.address)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center text-xs text-primary hover:text-primary/80 transition-colors group font-medium"
                            >
                              <Navigation className="mr-1 h-3 w-3 transition-transform group-hover:scale-110" />
                              <span className="hover:underline">{business.distance_miles?.toFixed(1)} miles away</span>
                            </a>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="text-4xl mb-4">💇‍♂️</div>
                    <h3 className="text-xl font-semibold mb-2">No barbershops found</h3>
                    <p className="text-muted-foreground">Try the other tabs for more options.</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="salons">
                {subcategoryLoading.salons ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                    {[...Array(4)].map((_, i) => (
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
                ) : subcategoryData.salons.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                    {subcategoryData.salons.map((business) => (
                      <Card key={`salon-${business.name}`} className="group transition-all duration-300 hover:shadow-elegant hover:-translate-y-1">
                        <CardContent className="p-0">
                          {business.image_url && (
                            <div className="h-32 bg-muted rounded-t-lg overflow-hidden">
                              <img 
                                src={business.image_url} 
                                alt={business.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                            </div>
                          )}
                          
                          <div className="p-3">
                            <div className="flex items-start justify-between mb-2">
                              <h3 className="text-sm font-semibold leading-tight">{business.name}</h3>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleFavorite(business)}
                                disabled={favoritingBusinesses.has(business.name)}
                                className="p-1 hover:bg-background/80"
                              >
                                <Star 
                                  className={`h-3 w-3 transition-colors ${
                                    favoriteBusinesses.has(business.name)
                                      ? 'fill-current text-yellow-500' 
                                      : 'text-muted-foreground hover:text-yellow-500'
                                  }`} 
                                />
                              </Button>
                            </div>
                          
                            <a 
                              href={getGoogleMapsUrl(business.address)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center text-xs text-primary hover:text-primary/80 transition-colors group font-medium"
                            >
                              <Navigation className="mr-1 h-3 w-3 transition-transform group-hover:scale-110" />
                              <span className="hover:underline">{business.distance_miles?.toFixed(1)} miles away</span>
                            </a>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="text-4xl mb-4">💅</div>
                    <h3 className="text-xl font-semibold mb-2">No salons found</h3>
                    <p className="text-muted-foreground">Try the other tabs for more options.</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="spas">
                {subcategoryLoading.spas ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                    {[...Array(4)].map((_, i) => (
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
                ) : subcategoryData.spas.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                    {subcategoryData.spas.map((business) => (
                      <Card key={`spa-${business.name}`} className="group transition-all duration-300 hover:shadow-elegant hover:-translate-y-1">
                        <CardContent className="p-0">
                          {business.image_url && (
                            <div className="h-32 bg-muted rounded-t-lg overflow-hidden">
                              <img 
                                src={business.image_url} 
                                alt={business.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                            </div>
                          )}
                          
                          <div className="p-3">
                            <div className="flex items-start justify-between mb-2">
                              <h3 className="text-sm font-semibold leading-tight">{business.name}</h3>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleFavorite(business)}
                                disabled={favoritingBusinesses.has(business.name)}
                                className="p-1 hover:bg-background/80"
                              >
                                <Star 
                                  className={`h-3 w-3 transition-colors ${
                                    favoriteBusinesses.has(business.name)
                                      ? 'fill-current text-yellow-500' 
                                      : 'text-muted-foreground hover:text-yellow-500'
                                  }`} 
                                />
                              </Button>
                            </div>
                          
                            <a 
                              href={getGoogleMapsUrl(business.address)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center text-xs text-primary hover:text-primary/80 transition-colors group font-medium"
                            >
                              <Navigation className="mr-1 h-3 w-3 transition-transform group-hover:scale-110" />
                              <span className="hover:underline">{business.distance_miles?.toFixed(1)} miles away</span>
                            </a>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="text-4xl mb-4">🧘</div>
                    <h3 className="text-xl font-semibold mb-2">No spas found</h3>
                    <p className="text-muted-foreground">Try the other tabs for more options.</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          ) : ('name' in categoryConfig && categoryConfig.name === "Food Time") ? (
            // Special tabbed layout for Food Time
            <Tabs defaultValue="morning" className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-8 h-auto py-2">
                <TabsTrigger value="morning" className="flex items-center gap-1 text-xs sm:text-sm px-2 py-2 sm:px-3 sm:py-1.5" onClick={() => handleFoodSceneTabChange('morning')}>
                  <span className="hidden xs:inline">Morning</span>
                  <span className="xs:hidden">AM</span>
                </TabsTrigger>
                <TabsTrigger value="afternoon" className="flex items-center gap-1 text-xs sm:text-sm px-2 py-2 sm:px-3 sm:py-1.5" onClick={() => handleFoodSceneTabChange('afternoon')}>
                  <span className="hidden xs:inline">Afternoon</span>
                  <span className="xs:hidden">PM</span>
                </TabsTrigger>
                <TabsTrigger value="evening" className="flex items-center gap-1 text-xs sm:text-sm px-2 py-2 sm:px-3 sm:py-1.5" onClick={() => handleFoodSceneTabChange('evening')}>
                  <span className="hidden xs:inline">Evening</span>
                  <span className="xs:hidden">Night</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="morning">
                {subcategoryLoading.morning ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
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
                ) : subcategoryData.morning.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {subcategoryData.morning.map((business) => (
                      <Card key={`morning-${business.name}`} className="group transition-all duration-300 hover:shadow-elegant hover:-translate-y-1">
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
                              <h3 className="text-lg font-semibold">{business.name}</h3>
                              
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleFavorite(business)}
                                disabled={favoritingBusinesses.has(business.name)}
                                className="p-1 hover:bg-background/80"
                              >
                                <Star 
                                  className={`h-4 w-4 transition-colors ${
                                    favoriteBusinesses.has(business.name)
                                      ? 'fill-current text-yellow-500' 
                                      : 'text-muted-foreground hover:text-yellow-500'
                                  }`} 
                                />
                              </Button>
                            </div>
                          
                            <a 
                              href={getGoogleMapsUrl(business.address)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center text-sm text-primary hover:text-primary/80 transition-colors group font-medium"
                            >
                              <Navigation className="mr-1 h-3 w-3 transition-transform group-hover:scale-110" />
                              <span className="hover:underline">{business.distance_miles?.toFixed(1)} miles away</span>
                            </a>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="text-4xl mb-4">🌅</div>
                    <h3 className="text-xl font-semibold mb-2">No breakfast spots found</h3>
                    <p className="text-muted-foreground">Try the other time periods for more options.</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="afternoon">
                {subcategoryLoading.afternoon ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
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
                ) : subcategoryData.afternoon.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {subcategoryData.afternoon.map((business) => (
                      <Card key={`afternoon-${business.name}`} className="group transition-all duration-300 hover:shadow-elegant hover:-translate-y-1">
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
                              <h3 className="text-lg font-semibold">{business.name}</h3>
                              
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleFavorite(business)}
                                disabled={favoritingBusinesses.has(business.name)}
                                className="p-1 hover:bg-background/80"
                              >
                                <Star 
                                  className={`h-4 w-4 transition-colors ${
                                    favoriteBusinesses.has(business.name)
                                      ? 'fill-current text-yellow-500' 
                                      : 'text-muted-foreground hover:text-yellow-500'
                                  }`} 
                                />
                              </Button>
                            </div>
                          
                            <a 
                              href={getGoogleMapsUrl(business.address)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center text-sm text-primary hover:text-primary/80 transition-colors group font-medium"
                            >
                              <Navigation className="mr-1 h-3 w-3 transition-transform group-hover:scale-110" />
                              <span className="hover:underline">{business.distance_miles?.toFixed(1)} miles away</span>
                            </a>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="text-4xl mb-4">☀️</div>
                    <h3 className="text-xl font-semibold mb-2">No lunch spots found</h3>
                    <p className="text-muted-foreground">Try the other time periods for more options.</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="evening">
                {subcategoryLoading.evening ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
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
                ) : subcategoryData.evening.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {subcategoryData.evening.map((business) => (
                      <Card key={`evening-${business.name}`} className="group transition-all duration-300 hover:shadow-elegant hover:-translate-y-1">
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
                              <h3 className="text-lg font-semibold">{business.name}</h3>
                              
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleFavorite(business)}
                                disabled={favoritingBusinesses.has(business.name)}
                                className="p-1 hover:bg-background/80"
                              >
                                <Star 
                                  className={`h-4 w-4 transition-colors ${
                                    favoriteBusinesses.has(business.name)
                                      ? 'fill-current text-yellow-500' 
                                      : 'text-muted-foreground hover:text-yellow-500'
                                  }`} 
                                />
                              </Button>
                            </div>
                          
                            <a 
                              href={getGoogleMapsUrl(business.address)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center text-sm text-primary hover:text-primary/80 transition-colors group font-medium"
                            >
                              <Navigation className="mr-1 h-3 w-3 transition-transform group-hover:scale-110" />
                              <span className="hover:underline">{business.distance_miles?.toFixed(1)} miles away</span>
                            </a>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="text-4xl mb-4">🌙</div>
                    <h3 className="text-xl font-semibold mb-2">No dinner spots found</h3>
                    <p className="text-muted-foreground">Try the other time periods for more options.</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          ) : ('name' in categoryConfig && categoryConfig.name === "Drink Time") ? (
            // Special tabbed layout for Drink Time  
            <Tabs defaultValue="happy_hour" className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-8 h-auto py-2">
                <TabsTrigger value="happy_hour" className="flex items-center gap-1 text-xs sm:text-sm px-2 py-2 sm:px-3 sm:py-1.5" onClick={() => handleDrinkSceneTabChange('happy_hour')}>
                  <span className="hidden xs:inline">Happy Hour</span>
                  <span className="xs:hidden">🍻</span>
                </TabsTrigger>
                <TabsTrigger value="late_night" className="flex items-center gap-1 text-xs sm:text-sm px-2 py-2 sm:px-3 sm:py-1.5" onClick={() => handleDrinkSceneTabChange('late_night')}>
                  <span className="hidden xs:inline">Late Night</span>
                  <span className="xs:hidden">🌙</span>
                </TabsTrigger>
                <TabsTrigger value="wine_bar" className="flex items-center gap-1 text-xs sm:text-sm px-2 py-2 sm:px-3 sm:py-1.5" onClick={() => handleDrinkSceneTabChange('wine_bar')}>
                  <span className="hidden xs:inline">Wine & Cocktails</span>
                  <span className="xs:hidden">🍷</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="happy_hour">
                {subcategoryLoading.happy_hour ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
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
                ) : subcategoryData.happy_hour.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {subcategoryData.happy_hour.map((business) => (
                      <Card key={`happy_hour-${business.name}`} className="group transition-all duration-300 hover:shadow-elegant hover:-translate-y-1">
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
                              <h3 className="text-lg font-semibold">{business.name}</h3>
                              
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleFavorite(business)}
                                disabled={favoritingBusinesses.has(business.name)}
                                className="p-1 hover:bg-background/80"
                              >
                                <Star 
                                  className={`h-4 w-4 transition-colors ${
                                    favoriteBusinesses.has(business.name)
                                      ? 'fill-current text-yellow-500' 
                                      : 'text-muted-foreground hover:text-yellow-500'
                                  }`} 
                                />
                              </Button>
                            </div>
                          
                            <a 
                              href={getGoogleMapsUrl(business.address)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center text-sm text-primary hover:text-primary/80 transition-colors group font-medium"
                            >
                              <Navigation className="mr-1 h-3 w-3 transition-transform group-hover:scale-110" />
                              <span className="hover:underline">{business.distance_miles?.toFixed(1)} miles away</span>
                            </a>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="text-4xl mb-4">🍻</div>
                    <h3 className="text-xl font-semibold mb-2">No happy hour spots found</h3>
                    <p className="text-muted-foreground">Try the other drink categories for more options.</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="late_night">
                {subcategoryLoading.late_night ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
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
                ) : subcategoryData.late_night.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {subcategoryData.late_night.map((business) => (
                      <Card key={`late_night-${business.name}`} className="group transition-all duration-300 hover:shadow-elegant hover:-translate-y-1">
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
                              <h3 className="text-lg font-semibold">{business.name}</h3>
                              
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleFavorite(business)}
                                disabled={favoritingBusinesses.has(business.name)}
                                className="p-1 hover:bg-background/80"
                              >
                                <Star 
                                  className={`h-4 w-4 transition-colors ${
                                    favoriteBusinesses.has(business.name)
                                      ? 'fill-current text-yellow-500' 
                                      : 'text-muted-foreground hover:text-yellow-500'
                                  }`} 
                                />
                              </Button>
                            </div>
                          
                            <a 
                              href={getGoogleMapsUrl(business.address)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center text-sm text-primary hover:text-primary/80 transition-colors group font-medium"
                            >
                              <Navigation className="mr-1 h-3 w-3 transition-transform group-hover:scale-110" />
                              <span className="hover:underline">{business.distance_miles?.toFixed(1)} miles away</span>
                            </a>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="text-4xl mb-4">🌙</div>
                    <h3 className="text-xl font-semibold mb-2">No late night spots found</h3>
                    <p className="text-muted-foreground">Try the other drink categories for more options.</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="wine_bar">
                {subcategoryLoading.wine_bar ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
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
                ) : subcategoryData.wine_bar.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {subcategoryData.wine_bar.map((business) => (
                      <Card key={`wine_bar-${business.name}`} className="group transition-all duration-300 hover:shadow-elegant hover:-translate-y-1">
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
                              <h3 className="text-lg font-semibold">{business.name}</h3>
                              
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleFavorite(business)}
                                disabled={favoritingBusinesses.has(business.name)}
                                className="p-1 hover:bg-background/80"
                              >
                                <Star 
                                  className={`h-4 w-4 transition-colors ${
                                    favoriteBusinesses.has(business.name)
                                      ? 'fill-current text-yellow-500' 
                                      : 'text-muted-foreground hover:text-yellow-500'
                                  }`} 
                                />
                              </Button>
                            </div>
                          
                            <a 
                              href={getGoogleMapsUrl(business.address)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center text-sm text-primary hover:text-primary/80 transition-colors group font-medium"
                            >
                              <Navigation className="mr-1 h-3 w-3 transition-transform group-hover:scale-110" />
                              <span className="hover:underline">{business.distance_miles?.toFixed(1)} miles away</span>
                            </a>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="text-4xl mb-4">🍷</div>
                    <h3 className="text-xl font-semibold mb-2">No wine bars found</h3>
                    <p className="text-muted-foreground">Try the other drink categories for more options.</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          ) : (
            // Regular category display
            <>
              {isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
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
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
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
                              <h3 className="text-lg font-semibold">{business.name}</h3>
                              
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleFavorite(business)}
                                disabled={favoritingBusinesses.has(business.name)}
                                className="p-1 hover:bg-background/80"
                              >
                                <Star 
                                  className={`h-4 w-4 transition-colors ${
                                    favoriteBusinesses.has(business.name)
                                      ? 'fill-current text-yellow-500' 
                                      : 'text-muted-foreground hover:text-yellow-500'
                                  }`} 
                                />
                              </Button>
                            </div>
                          
                            <a 
                              href={getGoogleMapsUrl(business.address)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center text-sm text-primary hover:text-primary/80 transition-colors group font-medium mb-3"
                            >
                              <Navigation className="mr-1 h-3 w-3 transition-transform group-hover:scale-110" />
                              <span className="hover:underline">{business.distance_miles?.toFixed(1)} miles away</span>
                            </a>
                              
                              <div className="flex gap-2 mt-3">
                                <TooltipProvider>
                                  {business.website || businessWebsites[business.place_id!] ? (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <button
                                          onClick={() => window.open(business.website || businessWebsites[business.place_id!], '_blank')}
                                          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary bg-primary/5 hover:bg-primary/10 hover:font-semibold rounded-full shadow-soft hover:shadow-card transition-all duration-200 border border-primary/20 hover:border-primary/30"
                                        >
                                          <ExternalLink className="h-4 w-4" />
                                          Website
                                        </button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>Opens in new tab</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  ) : business.place_id ? (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <button
                                          onClick={() => handleGetWebsite(business)}
                                          disabled={loadingStates[business.place_id]}
                                          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary bg-primary/5 hover:bg-primary/10 hover:font-semibold rounded-full shadow-soft hover:shadow-card transition-all duration-200 border border-primary/20 hover:border-primary/30 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                          {loadingStates[business.place_id] ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                          ) : (
                                            <ExternalLink className="h-4 w-4" />
                                          )}
                                          {loadingStates[business.place_id] ? 'Loading...' : 'Get Website'}
                                        </button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>Opens in new tab</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  ) : null}
                                </TooltipProvider>
                              </div>
                          </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <h3 className="text-xl font-semibold mb-2">No places found</h3>
                  <p className="text-muted-foreground">
                    Try checking back later or explore other categories.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default PopularCategory;
