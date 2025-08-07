import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Heart } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { BusinessCard } from "@/components/BusinessCard";


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
  


  useEffect(() => {
    if (user) {
      loadFavorites();
    } else {
      setIsLoading(false);
    }
  }, [user]);

  const loadFavorites = async () => {
    try {
      console.log('🔍 Loading favorites for user:', user?.id);
      console.log('🔍 Full user object:', user);
      
      const { data, error } = await supabase
        .from('user_recommendations')
        .select('*')
        .eq('user_id', user?.id)
        .eq('is_favorite', true)
        .order('created_at', { ascending: false });

      console.log('🔍 Query result:', { data, error, userIdFilter: user?.id });
      
      if (error) throw error;
      setFavorites(data || []);
    } catch (error) {
      console.error('Error loading favorites:', error);
      // Toast notification removed per user request
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
      // Toast notification removed per user request
    } catch (error) {
      console.error('Error removing favorite:', error);
      // Toast notification removed per user request
    }
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
                <BusinessCard
                  key={business.id}
                  business={{
                    name: business.business_name,
                    address: business.business_address,
                    phone: business.business_phone,
                    website: business.business_website,
                    features: business.business_features,
                    distance_miles: business.distance_miles,
                    category: business.category
                  }}
                  isFavorited={true}
                  onToggleFavorite={() => {}}
                  onRemoveFavorite={() => removeFavorite(business.id, business.business_name)}
                  showImage={false}
                  variant="favorites"
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}