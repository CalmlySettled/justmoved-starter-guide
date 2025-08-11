import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Heart, Store, Coffee, Utensils, Car, Building, ShoppingBag } from "lucide-react";
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
  business_image: string;
  category: string;
  distance_miles: number;
  place_id?: string;
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
        .select('id, business_name, business_address, business_description, business_phone, business_website, business_features, business_image, category, distance_miles, place_id, created_at')
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

  // Group favorites by category
  const groupedFavorites = favorites.reduce((acc, business) => {
    const category = business.category;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(business);
    return acc;
  }, {} as Record<string, FavoriteBusiness[]>);

  // Sort categories alphabetically
  const sortedCategories = Object.keys(groupedFavorites).sort();

  // Get icon for category
  const getCategoryIcon = (category: string) => {
    const lowerCategory = category.toLowerCase();
    if (lowerCategory.includes('grocery') || lowerCategory.includes('food')) return Store;
    if (lowerCategory.includes('coffee') || lowerCategory.includes('cafe')) return Coffee;
    if (lowerCategory.includes('restaurant') || lowerCategory.includes('dining')) return Utensils;
    if (lowerCategory.includes('automotive') || lowerCategory.includes('car')) return Car;
    if (lowerCategory.includes('bank') || lowerCategory.includes('finance')) return Building;
    if (lowerCategory.includes('retail') || lowerCategory.includes('shop')) return ShoppingBag;
    return Store; // default icon
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
            <div className="space-y-12">
              {sortedCategories.map((category) => {
                const categoryBusinesses = groupedFavorites[category];
                const CategoryIcon = getCategoryIcon(category);
                
                return (
                  <section key={category} className="space-y-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-hero rounded-lg flex items-center justify-center shadow-glow">
                        <CategoryIcon className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold capitalize">
                          {category}
                        </h2>
                        <p className="text-sm text-muted-foreground">
                          {categoryBusinesses.length} {categoryBusinesses.length === 1 ? 'place' : 'places'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {categoryBusinesses.map((business) => (
                        <BusinessCard
                          key={business.id}
                          business={{
                            name: business.business_name,
                            address: business.business_address,
                            website: business.business_website,
                            features: business.business_features,
                            image_url: business.business_image,
                            distance_miles: business.distance_miles,
                            place_id: business.place_id,
                            category: business.category
                          }}
                          isFavorited={true}
                          onToggleFavorite={() => {}}
                          onRemoveFavorite={() => removeFavorite(business.id, business.business_name)}
                          showImage={true}
                          variant="favorites"
                        />
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}