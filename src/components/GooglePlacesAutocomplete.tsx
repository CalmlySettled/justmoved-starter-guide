import React, { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Loader2, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface PlaceDetails {
  name: string;
  formatted_address: string;
  rating?: number;
  formatted_phone_number?: string;
  website?: string;
  opening_hours?: {
    weekday_text: string[];
  };
  types: string[];
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
}

// Very loose type for predictions so it works with different Google APIs
interface PlacePrediction {
  place_id?: string;
  description?: string;
  name?: string;
  formatted_address?: string;
  vicinity?: string;
  types?: string[];
  structured_formatting?: {
    main_text?: string;
    secondary_text?: string;
  };
}

interface GooglePlacesAutocompleteProps {
  onPlaceSelect: (place: PlaceDetails) => void;
  placeholder?: string;
  className?: string;
  category?: string;
}

const GooglePlacesAutocomplete: React.FC<GooglePlacesAutocompleteProps> = ({
  onPlaceSelect,
  placeholder = "Search for a business...",
  className = "",
  category = "",
}) => {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<PlacePrediction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Helper: extract predictions array from any response shape
  const extractPredictions = (data: any): PlacePrediction[] => {
    if (!data) return [];

    // If the function returns the array directly
    if (Array.isArray(data)) return data;

    // Classic Google Autocomplete response: { predictions: [...] }
    if (Array.isArray(data.predictions)) return data.predictions;

    // Text search style: { results: [...] }
    if (Array.isArray(data.results)) return data.results;

    // Nested `{ data: { predictions: [...] } }`
    if (data.data && Array.isArray(data.data.predictions)) {
      return data.data.predictions;
    }

    return [];
  };

  const searchPlaces = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("search-google-places", {
        body: { query: searchQuery },
      });

      if (error) throw error;

      console.log("search-google-places result:", data); // 👈 check this in devtools

      const predictions = extractPredictions(data);
      setSuggestions(predictions);
      setIsOpen(true);
    } catch (error) {
      console.error("Error searching places:", error);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  };

  const getPlaceDetails = async (placeId: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("get-place-details", {
        body: { place_id: placeId },
      });

      if (error) throw error;

      console.log("get-place-details result:", data); // 👈 inspect once

      onPlaceSelect(data as PlaceDetails);
      setQuery((data as PlaceDetails).name || "");
      setIsOpen(false);
    } catch (error) {
      console.error("Error getting place details:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);

    // Clear previous timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Debounce the search
    timeoutRef.current = setTimeout(() => {
      searchPlaces(value);
    }, 1000);
  };

  const handleSuggestionClick = (suggestion: PlacePrediction) => {
    if (!suggestion.place_id) return;
    getPlaceDetails(suggestion.place_id);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <div className="relative">
        <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={handleInputChange}
          placeholder={placeholder}
          className="pl-10 pr-10"
          onFocus={() => {
            if (suggestions.length > 0) setIsOpen(true);
          }}
        />
        {isLoading && <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-muted-foreground" />}
      </div>

      {isOpen && suggestions.length > 0 && (
        <Card className="absolute top-full left-0 right-0 z-50 mt-1 max-h-80 overflow-y-auto">
          <div className="p-2">
            {suggestions.map((suggestion, index) => {
              const key = suggestion.place_id || index;

              const mainText =
                suggestion.structured_formatting?.main_text || suggestion.name || suggestion.description || "";

              const secondaryText =
                suggestion.structured_formatting?.secondary_text ||
                suggestion.formatted_address ||
                suggestion.vicinity ||
                suggestion.description ||
                "";

              const types = suggestion.types || [];

              return (
                <Button
                  key={key}
                  variant="ghost"
                  className="w-full justify-start p-3 h-auto text-left"
                  onClick={() => handleSuggestionClick(suggestion)}
                >
                  <div className="flex items-start gap-3">
                    <MapPin className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{mainText}</div>
                      {secondaryText && <div className="text-sm text-muted-foreground truncate">{secondaryText}</div>}
                      {types.length > 0 && (
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {types.slice(0, 2).map((type) => (
                            <Badge key={type} variant="outline" className="text-xs">
                              {type.replace(/_/g, " ")}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </Button>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
};

export default GooglePlacesAutocomplete;
