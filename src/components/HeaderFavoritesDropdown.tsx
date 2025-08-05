import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Star, ChevronDown, Trash2, MapPin, Phone, Globe, Navigation } from "lucide-react";

interface FavoriteBusiness {
  business_name: string;
  business_address: string;
  business_description?: string;
  business_phone?: string;
  business_website?: string;
  business_image?: string;
  business_features?: string[];
  distance_miles?: number;
  category: string;
  favorited_at: string;
}

export function HeaderFavoritesDropdown() {
  const [favorites, setFavorites] = useState<FavoriteBusiness[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("recent");

  useEffect(() => {
    loadFavorites();
    
    // Listen for localStorage changes from other pages
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'favorites') {
        loadFavorites();
      }
    };
    
    // Listen for manual events from same window
    const handleManualUpdate = () => {
      loadFavorites();
    };
    
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('favoritesUpdated', handleManualUpdate);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('favoritesUpdated', handleManualUpdate);
    };
  }, []);

  const loadFavorites = () => {
    const storedFavorites = localStorage.getItem('favorites');
    if (storedFavorites) {
      const parsed = JSON.parse(storedFavorites);
      setFavorites(parsed);
    }
  };

  const removeFavorite = (businessName: string) => {
    const updatedFavorites = favorites.filter(fav => fav.business_name !== businessName);
    setFavorites(updatedFavorites);
    localStorage.setItem('favorites', JSON.stringify(updatedFavorites));
    
    // Trigger event for other components to update
    window.dispatchEvent(new CustomEvent('favoritesUpdated'));
  };

  const getGoogleMapsUrl = (business: FavoriteBusiness) => {
    const query = encodeURIComponent(`${business.business_name} ${business.business_address}`);
    return `https://www.google.com/maps/search/?api=1&query=${query}`;
  };

  const filteredFavorites = favorites.filter(fav => 
    selectedCategory === "all" || fav.category === selectedCategory
  );

  const sortedFavorites = [...filteredFavorites].sort((a, b) => {
    if (sortBy === "recent") {
      return new Date(b.favorited_at).getTime() - new Date(a.favorited_at).getTime();
    }
    if (sortBy === "distance") {
      return (a.distance_miles || 0) - (b.distance_miles || 0);
    }
    return a.business_name.localeCompare(b.business_name);
  });

  const categories = Array.from(new Set(favorites.map(fav => fav.category)));

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="w-full justify-start flex items-center">
          <Star className="h-4 w-4 mr-2" />
          My Favorites
          <span className="ml-auto text-xs text-muted-foreground">
            {favorites.length}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[500px] p-0 bg-background border border-border shadow-lg z-50">
        <div className="p-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-foreground">My Favorites</h3>
              <p className="text-sm text-muted-foreground">{favorites.length} saved places</p>
            </div>
            
            <div className="flex items-center space-x-2">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {categories.map(category => (
                    <SelectItem key={category} value={category}>
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-24">
                  <SelectValue placeholder="Sort" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recent">Recent</SelectItem>
                  <SelectItem value="distance">Distance</SelectItem>
                  <SelectItem value="name">Name</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Favorites List */}
          {favorites.length === 0 ? (
            <div className="text-center py-8">
              <Star className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No favorites yet</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {sortedFavorites.slice(0, 8).map((business, index) => (
                <div key={index} className="flex items-start space-x-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                  {business.business_image && (
                    <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                      <img 
                        src={business.business_image} 
                        alt={business.business_name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm text-foreground truncate">
                      {business.business_name}
                    </h4>
                    <p className="text-xs text-muted-foreground truncate">
                      {business.business_address}
                    </p>
                    <div className="flex items-center space-x-1 mt-1">
                      <span className="text-xs bg-muted px-1.5 py-0.5 rounded">
                        {business.category}
                      </span>
                      {business.distance_miles && (
                        <span className="text-xs text-muted-foreground">
                          {business.distance_miles.toFixed(1)} mi
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(getGoogleMapsUrl(business), '_blank')}
                      className="h-6 w-6 p-0"
                      title="Get directions"
                    >
                      <Navigation className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFavorite(business.business_name)}
                      className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                      title="Remove favorite"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
              
              {sortedFavorites.length > 8 && (
                <div className="text-center pt-2 border-t">
                  <p className="text-xs text-muted-foreground">
                    {sortedFavorites.length - 8} more favorites...
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}