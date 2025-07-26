import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin, Loader2 } from "lucide-react";

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
}

interface AddressSuggestion {
  place_id: string;
  description: string;
  main_text: string;
  secondary_text: string;
}

export function AddressAutocomplete({ value, onChange, placeholder, label }: AddressAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  const fetchSuggestions = async (input: string) => {
    if (input.length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setIsLoading(true);
    try {
      // Use OpenStreetMap Nominatim API for address suggestions
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=5&q=${encodeURIComponent(input)}&countrycodes=us`,
        {
          headers: {
            'User-Agent': 'CalmlySettled/1.0'
          }
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        const formattedSuggestions: AddressSuggestion[] = data.map((item: any, index: number) => {
          // Parse address components to format properly
          const address = item.address || {};
          const components = [];
          
          // Street address (house number + street name)
          const streetParts = [];
          if (address.house_number) streetParts.push(address.house_number);
          if (address.road) streetParts.push(address.road);
          const streetAddress = streetParts.join(' ');
          
          // Build formatted address: Street, City, State ZIP, Country
          if (streetAddress) components.push(streetAddress);
          if (address.city || address.town || address.village) {
            components.push(address.city || address.town || address.village);
          }
          if (address.state) {
            const stateZip = address.postcode ? `${address.state} ${address.postcode}` : address.state;
            components.push(stateZip);
          }
          if (address.country && address.country !== 'United States') {
            components.push(address.country);
          }
          
          const formattedAddress = components.join(', ');
          const mainText = streetAddress || (address.city || address.town || address.village) || item.display_name.split(',')[0];
          const secondaryText = components.slice(1).join(', ');
          
          return {
            place_id: item.place_id || index.toString(),
            description: formattedAddress || item.display_name,
            main_text: mainText,
            secondary_text: secondaryText
          };
        });
        
        setSuggestions(formattedSuggestions);
        setShowSuggestions(formattedSuggestions.length > 0);
      }
    } catch (error) {
      console.error('Error fetching address suggestions:', error);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    onChange(inputValue);
    setSelectedIndex(-1);

    // Debounce the API call
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    
    debounceTimer.current = setTimeout(() => {
      fetchSuggestions(inputValue);
    }, 300);
  };

  const handleSuggestionClick = (suggestion: AddressSuggestion) => {
    onChange(suggestion.description);
    setShowSuggestions(false);
    setSuggestions([]);
    setSelectedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleSuggestionClick(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedIndex(-1);
        break;
    }
  };

  const handleBlur = () => {
    // Delay hiding suggestions to allow clicks to register
    setTimeout(() => {
      setShowSuggestions(false);
      setSelectedIndex(-1);
    }, 200);
  };

  const handleFocus = () => {
    if (suggestions.length > 0) {
      setShowSuggestions(true);
    }
  };

  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, []);

  return (
    <div className="space-y-4">
      {label && <Label htmlFor="address-input">{label}</Label>}
      <div className="relative">
        <div className="relative">
          <Input
            id="address-input"
            ref={inputRef}
            placeholder={placeholder || "Start typing an address..."}
            value={value}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            onFocus={handleFocus}
            className="text-lg pr-10"
            autoComplete="address-line1"
          />
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : (
              <MapPin className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </div>

        {/* Suggestions Dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div
            ref={suggestionsRef}
            className="absolute z-50 w-full mt-1 bg-background border border-border rounded-md shadow-lg max-h-60 overflow-auto"
          >
            {suggestions.map((suggestion, index) => (
              <div
                key={suggestion.place_id}
                className={`px-4 py-3 cursor-pointer hover:bg-muted transition-colors ${
                  index === selectedIndex ? 'bg-muted' : ''
                }`}
                onClick={() => handleSuggestionClick(suggestion)}
              >
                <div className="flex items-start gap-3">
                  <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-foreground truncate">
                      {suggestion.main_text}
                    </div>
                    <div className="text-sm text-muted-foreground truncate">
                      {suggestion.secondary_text}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      <p className="text-sm text-muted-foreground">
        We'll use this to calculate distances to local businesses and provide more accurate recommendations.
      </p>
    </div>
  );
}