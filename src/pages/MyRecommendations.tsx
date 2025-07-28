import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { EditPreferencesModal } from "@/components/EditPreferencesModal";
import { AddMoreCategoriesModal } from "@/components/AddMoreCategoriesModal";
import { 
  Home, 
  MapPin, 
  Star, 
  Plus, 
  Calendar,
  Heart,
  Clock,
  Award,
  Users,
  RefreshCw,
  Trash2,
  Car,
  DollarSign,
  Filter,
  SortAsc,
  X
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface SavedRecommendation {
  id: string;
  category: string;
  business_name: string;
  business_address?: string;
  business_description?: string;
  business_phone?: string;
  business_image?: string;
  business_website?: string;
  business_features: string[];
  distance_miles?: number;
  created_at: string;
  is_favorite?: boolean;
}

interface UserProfile {
  address?: string;
  household_type?: string;
  priorities: string[];
  transportation_style?: string;
  budget_preference?: string;
  life_stage?: string;
  settling_tasks?: string[];
}

export default function MyRecommendations() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [recommendations, setRecommendations] = useState<SavedRecommendation[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<{[category: string]: string | null}>({});
  const [favoritingRecommendations, setFavoritingRecommendations] = useState<Set<string>>(new Set());
  const [favoritesSort, setFavoritesSort] = useState<'date' | 'distance' | 'category'>('date');
  const [favoritesFilter, setFavoritesFilter] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchUserData();
  }, [user, navigate]);

  const fetchUserData = async () => {
    if (!user) return;

    try {
      // Fetch user profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        throw profileError;
      }

      setUserProfile(profileData);

      // Fetch recommendations
      const { data: recData, error: recError } = await supabase
        .from('user_recommendations')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (recError) {
        throw recError;
      }

      // Clean up unwanted recommendations - only keep categories in user's priorities
      if (profileData?.priorities && recData) {
        const userPriorities = profileData.priorities;
        const unwantedRecommendations = recData.filter(rec => 
          !userPriorities.includes(rec.category)
        );

        if (unwantedRecommendations.length > 0) {
          console.log(`Cleaning up ${unwantedRecommendations.length} unwanted recommendations for categories not in user priorities`);
          
          // Delete unwanted recommendations
          const { error: deleteError } = await supabase
            .from('user_recommendations')
            .delete()
            .eq('user_id', user.id)
            .not('category', 'in', `(${userPriorities.map(p => `"${p}"`).join(',')})`);

          if (deleteError) {
            console.error('Error cleaning up recommendations:', deleteError);
          } else {
            // Refetch recommendations after cleanup
            const { data: cleanRecData, error: cleanRecError } = await supabase
              .from('user_recommendations')
              .select('*')
              .eq('user_id', user.id)
              .order('created_at', { ascending: false });

            if (!cleanRecError) {
              setRecommendations(cleanRecData || []);
              toast({
                title: "Cleaned up recommendations",
                description: "Removed categories that weren't in your preferences.",
              });
              return;
            }
          }
        }
      }

      setRecommendations(recData || []);
    } catch (error) {
      console.error('Error fetching user data:', error);
      toast({
        title: "Error loading data",
        description: "We couldn't load your recommendations. Please refresh the page.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteRecommendation = async (id: string) => {
    if (!user) return;

    try {
      setDeleting(id);
      const { error } = await supabase
        .from('user_recommendations')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) {
        throw error;
      }

      setRecommendations(prev => prev.filter(rec => rec.id !== id));
      toast({
        title: "Recommendation removed",
        description: "The recommendation has been removed from your list.",
      });
    } catch (error) {
      console.error('Error deleting recommendation:', error);
      toast({
        title: "Error",
        description: "We couldn't remove this recommendation. Please try again.",
        variant: "destructive"
      });
    } finally {
      setDeleting(null);
    }
  };

  const clearAllRecommendations = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { error } = await supabase
        .from('user_recommendations')
        .delete()
        .eq('user_id', user.id);

      if (error) {
        throw error;
      }

      setRecommendations([]);
      toast({
        title: "All recommendations cleared",
        description: "You can now generate fresh recommendations.",
      });
    } catch (error) {
      console.error('Error clearing recommendations:', error);
      toast({
        title: "Error",
        description: "We couldn't clear your recommendations. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleFavorite = async (rec: SavedRecommendation) => {
    if (!user) return;

    const key = rec.id;
    setFavoritingRecommendations(prev => new Set(prev).add(key));

    try {
      const newFavoriteStatus = !rec.is_favorite;
      const { error } = await supabase
        .from('user_recommendations')
        .update({ is_favorite: newFavoriteStatus })
        .eq('id', rec.id)
        .eq('user_id', user.id);

      if (error) {
        throw error;
      }

      // Update local state
      setRecommendations(prev => 
        prev.map(r => 
          r.id === rec.id 
            ? { ...r, is_favorite: newFavoriteStatus }
            : r
        )
      );

      toast({
        title: newFavoriteStatus ? "Added to favorites" : "Removed from favorites",
        description: `${rec.business_name} has been ${newFavoriteStatus ? 'added to' : 'removed from'} your favorites.`,
      });
    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast({
        title: "Error updating favorite",
        description: "We couldn't update your favorite. Please try again.",
        variant: "destructive"
      });
    } finally {
      setFavoritingRecommendations(prev => {
        const newSet = new Set(prev);
        newSet.delete(key);
        return newSet;
      });
    }
  };

  const getCategoryIcon = (category: string) => {
    const icons: { [key: string]: string } = {
      "grocery stores": "🛒",
      "medical care": "🏥", 
      "fitness options": "🏋️",
      "childcare": "👶",
      "faith communities": "⛪",
      "public transit": "🚌",
      "green space": "🌳",
      "safety": "🛡️",
      "restaurants": "🍽️",
      "social events": "🎉"
    };
    return icons[category.toLowerCase()] || "📍";
  };

  const getCategoryFilters = (category: string) => {
    const categoryLower = category.toLowerCase();
    
    if (categoryLower.includes('grocery')) {
      return ['Organic', 'Budget-Friendly', '24/7', 'Local', 'International', 'Specialty'];
    }
    if (categoryLower.includes('fitness')) {
      return ['Classes', 'Budget-Friendly', '24/7', 'Personal Training', 'Women-Only', 'Pool'];
    }
    if (categoryLower.includes('faith')) {
      return ['Christian', 'Catholic', 'Protestant', 'Baptist', 'Methodist', 'Non-Denominational'];
    }
    if (categoryLower.includes('medical')) {
      return ['Walk-In', 'Specialists', 'Emergency', 'Family Practice', 'Pediatrics', 'Urgent Care'];
    }
    if (categoryLower.includes('childcare')) {
      return ['Daycare', 'Preschool', 'After School', 'Summer Programs', 'Infant Care', 'Budget-Friendly'];
    }
    if (categoryLower.includes('restaurant')) {
      return ['Fast Food', 'Fine Dining', 'Family-Friendly', 'Takeout', 'Healthy Options', 'Budget-Friendly'];
    }
    
    return ['Budget-Friendly', 'Highly Rated', 'Local Favorite', 'Accessible', 'Family-Friendly'];
  };

  // Render loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        
        <main className="pt-24 pb-16">
          <div className="max-w-6xl mx-auto px-6">
            <div className="mb-8">
              <Skeleton className="h-8 w-64 mb-2" />
              <Skeleton className="h-4 w-96" />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-48" />
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  // If no recommendations, show empty state
  if (recommendations.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        
        <main className="pt-24 pb-16">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-12">
              <h1 className="text-4xl md:text-5xl font-bold mb-4">My Recommendations</h1>
              <p className="text-xl text-muted-foreground">
                Your personalized local guide
              </p>
            </div>

            <Card className="max-w-md mx-auto text-center">
              <CardHeader>
                <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                  <MapPin className="h-8 w-8 text-muted-foreground" />
                </div>
                <CardTitle>No recommendations yet</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-6">
                  Take our quick quiz to get personalized recommendations for your new area!
                </p>
                <Button onClick={() => navigate("/onboarding")} className="w-full">
                  Get Started
                </Button>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  // Get favorites data
  const favoritesData = recommendations.filter(rec => rec.is_favorite);
  const favoriteCategories = [...new Set(favoritesData.map(rec => rec.category))];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-24 pb-16">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">My Recommendations</h1>
            <p className="text-xl text-muted-foreground">
              Your personalized local guide
            </p>
          </div>

          {/* My Favorites Section */}
          {favoritesData.length > 0 && (
            <div className="mb-12">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <Heart className="h-6 w-6 text-red-500 fill-current" />
                  My Favorites ({favoritesData.length})
                </h2>
                
                <div className="flex items-center gap-4">
                  {favoriteCategories.length > 1 && (
                    <div className="flex items-center gap-2">
                      <Label htmlFor="favorites-filter" className="text-sm font-medium">Filter:</Label>
                      <Select value={favoritesFilter || ""} onValueChange={(value) => setFavoritesFilter(value || null)}>
                        <SelectTrigger className="w-40">
                          <SelectValue placeholder="All categories" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">All categories</SelectItem>
                          {favoriteCategories.map(category => (
                            <SelectItem key={category} value={category}>
                              {getCategoryIcon(category)} {category}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2">
                    <Label htmlFor="favorites-sort" className="text-sm font-medium">Sort:</Label>
                    <Select value={favoritesSort} onValueChange={(value) => setFavoritesSort(value as any)}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="date">Date Added</SelectItem>
                        <SelectItem value="distance">Distance</SelectItem>
                        <SelectItem value="category">Category</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {favoritesData
                  .filter(rec => !favoritesFilter || rec.category === favoritesFilter)
                  .sort((a, b) => {
                    if (favoritesSort === 'date') {
                      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
                    }
                    if (favoritesSort === 'distance') {
                      return (a.distance_miles || 0) - (b.distance_miles || 0);
                    }
                    if (favoritesSort === 'category') {
                      return a.category.localeCompare(b.category);
                    }
                    return 0;
                  })
                  .map((rec) => (
                    <Card key={rec.id} className="group hover:shadow-md transition-shadow">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{getCategoryIcon(rec.category)}</span>
                            <Badge variant="secondary" className="text-xs">
                              {rec.category}
                            </Badge>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleFavorite(rec)}
                            disabled={favoritingRecommendations.has(rec.id)}
                            className="text-red-500 hover:text-red-600"
                          >
                            <Heart className="h-4 w-4 fill-current" />
                          </Button>
                        </div>
                        
                        <CardTitle className="text-lg leading-tight">
                          {rec.business_name}
                        </CardTitle>
                        
                        {rec.business_address && (
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {rec.business_address}
                            {rec.distance_miles && (
                              <span className="ml-1">• {rec.distance_miles.toFixed(1)} mi</span>
                            )}
                          </p>
                        )}
                      </CardHeader>
                      
                      <CardContent className="pt-0">
                        {rec.business_description && (
                          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                            {rec.business_description}
                          </p>
                        )}
                        
                        <div className="flex flex-wrap gap-4 text-sm">
                          {rec.business_address && (
                            <a 
                              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${rec.business_name} ${rec.business_address}`)}`}
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-primary hover:underline flex items-center gap-1"
                            >
                              <MapPin className="h-3 w-3" />
                              Directions
                            </a>
                          )}
                          
                          {rec.business_phone && (
                            <a 
                              href={`tel:${rec.business_phone}`}
                              className="text-primary hover:underline flex items-center gap-1"
                            >
                              📞 Call
                            </a>
                          )}
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteRecommendation(rec.id)}
                            disabled={deleting === rec.id}
                            className="text-muted-foreground hover:text-destructive p-0 h-auto"
                          >
                            {deleting === rec.id ? (
                              <RefreshCw className="h-3 w-3 animate-spin" />
                            ) : (
                              <Trash2 className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            </div>
          )}

          {/* All Recommendations Section */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">All Recommendations ({recommendations.length})</h2>
            <div className="flex gap-2">
              <AddMoreCategoriesModal userProfile={userProfile} onNewRecommendations={fetchUserData} />
              <EditPreferencesModal userProfile={userProfile} onProfileUpdate={fetchUserData} />
              <Button 
                variant="outline" 
                size="sm" 
                onClick={clearAllRecommendations}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear All
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recommendations.map((rec) => (
              <Card key={rec.id} className="group hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{getCategoryIcon(rec.category)}</span>
                      <Badge variant="secondary" className="text-xs">
                        {rec.category}
                      </Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleFavorite(rec)}
                      disabled={favoritingRecommendations.has(rec.id)}
                      className={rec.is_favorite ? "text-red-500 hover:text-red-600" : "text-muted-foreground hover:text-red-500"}
                    >
                      <Heart className={`h-4 w-4 ${rec.is_favorite ? 'fill-current' : ''}`} />
                    </Button>
                  </div>
                  
                  <CardTitle className="text-lg leading-tight">
                    {rec.business_name}
                  </CardTitle>
                  
                  {rec.business_address && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {rec.business_address}
                      {rec.distance_miles && (
                        <span className="ml-1">• {rec.distance_miles.toFixed(1)} mi</span>
                      )}
                    </p>
                  )}
                </CardHeader>
                
                <CardContent className="pt-0">
                  {rec.business_description && (
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                      {rec.business_description}
                    </p>
                  )}
                  
                  <div className="flex flex-wrap gap-4 text-sm">
                    {rec.business_address && (
                      <a 
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${rec.business_name} ${rec.business_address}`)}`}
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-primary hover:underline flex items-center gap-1"
                      >
                        <MapPin className="h-3 w-3" />
                        Directions
                      </a>
                    )}
                    
                    {rec.business_phone && (
                      <a 
                        href={`tel:${rec.business_phone}`}
                        className="text-primary hover:underline flex items-center gap-1"
                      >
                        📞 Call
                      </a>
                    )}
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteRecommendation(rec.id)}
                      disabled={deleting === rec.id}
                      className="text-muted-foreground hover:text-destructive p-0 h-auto"
                    >
                      {deleting === rec.id ? (
                        <RefreshCw className="h-3 w-3 animate-spin" />
                      ) : (
                        <Trash2 className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
