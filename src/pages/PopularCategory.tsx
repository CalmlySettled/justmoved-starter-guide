import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, Star, ExternalLink, ArrowLeft, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSmartToast } from "@/hooks/useSmartToast";
import { useBusinessDetails } from "@/hooks/useBusinessDetails";
import { useIsMobile } from "@/hooks/use-mobile";
import { useRequestCache } from "@/hooks/useRequestCache";
import QuickSelectTags from "@/components/QuickSelectTags";
import { getSubfiltersForCategory, type Subfilter } from "@/data/subfilters";
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
  subfilter_tags?: string[];
  latitude: number;
  longitude: number;
  distance_miles: number;
  rating?: number;
  is_favorite?: boolean;
  place_id?: string;
}

const trendingCategories = [
  {
    name: "Drink Time",
    icon: "☕🍺",
    searchTerms: ["Organic", "International", "Budget-Friendly", "Specialty", "Full-Service"],
    color: "bg-amber-500",
    description: "Coffee culture and local brews",
  },
  {
    name: "Art & Culture",
    icon: "🎨",
    searchTerms: ["Museum", "Gallery", "Theater", "Historical Site"],
    color: "bg-pink-500",
    description: "Creative spaces and exhibitions",
  },
  {
    name: "Outdoor Activities",
    icon: "🏃",
    searchTerms: ["Park", "Trail", "Recreation", "Sports"],
    color: "bg-green-500",
    description: "Get active in nature",
  },
  {
    name: "Live Music",
    icon: "🎵",
    searchTerms: ["live music venue", "concert hall", "music bar"],
    color: "bg-blue-500",
    description: "Catch local performances",
  },
  {
    name: "Faith Communities",
    icon: "⛪",
    searchTerms: ["Christian", "Catholic", "Jewish", "Non-Denominational"],
    color: "bg-indigo-500",
    description: "Find spiritual communities and places of worship",
  },
  {
    name: "Food Time",
    icon: "🍴",
    searchTerms: ["restaurant", "dining", "food truck", "bistro"],
    color: "bg-red-500",
    description: "Savor the local dining experiences",
  },
  {
    name: "Shopping",
    icon: "🛍️",
    searchTerms: ["Boutique", "Department Store", "Specialty Shop", "Mall"],
    color: "bg-cyan-500",
    description: "Boutiques and specialty retail",
  },
  {
    name: "Personal Care & Wellness",
    icon: "💇‍♂️🧘‍♀️",
    searchTerms: ["Salon", "Spa", "Barber", "Nails", "Massage"],
    color: "bg-emerald-500",
    description: "Haircuts, Styling & Relaxation",
  },
  {
    name: "Local Events",
    icon: "📅",
    searchTerms: ["event venue", "community center", "entertainment venue", "theater", "event space"],
    color: "bg-violet-500",
    description: "Find venues hosting local events and activities",
  },
  {
    name: "Games",
    icon: "🎮",
    searchTerms: ["Arcade", "Board Games", "Mini Golf", "Bowling"],
    color: "bg-purple-500",
    description: "Entertainment and indoor fun",
  },
];

const spotlightSections = [
  {
    title: "Weekend Hotspots",
    description: "Where locals spend their weekends",
    searchTerms: ["popular restaurant", "weekend market", "entertainment venue"],
  },
  {
    title: "Late Night Eats",
    description: "Open when hunger strikes after hours",
    searchTerms: ["late night food", "24 hour restaurant", "midnight snack"],
  },
  {
    title: "Social Scene",
    description: "Meet new people and make connections",
    searchTerms: ["social club", "meetup space", "community center"],
  },
];

const PopularCategory = () => {
  const { category } = useParams<{ category: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [location, setLocation] = useState<LocationData | null>(null);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [favoriteBusinesses, setFavoriteBusinesses] = useState<Set<string>>(new Set());
  const [favoritingBusinesses, setFavoritingBusinesses] = useState<Set<string>>(new Set());
  const [businessWebsites, setBusinessWebsites] = useState<Record<string, string>>({});

  // Time-based filtering state
  const [currentTimeContext, setCurrentTimeContext] = useState<string>("");
  const [isTimeBasedCategory, setIsTimeBasedCategory] = useState<boolean>(false);

  // Subfilter state
  const [selectedSubfilters, setSelectedSubfilters] = useState<string[]>([]);
  const [availableSubfilters, setAvailableSubfilters] = useState<Subfilter[]>([]);

  // Property context for QR code users
  const [propertyContext, setPropertyContext] = useState<{
    id: string;
    name: string;
    address: string;
  } | null>(null);

  const { getBusinessDetails, loadingStates } = useBusinessDetails();
  const { showFavoriteToast } = useSmartToast();
  const { getCached, setCached, checkBackendCache, setCurrentUserId } = useRequestCache();

  // Set current user for cache
  useEffect(() => {
    setCurrentUserId(user?.id || null);
  }, [user?.id, setCurrentUserId]);

  // Load property context if QR code was used
  useEffect(() => {
    const qrPropertyToken = sessionStorage.getItem("qr_property_token");
    const qrPropertyContextStr = sessionStorage.getItem("qr_property_context");

    if (qrPropertyToken && qrPropertyContextStr) {
      try {
        const context = JSON.parse(qrPropertyContextStr);
        setPropertyContext(context);
        console.log("🏢 Property context loaded for QR user on Popular page:", context.name);
      } catch (error) {
        console.error("Error loading property context:", error);
      }
    }
  }, []);

  // Find category config
  const categoryConfig =
    trendingCategories.find((cat) => cat.name.toLowerCase().replace(/\s+/g, "-").replace(/&/g, "and") === category) ||
    spotlightSections.find((section) => section.title.toLowerCase().replace(/\s+/g, "-") === category);

  useEffect(() => {
    const loadLocation = async () => {
      if (user) {
        try {
          const { data: profile } = await supabase.from("profiles").select("address").eq("user_id", user.id).single();

          if (profile?.address) {
            // Geocode the saved address to get coordinates and city
            const response = await fetch(
              `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=1&q=${encodeURIComponent(profile.address)}&countrycodes=us`,
              {
                headers: {
                  "User-Agent": "CalmlySettled/1.0",
                },
              },
            );

            if (response.ok) {
              const data = await response.json();
              if (data.length > 0) {
                setLocation({
                  latitude: parseFloat(data[0].lat),
                  longitude: parseFloat(data[0].lon),
                  city:
                    data[0].address?.city ||
                    data[0].address?.town ||
                    data[0].address?.village ||
                    data[0].display_name.split(",")[1]?.trim() ||
                    profile.address,
                });
                return;
              }
            }
          }
        } catch (error) {
          console.error("Error loading saved location:", error);
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
                    "User-Agent": "CalmlySettled/1.0",
                  },
                },
              );

              if (response.ok) {
                const data = await response.json();
                const city = data.address?.city || data.address?.town || data.address?.village || "Your Location";

                setLocation({
                  latitude: position.coords.latitude,
                  longitude: position.coords.longitude,
                  city,
                });
              }
            } catch (error) {
              console.error("Error reverse geocoding:", error);
              setLocation({
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                city: "Your Location",
              });
            }
          },
          (error) => {
            console.error("Error getting location:", error);
          },
        );
      }
    };

    const loadFavorites = async () => {
      if (!user) {
        setFavoriteBusinesses(new Set());
        return;
      }

      try {
        const { data: favorites, error } = await supabase
          .from("user_recommendations")
          .select("business_name")
          .eq("user_id", user.id)
          .eq("is_favorite", true);

        if (error) {
          console.error("Error loading favorites:", error);
          return;
        }

        const favoriteNames = new Set(favorites?.map((fav) => fav.business_name) || []);
        setFavoriteBusinesses(favoriteNames);
      } catch (error) {
        console.error("Error loading favorites:", error);
      }
    };

    loadLocation();
    loadFavorites();
  }, [user]);

  // Helper function to get time-based search terms
  const getTimeBasedSearchTerms = (categoryName: string) => {
    const hour = new Date().getHours();

    switch (categoryName) {
      case "Food Time":
        if (hour >= 6 && hour < 11) {
          setCurrentTimeContext("breakfast spots");
          return ["breakfast", "cafe", "coffee shop", "brunch"];
        } else if (hour >= 11 && hour < 17) {
          setCurrentTimeContext("lunch destinations");
          return ["lunch", "bistro", "sandwich shop", "quick service"];
        } else {
          setCurrentTimeContext("dinner experiences");
          return ["restaurant", "dining", "dinner", "food truck"];
        }

      case "Drink Time":
        if (hour >= 6 && hour < 17) {
          setCurrentTimeContext("coffee culture");
          return ["coffee shop", "cafe", "specialty coffee"];
        } else {
          setCurrentTimeContext("evening beverages");
          return ["brewery", "brewpub", "craft beer", "bar"];
        }

      default:
        return categoryConfig?.searchTerms || [];
    }
  };

  useEffect(() => {
    if (location && categoryConfig && "name" in categoryConfig) {
      const categoryName = categoryConfig.name;
      const timeBasedCategories = ["Food Time", "Drink Time"];

      if (timeBasedCategories.includes(categoryName)) {
        setIsTimeBasedCategory(true);
        // Use time-based search terms
        const timeBasedTerms = getTimeBasedSearchTerms(categoryName);
        fetchCategoryPlacesWithCustomTerms(timeBasedTerms);
      } else {
        setIsTimeBasedCategory(false);
        setCurrentTimeContext("");
        fetchCategoryPlaces();
      }
    }
  }, [location, categoryConfig]);

  const fetchCategoryPlaces = async () => {
    if (!location || !categoryConfig) return;
    const searchTerms = categoryConfig.searchTerms;
    await fetchCategoryPlacesWithCustomTerms(searchTerms);
  };

  const fetchCategoryPlacesWithCustomTerms = async (searchTerms: string[]) => {
    if (!location) return;

    setLoading(true);

    try {
      // Check frontend cache first with standardized cache type
      const cacheType = "popular_category_results";

      const cachedData = getCached(
        cacheType,
        {
          latitude: location.latitude,
          longitude: location.longitude,
          categories: searchTerms,
        },
        true,
      );

      if (cachedData) {
        console.log(`💰 FRONTEND CACHE HIT for popular category`);
        setBusinesses(cachedData);
        extractAvailableSubfilters(cachedData);
        setLoading(false);
        return;
      }

      // Check backend cache
      const backendCached = await checkBackendCache(
        {
          lat: location.latitude,
          lng: location.longitude,
        },
        searchTerms,
      );

      if (backendCached) {
        console.log(`💰 BACKEND CACHE HIT for popular category`);
        const allResults: Business[] = [];
        searchTerms.forEach((term) => {
          if (backendCached[term]) {
            allResults.push(...backendCached[term]);
          }
        });

        if (allResults.length > 0) {
          const sortedResults = allResults
            .sort((a, b) => (a.distance_miles || 0) - (b.distance_miles || 0))
            .slice(0, 12);

          setBusinesses(sortedResults);
          setCached(
            cacheType,
            {
              latitude: location.latitude,
              longitude: location.longitude,
              categories: searchTerms,
            },
            sortedResults,
            true,
          );
          extractAvailableSubfilters(sortedResults);
          setLoading(false);
          return;
        }
      }

      console.log(`🔄 CACHE MISS - Querying curated data directly`);

      // Query curated data directly if user has property_id
      if (user) {
        const { data: profile } = await supabase.from("profiles").select("property_id").eq("user_id", user.id).single();

        if (profile?.property_id) {
          console.log(`🏢 Querying curated data for property: ${profile.property_id}`);

          let query = supabase
            .from("curated_property_places")
            .select("*")
            .eq("property_id", profile.property_id)
            .eq("is_active", true)
            .eq("category", categoryConfig.name);

          if (categoryConfig.name === "Food Time" || categoryConfig.name === "Drink Time") {
            query = query.overlaps("subfilter_tags", searchTerms);
          }

          const { data: curatedData, error: curatedError } = await query;

          if (!curatedError && curatedData && curatedData.length > 0) {
            console.log(`💰 Found ${curatedData.length} curated businesses`);

            const sortedResults = curatedData
              .map((place) => ({
                name: place.business_name,
                address: place.business_address,
                phone: place.business_phone,
                website: place.business_website,
                description: place.business_description,
                features: place.business_features || [],
                latitude: place.latitude,
                longitude: place.longitude,
                distance_miles: place.distance_miles,
                place_id: place.place_id,
                photo_url: place.photo_url,
                rating: place.rating,
              }))
              .sort((a, b) => (a.distance_miles || 0) - (b.distance_miles || 0))
              .slice(0, 12);

            setBusinesses(sortedResults);
            setCached(
              cacheType,
              {
                latitude: location.latitude,
                longitude: location.longitude,
                categories: searchTerms,
              },
              sortedResults,
              true,
            );
            console.log(`💾 Cached ${sortedResults.length} curated places`);

            // Extract available subfilters from loaded businesses
            extractAvailableSubfilters(sortedResults);
            setLoading(false);
            return;
          }
        }
      }

      // No curated data available
      toast("Recommendations Coming Soon", {
        description: "Your property manager is preparing personalized recommendations.",
      });
      setBusinesses([]);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching category places:", error);
      console.error("Failed to load places. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Extract unique subfilters from businesses and map to Subfilter objects
  const extractAvailableSubfilters = (businessList: Business[]) => {
    const subfilterSet = new Set<string>();
    businessList.forEach((b) => {
      if (b.subfilter_tags) {
        b.subfilter_tags.forEach((tag) => subfilterSet.add(tag));
      }
    });

    // Map to full subfilter objects from the category definition
    const categoryName = "name" in categoryConfig! ? categoryConfig!.name : categoryConfig!.title;
    const categorySubfilters = getSubfiltersForCategory(categoryName);
    const availableOnes = categorySubfilters.filter((sf) => subfilterSet.has(sf.id));
    setAvailableSubfilters(availableOnes);
  };

  // Filter businesses based on selected subfilters
  const filteredBusinesses =
    selectedSubfilters.length === 0
      ? businesses
      : businesses.filter((b) => b.subfilter_tags?.some((tag) => selectedSubfilters.includes(tag)));

  const getGoogleMapsUrl = (address: string) => {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  };

  const handleGetWebsite = async (business: Business) => {
    if (!business.place_id) return;

    const details = await getBusinessDetails(business.place_id, business.name);
    if (details?.website) {
      setBusinessWebsites((prev) => ({ ...prev, [business.place_id!]: details.website! }));
    }
  };

  const toggleFavorite = async (business: Business) => {
    if (!user) {
      console.error("Please log in to favorite businesses.");
      return;
    }

    const businessKey = business.name;
    setFavoritingBusinesses((prev) => new Set(prev).add(businessKey));

    try {
      const category = "name" in categoryConfig ? categoryConfig.name : categoryConfig.title;

      // First check if the business is already saved
      const { data: existingRecommendations, error: fetchError } = await supabase
        .from("user_recommendations")
        .select("id, is_favorite")
        .eq("user_id", user.id)
        .eq("business_name", business.name)
        .eq("business_address", business.address)
        .eq("category", category);

      if (fetchError) {
        throw fetchError;
      }

      if (existingRecommendations && existingRecommendations.length > 0) {
        // Check if ANY record is currently favorited
        const anyFavorited = existingRecommendations.some((rec) => rec.is_favorite);
        const newFavoriteStatus = !anyFavorited;

        // Update ALL matching records to have the same favorite status
        const { error: updateError } = await supabase
          .from("user_recommendations")
          .update({ is_favorite: newFavoriteStatus })
          .eq("user_id", user.id)
          .eq("business_name", business.name)
          .eq("business_address", business.address)
          .eq("category", category);

        if (updateError) {
          throw updateError;
        }

        // Update local state
        setFavoriteBusinesses((prev) => {
          const newSet = new Set(prev);
          if (newFavoriteStatus) {
            newSet.add(businessKey);
          } else {
            newSet.delete(businessKey);
          }
          return newSet;
        });

        showFavoriteToast(newFavoriteStatus ? "added" : "removed");
      } else {
        // Save as new recommendation with favorite status
        const imageUrl = business.image_url && business.image_url.trim() !== "" ? business.image_url : null;

        const { error: insertError } = await supabase.from("user_recommendations").insert({
          user_id: user.id,
          category: category,
          business_name: business.name,
          business_address: business.address,
          business_description: business.description || `Great ${category} option`,
          business_phone: business.phone,
          business_website: business.website,
          business_image: imageUrl,
          business_features: business.features || [],
          business_latitude: business.latitude,
          business_longitude: business.longitude,
          distance_miles: business.distance_miles,
          place_id: business.place_id,
          is_favorite: true,
        });

        if (insertError) {
          throw insertError;
        }

        // Update local state
        setFavoriteBusinesses((prev) => new Set(prev).add(businessKey));

        showFavoriteToast("added");
      }
    } catch (error: any) {
      console.error("Error favoriting business:", error);
      console.error("Failed to update favorites");
    } finally {
      setFavoritingBusinesses((prev) => {
        const newSet = new Set(prev);
        newSet.delete(businessKey);
        return newSet;
      });
    }
  };

  if (!categoryConfig) {
    return (
      <div className="min-h-screen bg-gradient-subtle">
        <Header />
        <main className="pt-24 pb-16">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center">
            <h1 className="text-2xl font-bold mb-4">Category Not Found</h1>
            <Button onClick={() => navigate("/popular")}>
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
            <Button onClick={() => navigate("/popular")} variant="ghost" size="sm" className="h-8 w-8 p-0">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-lg font-semibold text-foreground truncate">
              {"name" in categoryConfig ? categoryConfig.name : categoryConfig.title}
            </h1>
          </div>
        </div>
      )}

      <main className={isMobile ? "pb-16" : "pt-24 pb-16"}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          {/* Header Section */}
          <div className="mb-8">
            <Button variant="ghost" onClick={() => navigate("/popular")} className="mb-6 hover:bg-background/80">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Return to Popular
            </Button>

            <div className="text-center">
              <div className="flex items-center justify-center mb-6">
                {"icon" in categoryConfig && (
                  <div
                    className={`w-16 h-16 rounded-full ${trendingCategories.find((cat) => cat.name === categoryConfig.name)?.color || "bg-primary"} flex items-center justify-center text-2xl`}
                  >
                    {categoryConfig.icon}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Time Context Banner */}
          {isTimeBasedCategory && currentTimeContext && (
            <div className="mb-6 text-center">
              <Badge variant="outline" className="px-4 py-2 text-sm">
                Showing {currentTimeContext} •{" "}
                {new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
              </Badge>
            </div>
          )}

          {/* Subfilter Selection */}
          {!loading && availableSubfilters.length > 0 && (
            <div className="mb-6 bg-card/50 backdrop-blur-sm border border-border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-foreground">
                  Filter by type {selectedSubfilters.length > 0 && `(${selectedSubfilters.length} selected)`}
                </h3>
                {selectedSubfilters.length > 0 && (
                  <Button variant="ghost" size="sm" onClick={() => setSelectedSubfilters([])} className="h-7 text-xs">
                    Clear filters
                  </Button>
                )}
              </div>
              <QuickSelectTags
                category={"name" in categoryConfig ? categoryConfig.name : categoryConfig.title}
                selectedTags={selectedSubfilters}
                onTagToggle={(tagId) => {
                  setSelectedSubfilters((prev) =>
                    prev.includes(tagId) ? prev.filter((t) => t !== tagId) : [...prev, tagId],
                  );
                }}
                type="subfilter"
              />
            </div>
          )}

          {/* Results Section */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {[...Array(8)].map((_, i) => (
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
          ) : filteredBusinesses.length > 0 ? (
            <div className="space-y-4">
              {selectedSubfilters.length > 0 && (
                <div className="text-sm text-muted-foreground">
                  Showing {filteredBusinesses.length} {filteredBusinesses.length === 1 ? "result" : "results"}
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                {filteredBusinesses.map((business) => (
                  <Card
                    key={business.name}
                    className="group transition-all duration-300 hover:shadow-elegant hover:-translate-y-1"
                  >
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
                          <h3 className="text-lg font-semibold leading-tight">{business.name}</h3>
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
                                  ? "fill-current text-yellow-500"
                                  : "text-muted-foreground hover:text-yellow-500"
                              }`}
                            />
                          </Button>
                        </div>

                        <div className="space-y-2">
                          {business.address && (
                            <a
                              href={getGoogleMapsUrl(business.address)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center text-sm text-muted-foreground hover:text-primary transition-colors group"
                            >
                              <MapPin className="mr-1 h-3 w-3 transition-transform group-hover:scale-110" />
                              <span className="line-clamp-1 hover:underline">{business.address}</span>
                            </a>
                          )}

                          {business.distance_miles && business.distance_miles > 0 && (
                            <div className="text-sm font-medium text-primary">
                              {business.distance_miles.toFixed(1)} miles away
                            </div>
                          )}

                          {business.rating && (
                            <div className="flex items-center text-sm text-muted-foreground">
                              <Star className="mr-1 h-3 w-3 fill-current text-yellow-500" />
                              <span>{business.rating.toFixed(1)}</span>
                            </div>
                          )}

                          {business.phone && <div className="text-sm text-muted-foreground">📞 {business.phone}</div>}

                          {business.features && business.features.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {business.features.slice(0, 3).map((feature, index) => (
                                <Badge key={index} variant="secondary" className="text-xs">
                                  {feature}
                                </Badge>
                              ))}
                            </div>
                          )}

                          <div className="flex gap-2 pt-2">
                            {business.website ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => window.open(business.website, "_blank")}
                                className="text-xs"
                              >
                                <ExternalLink className="mr-1 h-3 w-3" />
                                Website
                              </Button>
                            ) : (
                              business.place_id && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleGetWebsite(business)}
                                  disabled={loadingStates[business.place_id]}
                                  className="text-xs"
                                >
                                  {loadingStates[business.place_id] ? (
                                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                  ) : (
                                    <ExternalLink className="mr-1 h-3 w-3" />
                                  )}
                                  {businessWebsites[business.place_id] ? "Visit" : "Get Website"}
                                </Button>
                              )
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ) : selectedSubfilters.length > 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">🔍</div>
              <h3 className="text-xl font-semibold mb-2">No matches found</h3>
              <p className="text-muted-foreground mb-4">Try selecting different filters to see more results.</p>
              <Button variant="outline" onClick={() => setSelectedSubfilters([])}>
                Clear all filters
              </Button>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">
                {"name" in categoryConfig && categoryConfig.name === "Personal Care & Wellness"
                  ? "💇‍♀️"
                  : "name" in categoryConfig && categoryConfig.name === "Food Time"
                    ? "🍴"
                    : "name" in categoryConfig && categoryConfig.name === "Drink Time"
                      ? "☕"
                      : "🏪"}
              </div>
              <h3 className="text-xl font-semibold mb-2">No places found</h3>
              <p className="text-muted-foreground">Try checking back later for new recommendations.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default PopularCategory;
