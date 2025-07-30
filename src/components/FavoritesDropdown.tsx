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

export function FavoritesDropdown() {
  const [favorites, setFavorites] = useState<FavoriteBusiness[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("recent");

  useEffect(() => {
    loadFavorites();
    
    // Listen for localStorage changes from other pages
    const handleStorageChange = (e: StorageEvent) => {
      console.log('🔥 DROPDOWN - Storage change detected:', e);
      if (e.key === 'favorites') {
        loadFavorites();
      }
    };
    
    // Listen for manual events from same window
    const handleManualUpdate = () => {
      console.log('🔥 DROPDOWN - Manual favorites update detected');
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
    console.log('🔥 DROPDOWN - loadFavorites called');
    const storedFavorites = localStorage.getItem('favorites');
    console.log('🔥 DROPDOWN - Raw localStorage:', storedFavorites);
    if (storedFavorites) {
      const parsed = JSON.parse(storedFavorites);
      console.log('🔥 DROPDOWN - Parsed favorites:', parsed);
      setFavorites(parsed);
    }
  };

  const removeFavorite = (businessName: string) => {
    const updatedFavorites = favorites.filter(fav => fav.business_name !== businessName);
    setFavorites(updatedFavorites);
    localStorage.setItem('favorites', JSON.stringify(updatedFavorites));
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
        <Button variant="ghost" className="flex items-center space-x-2 text-muted-foreground hover:text-foreground transition-smooth">
          <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
            <Star className="h-4 w-4 text-primary" />
          </div>
          <span>My Favorites</span>
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" className="w-[800px] p-0 bg-background border border-border shadow-lg z-50">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center">
                <Star className="h-6 w-6 text-yellow-600 fill-yellow-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-foreground">My Favorites</h2>
                <p className="text-muted-foreground">{favorites.length} favorite places</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map(category => (
                    <SelectItem key={category} value={category}>
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Recent" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recent">Recent</SelectItem>
                  <SelectItem value="distance">Distance</SelectItem>
                  <SelectItem value="name">Name</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Favorites Grid */}
          {favorites.length === 0 ? (
            <div className="text-center py-12">
              <Star className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No favorites yet</h3>
              <p className="text-muted-foreground">Start exploring and star your favorite places!</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 max-h-96 overflow-y-auto">
              {sortedFavorites.map((business, index) => (
                <Card key={index} className="relative overflow-hidden hover:shadow-md transition-shadow">
                  {/* Action Buttons */}
                  <div className="absolute top-2 right-2 flex space-x-1 z-10">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 bg-white/90 hover:bg-white"
                    >
                      <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFavorite(business.business_name)}
                      className="h-8 w-8 p-0 bg-white/90 hover:bg-white hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  {business.business_image && (
                    <div className="aspect-video w-full overflow-hidden">
                      <img 
                        src={business.business_image} 
                        alt={business.business_name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  <CardContent className="p-4">
                    {/* Category Badge */}
                    <div className="mb-2">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                        <MapPin className="h-3 w-3 mr-1" />
                        {business.category.charAt(0).toUpperCase() + business.category.slice(1)}
                      </span>
                    </div>

                    <h3 className="font-semibold text-foreground text-lg mb-1">
                      {business.business_name}
                    </h3>
                    
                    <div className="flex items-center text-muted-foreground text-sm mb-2">
                      <MapPin className="h-4 w-4 mr-1" />
                      <span className="text-blue-600 hover:underline cursor-pointer">
                        {business.business_address}
                      </span>
                    </div>
                    
                    {business.distance_miles && (
                      <div className="flex items-center text-muted-foreground text-sm mb-3">
                        <Navigation className="h-4 w-4 mr-1" />
                        <span>{business.distance_miles.toFixed(1)} mi</span>
                      </div>
                    )}

                    {business.business_description && (
                      <p className="text-muted-foreground text-sm mb-3 line-clamp-2">
                        {business.business_description}
                      </p>
                    )}

                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(getGoogleMapsUrl(business), '_blank')}
                        className="flex items-center"
                      >
                        <Navigation className="h-4 w-4 mr-1" />
                        Directions
                      </Button>
                      
                      {business.business_phone && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(`tel:${business.business_phone}`, '_self')}
                          className="flex items-center"
                        >
                          <Phone className="h-4 w-4 mr-1" />
                          Call
                        </Button>
                      )}
                      
                      {business.business_website && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(business.business_website, '_blank')}
                          className="flex items-center"
                        >
                          <Globe className="h-4 w-4 mr-1" />
                          Website
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}