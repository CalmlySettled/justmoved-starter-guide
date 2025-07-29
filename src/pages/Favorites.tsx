import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart, Star, ExternalLink, Phone, MapPin } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface FavoriteBusiness {
  id: string;
  business_name: string;
  business_address: string;
  business_description: string;
  business_phone: string;
  business_website: string;
  business_features: string[];
  category: string;
  distance_miles: number;
  created_at: string;
}

export default function Favorites() {
  const [favorites, setFavorites] = useState<FavoriteBusiness[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      loadFavorites();
    } else {
      setIsLoading(false);
    }
  }, [user]);

  const loadFavorites = async () => {
    try {
      const { data, error } = await supabase
        .from('user_recommendations')
        .select('*')
        .eq('user_id', user?.id)
        .eq('is_favorite', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFavorites(data || []);
    } catch (error) {
      console.error('Error loading favorites:', error);
      toast({
        title: "Error loading favorites",
        description: "Please try again later",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const removeFavorite = async (favoriteId: string, businessName: string) => {
    try {
      const { error } = await supabase
        .from('user_recommendations')
        .update({ is_favorite: false })
        .eq('id', favoriteId);

      if (error) throw error;

      setFavorites(prev => prev.filter(fav => fav.id !== favoriteId));
      toast({
        title: "Removed from favorites",
        description: `${businessName} has been removed from your favorites.`,
      });
    } catch (error) {
      console.error('Error removing favorite:', error);
      toast({
        title: "Error",
        description: "Failed to remove from favorites",
        variant: "destructive",
      });
    }
  };

  const getGoogleMapsUrl = (business: FavoriteBusiness) => {
    const query = encodeURIComponent(`${business.business_name} ${business.business_address}`);
    return `https://www.google.com/maps/search/?api=1&query=${query}`;
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-page">
        <Header />
        
        <main className="pt-24 pb-16">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-12">
              <h1 className="text-4xl md:text-5xl font-bold mb-4">Your Favorites</h1>
              <p className="text-xl text-muted-foreground">
                Sign in to see your saved places
              </p>
            </div>

            <Card className="max-w-md mx-auto text-center">
              <CardHeader>
                <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                  <Heart className="h-8 w-8 text-muted-foreground" />
                </div>
                <CardTitle>Sign in required</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Please sign in to view your favorite places.
                </p>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-page">
        <Header />
        
        <main className="pt-24 pb-16">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-12">
              <h1 className="text-4xl md:text-5xl font-bold mb-4">Your Favorites</h1>
              <p className="text-xl text-muted-foreground">
                Loading your saved places...
              </p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-page">
      <Header />
      
      <main className="pt-24 pb-16">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Your Favorites</h1>
            <p className="text-xl text-muted-foreground">
              {favorites.length > 0 
                ? `You have ${favorites.length} favorite ${favorites.length === 1 ? 'place' : 'places'}`
                : "Save places you love and want to visit"
              }
            </p>
          </div>

          {favorites.length === 0 ? (
            <Card className="max-w-md mx-auto text-center">
              <CardHeader>
                <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                  <Heart className="h-8 w-8 text-muted-foreground" />
                </div>
                <CardTitle>No favorites yet</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Start exploring places and save your favorites to see them here!
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {favorites.map((business) => (
                <Card key={business.id} className="h-fit">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded-full">
                            {business.category}
                          </span>
                        </div>
                        <CardTitle className="text-lg mb-1 truncate">{business.business_name}</CardTitle>
                        {business.business_address && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
                            <MapPin className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">{business.business_address}</span>
                          </div>
                        )}
                        {business.distance_miles && (
                          <span className="text-sm text-muted-foreground">
                            {business.distance_miles} miles away
                          </span>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFavorite(business.id, business.business_name)}
                        className="h-8 w-8 p-0 hover:bg-destructive/10 text-destructive"
                      >
                        <Heart className="h-4 w-4" fill="currentColor" />
                      </Button>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="pt-0">
                    {business.business_description && (
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                        {business.business_description}
                      </p>
                    )}
                    
                    {business.business_features && business.business_features.length > 0 && (
                      <div className="mb-4">
                        <div className="flex flex-wrap gap-1">
                          {business.business_features.slice(0, 3).map((feature, index) => (
                            <span 
                              key={index} 
                              className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded"
                            >
                              {feature}
                            </span>
                          ))}
                          {business.business_features.length > 3 && (
                            <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded">
                              +{business.business_features.length - 3} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                    
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        onClick={() => window.open(getGoogleMapsUrl(business), '_blank')}
                        className="flex-1"
                      >
                        <MapPin className="h-3 w-3 mr-1" />
                        Directions
                      </Button>
                      
                      {business.business_phone && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => window.open(`tel:${business.business_phone}`, '_blank')}
                        >
                          <Phone className="h-3 w-3" />
                        </Button>
                      )}
                      
                      {business.business_website && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => window.open(business.business_website, '_blank')}
                        >
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}