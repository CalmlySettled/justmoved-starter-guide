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

export default function Dashboard() {
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
        description: "The recommendation has been removed from your dashboard.",
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
        description: "Redirecting to generate fresh recommendations with working website links...",
      });
      
      // Redirect to onboarding to generate fresh recommendations
      setTimeout(() => {
        navigate("/onboarding");
      }, 1000);
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

  // Helper function to create Google Maps search URL (same as Recommendations page)
  const getGoogleMapsDirectionsUrl = (address: string, businessName: string) => {
    const query = encodeURIComponent(`${businessName} ${address}`);
    return `https://www.google.com/maps/search/?api=1&query=${query}`;
  };

  const filterByFeatures = (rec: SavedRecommendation, filter: string) => {
    const features = rec.business_features?.join(' ').toLowerCase() || '';
    const description = rec.business_description?.toLowerCase() || '';
    const name = rec.business_name.toLowerCase();
    const searchText = `${features} ${description} ${name}`;
    
    switch (filter.toLowerCase()) {
      case 'organic':
        return searchText.includes('organic') || searchText.includes('natural') || searchText.includes('fresh');
      case 'budget-friendly':
        return searchText.includes('budget') || searchText.includes('affordable') || searchText.includes('discount') || 
               searchText.includes('cheap') || searchText.includes('value') || name.includes('aldi') || name.includes('walmart');
      case '24/7':
      case '24 hours':
        return searchText.includes('24') || searchText.includes('24/7') || searchText.includes('24 hours');
      case 'local':
        return searchText.includes('local') || searchText.includes('family') || searchText.includes('community');
      case 'international':
        return searchText.includes('international') || searchText.includes('ethnic') || searchText.includes('world');
      case 'specialty':
        return searchText.includes('specialty') || searchText.includes('gourmet') || searchText.includes('artisan');
      case 'classes':
        return searchText.includes('classes') || searchText.includes('group') || searchText.includes('yoga') || 
               searchText.includes('zumba') || searchText.includes('aerobics');
      case 'personal training':
        return searchText.includes('personal') || searchText.includes('trainer') || searchText.includes('coaching');
      case 'women-only':
        return searchText.includes('women') || searchText.includes('ladies') || searchText.includes('female');
      case 'pool':
        return searchText.includes('pool') || searchText.includes('swimming') || searchText.includes('aqua');
      case 'christian':
        return searchText.includes('christian') || searchText.includes('christ') || searchText.includes('evangelical');
      case 'catholic':
        return searchText.includes('catholic') || name.includes('st.') || name.includes('saint') || 
               name.includes('sacred heart') || name.includes('our lady');
      case 'protestant':
        return searchText.includes('protestant') || searchText.includes('lutheran') || searchText.includes('episcopal');
      case 'baptist':
        return searchText.includes('baptist');
      case 'methodist':
        return searchText.includes('methodist') || searchText.includes('united methodist');
      case 'non-denominational':
        return searchText.includes('non-denominational') || searchText.includes('community church') || 
               searchText.includes('fellowship');
      case 'walk-in':
        return searchText.includes('walk-in') || searchText.includes('walk in') || searchText.includes('no appointment');
      case 'specialists':
        return searchText.includes('specialist') || searchText.includes('cardiology') || searchText.includes('orthopedic');
      case 'emergency':
        return searchText.includes('emergency') || searchText.includes('er ') || searchText.includes('24 hour');
      case 'family practice':
        return searchText.includes('family') || searchText.includes('primary care') || searchText.includes('general');
      case 'pediatrics':
        return searchText.includes('pediatric') || searchText.includes('children') || searchText.includes('kids');
      case 'urgent care':
        return searchText.includes('urgent') || searchText.includes('immediate');
      case 'daycare':
        return searchText.includes('daycare') || searchText.includes('day care');
      case 'preschool':
        return searchText.includes('preschool') || searchText.includes('pre-school');
      case 'after school':
        return searchText.includes('after school') || searchText.includes('afterschool');
      case 'summer programs':
        return searchText.includes('summer') || searchText.includes('camp');
      case 'infant care':
        return searchText.includes('infant') || searchText.includes('baby') || searchText.includes('toddler');
      case 'fast food':
        return searchText.includes('fast') || searchText.includes('quick') || name.includes('mcdonalds') || 
               name.includes('burger king') || name.includes('kfc');
      case 'fine dining':
        return searchText.includes('fine') || searchText.includes('upscale') || searchText.includes('gourmet');
      case 'family-friendly':
        return searchText.includes('family') || searchText.includes('kids') || searchText.includes('children');
      case 'takeout':
        return searchText.includes('takeout') || searchText.includes('delivery') || searchText.includes('take out');
      case 'healthy options':
        return searchText.includes('healthy') || searchText.includes('salad') || searchText.includes('organic');
      case 'highly rated':
        return searchText.includes('rating') || searchText.includes('review') || searchText.includes('star');
      case 'local favorite':
        return searchText.includes('local') || searchText.includes('favorite') || searchText.includes('popular');
      case 'accessible':
        return searchText.includes('accessible') || searchText.includes('ada') || searchText.includes('wheelchair');
      default:
        return true;
    }
  };

  const getBusinessBadges = (features: string[]) => {
    const badges = [];
    if (features.some(f => f.toLowerCase().includes('24') || f.toLowerCase().includes('hour'))) {
      badges.push({ label: "24 Hours", icon: Clock, color: "bg-blue-100 text-blue-800" });
    }
    if (features.some(f => f.toLowerCase().includes('local') || f.toLowerCase().includes('family'))) {
      badges.push({ label: "Local", icon: Heart, color: "bg-green-100 text-green-800" });
    }
    if (features.some(f => f.toLowerCase().includes('rating') || f.toLowerCase().includes('review'))) {
      badges.push({ label: "High Ratings", icon: Award, color: "bg-yellow-100 text-yellow-800" });
    }
    return badges.slice(0, 2);
  };

  // Helper function to get business image
  const getBusinessImage = (rec: SavedRecommendation) => {
    // First check if we have a real image URL from the API
    if (rec.business_image && rec.business_image !== 'placeholder' && rec.business_image.trim() !== '') {
      return rec.business_image;
    }
    
    const name = rec.business_name.toLowerCase();
    const category = rec.category;
    
    // Specific business images - grocery stores
    if (name.includes("geissler")) {
      return "/lovable-uploads/e9c9bd3b-56c9-4c4d-9908-acb6c4950b77.png";
    }
    if (name.includes("stop & shop") || name.includes("stop and shop")) {
      return "/lovable-uploads/f379c4b6-3d2f-4893-860e-70853f3b634c.png";
    }
    if (name.includes("fresh farm")) {
      return "/lovable-uploads/63cb8a6f-dfac-4328-b8d3-b392fedc9993.png";
    }
    if (name.includes("sav-mor")) {
      return "/lovable-uploads/c12c56bb-6db1-41e0-81c2-8c078a7a9f4f.png";
    }
    if (name.includes("aldi")) {
      return "/lovable-uploads/eb8b8540-f130-414b-84da-27c82f2c8431.png";
    }
    
    // Specific business images - fitness
    if (name.includes("total health")) {
      return "/lovable-uploads/501a0890-d137-41da-96d5-83f7c4514751.png";
    }
    if (name.includes("planet fitness")) {
      return "/lovable-uploads/b393c4b5-8487-47b0-a991-d59fbc4c421c.png";
    }
    if (name.includes("club fitness")) {
      return "/lovable-uploads/16cb62a7-bb30-432d-804b-9f20266bbce7.png";
    }
    if (name.includes("gold's gym")) {
      return "/lovable-uploads/8ae3c503-4c33-4e74-a098-c0bf7cf1e90f.png";
    }
    if (name.includes("fit body boot camp")) {
      return "/lovable-uploads/2beb6084-f2f4-4058-9014-43a42f522449.png";
    }
    
    // Specific business images - churches
    if (name.includes("wintonbury")) {
      return "/lovable-uploads/c4857259-5956-4aa3-8861-a261d3185571.png";
    }
    if (name.includes("sacred heart")) {
      return "/lovable-uploads/cc86ee7c-c45c-4416-b52f-c3f131ca741c.png";
    }
    if (name.includes("first cathedral")) {
      return "/lovable-uploads/542619d4-3d1e-40d0-af95-87134e5ef6f7.png";
    }
    if (name.includes("st. andrew") || name.includes("saint andrew")) {
      return "/lovable-uploads/62c94628-65d4-4af6-9058-5b2b566bd87b.png";
    }
    if (name.includes("congregational")) {
      return "/lovable-uploads/09dfac75-fdf4-4cbe-8dbb-a8d1e95e149c.png";
    }
    
    // Fallback to category-based placeholder images
    switch (category.toLowerCase()) {
      case 'grocery stores':
        return "/lovable-uploads/f8f75b8b-1f7f-457f-a75e-b4ca2d363cf6.png";
      case 'fitness options':
        return "https://images.unsplash.com/photo-1488972685288-c3fd157d7c7a?w=400&h=200&fit=crop";
      case 'faith communities':
        return "https://images.unsplash.com/photo-1473177104440-ffee2f376098?w=400&h=200&fit=crop";
      default:
        return "https://images.unsplash.com/photo-1487958449943-2429e8be8625?w=400&h=200&fit=crop";
    }
  };

  // Helper function to check if priority matches category
  const priorityMatchesCategory = (priority: string, category: string) => {
    const priorityLower = priority.toLowerCase();
    const categoryLower = category.toLowerCase();
    
    // Direct matches
    if (priorityLower === categoryLower) return true;
    
    // Partial matches for common variations
    if (priorityLower.includes('grocery') && categoryLower.includes('grocery')) return true;
    if (priorityLower.includes('fitness') && categoryLower.includes('fitness')) return true;
    if (priorityLower.includes('faith') && categoryLower.includes('faith')) return true;
    if (priorityLower.includes('medical') && categoryLower.includes('medical')) return true;
    if (priorityLower.includes('childcare') && categoryLower.includes('childcare')) return true;
    if (priorityLower.includes('transit') && categoryLower.includes('transit')) return true;
    if (priorityLower.includes('green') && categoryLower.includes('green')) return true;
    if (priorityLower.includes('safety') && categoryLower.includes('safety')) return true;
    if (priorityLower.includes('restaurant') && categoryLower.includes('restaurant')) return true;
    if (priorityLower.includes('social') && categoryLower.includes('social')) return true;
    
    return false;
  };

  const filteredRecommendations = activeFilter 
    ? recommendations.filter(rec => priorityMatchesCategory(activeFilter, rec.category))
    : recommendations;

  const groupedRecommendations = filteredRecommendations.reduce((groups, rec) => {
    const category = rec.category;
    if (!groups[category]) {
      groups[category] = [];
    }
    
    // Apply category-specific filter if one is active for this category
    const categoryFilter = activeCategoryFilter[category];
    if (categoryFilter && filterByFeatures(rec, categoryFilter)) {
      groups[category].push(rec);
    } else if (!categoryFilter) {
      groups[category].push(rec);
    }
    
    return groups;
  }, {} as { [key: string]: SavedRecommendation[] });

  // Sort each category's recommendations by distance (closest first)
  Object.keys(groupedRecommendations).forEach(category => {
    groupedRecommendations[category].sort((a, b) => {
      const distanceA = a.distance_miles || 999;
      const distanceB = b.distance_miles || 999;
      return distanceA - distanceB;
    });
  });

  const handleCategoryFilter = (category: string, filter: string) => {
    setActiveCategoryFilter(prev => ({
      ...prev,
      [category]: prev[category] === filter ? null : filter
    }));
  };

  const handlePriorityFilter = (priority: string) => {
    if (activeFilter === priority) {
      setActiveFilter(null); // Clear filter if clicking same priority
    } else {
      setActiveFilter(priority);
    }
  };

  // Get favorites and sort/filter them
  const getFavoritesData = () => {
    let favorites = recommendations.filter(rec => rec.is_favorite);
    
    // Apply category filter
    if (favoritesFilter) {
      favorites = favorites.filter(rec => rec.category.toLowerCase() === favoritesFilter.toLowerCase());
    }
    
    // Apply sorting
    switch (favoritesSort) {
      case 'distance':
        favorites.sort((a, b) => (a.distance_miles || 999) - (b.distance_miles || 999));
        break;
      case 'category':
        favorites.sort((a, b) => a.category.localeCompare(b.category));
        break;
      case 'date':
      default:
        favorites.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
    }
    
    return favorites;
  };

  const getFavoriteCategories = () => {
    const categories = [...new Set(recommendations.filter(rec => rec.is_favorite).map(rec => rec.category))];
    return categories.sort();
  };

  const getUserSummary = () => {
    if (!userProfile) return "Welcome to your new neighborhood! Here's what we recommend for you.";
    const { life_stage, address, transportation_style, budget_preference } = userProfile;
    if (life_stage && address && transportation_style && budget_preference) {
      return `Welcome to your new neighborhood! As ${life_stage.toLowerCase().startsWith('a') ? 'an' : 'a'} ${life_stage.toLowerCase()} who just moved here with ${transportation_style.toLowerCase()} and ${budget_preference.toLowerCase()}, here's what we recommend.`;
    }
    return "Welcome to your new neighborhood! Here's what we recommend for you.";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-subtle">
        <Header />
        <div className="pt-24 px-6 max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-4">Loading Your Dashboard</h1>
            <p className="text-muted-foreground">Retrieving your saved recommendations...</p>
          </div>
          
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="h-64">
                <CardHeader>
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="pt-24 px-4 max-w-5xl mx-auto pb-16">
        {/* Header Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-foreground mb-4">
            Your Neighborhood Dashboard
          </h1>
          
          <div className="max-w-2xl mx-auto mb-8">
            <p className="text-lg text-muted-foreground leading-relaxed">
              {getUserSummary()}
            </p>
          </div>

          <div className="flex flex-wrap gap-4 justify-center">
            <EditPreferencesModal userProfile={userProfile} onProfileUpdate={fetchUserData} />
            <AddMoreCategoriesModal userProfile={userProfile} onNewRecommendations={fetchUserData} />
            <Button 
              onClick={clearAllRecommendations}
              variant="outline"
              className="flex items-center gap-2"
              disabled={loading || recommendations.length === 0}
            >
              <Trash2 className="h-4 w-4" />
              Regenerate With Website Links
            </Button>
          </div>
        </div>

        {/* User Profile & Quick Stats */}
        {userProfile && (
          <div className="mb-12">
            {/* Welcome Message */}
            <div className="text-center mb-8">
              <h2 className="text-2xl font-semibold text-foreground mb-2">
                Welcome, there! 
              </h2>
              <p className="text-muted-foreground">
                Here's what we know about your move...
              </p>
            </div>

            {/* Preference Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-8">
              {userProfile.life_stage && (
                <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-200/50 hover:shadow-md transition-all duration-200">
                  <CardContent className="p-6 text-center">
                    <div className="flex flex-col items-center space-y-2">
                      <div className="w-12 h-12 rounded-full bg-blue-200/60 flex items-center justify-center mb-2">
                        <Heart className="h-6 w-6 text-blue-600" />
                      </div>
                      <h3 className="font-medium text-foreground">Life Stage</h3>
                      <p className="text-sm text-muted-foreground">{userProfile.life_stage}</p>
                    </div>
                  </CardContent>
                </Card>
              )}
              
              {userProfile.household_type && (
                <Card className="bg-gradient-to-br from-green-50 to-green-100/50 border-green-200/50 hover:shadow-md transition-all duration-200">
                  <CardContent className="p-6 text-center">
                    <div className="flex flex-col items-center space-y-2">
                      <div className="w-12 h-12 rounded-full bg-green-200/60 flex items-center justify-center mb-2">
                        <Users className="h-6 w-6 text-green-600" />
                      </div>
                      <h3 className="font-medium text-foreground">Household</h3>
                      <p className="text-sm text-muted-foreground">{userProfile.household_type}</p>
                    </div>
                  </CardContent>
                </Card>
              )}
              
              {userProfile.transportation_style && (
                <Card className="bg-gradient-to-br from-purple-50 to-purple-100/50 border-purple-200/50 hover:shadow-md transition-all duration-200">
                  <CardContent className="p-6 text-center">
                    <div className="flex flex-col items-center space-y-2">
                      <div className="w-12 h-12 rounded-full bg-purple-200/60 flex items-center justify-center mb-2">
                        <Car className="h-6 w-6 text-purple-600" />
                      </div>
                      <h3 className="font-medium text-foreground">Transportation</h3>
                      <p className="text-sm text-muted-foreground">{userProfile.transportation_style}</p>
                    </div>
                  </CardContent>
                </Card>
              )}
              
              {userProfile.budget_preference && (
                <Card className="bg-gradient-to-br from-orange-50 to-orange-100/50 border-orange-200/50 hover:shadow-md transition-all duration-200">
                  <CardContent className="p-6 text-center">
                    <div className="flex flex-col items-center space-y-2">
                      <div className="w-12 h-12 rounded-full bg-orange-200/60 flex items-center justify-center mb-2">
                        <DollarSign className="h-6 w-6 text-orange-600" />
                      </div>
                      <h3 className="font-medium text-foreground">Budget Style</h3>
                      <p className="text-sm text-muted-foreground">{userProfile.budget_preference}</p>
                    </div>
                  </CardContent>
                </Card>
              )}
              
              {userProfile.address && (
                <Card className="bg-gradient-to-br from-teal-50 to-teal-100/50 border-teal-200/50 hover:shadow-md transition-all duration-200">
                  <CardContent className="p-6 text-center">
                    <div className="flex flex-col items-center space-y-2">
                      <div className="w-12 h-12 rounded-full bg-teal-200/60 flex items-center justify-center mb-2">
                        <MapPin className="h-6 w-6 text-teal-600" />
                      </div>
                      <h3 className="font-medium text-foreground">Location</h3>
                      <p className="text-sm text-muted-foreground">{userProfile.address}</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
                
            {userProfile.priorities && userProfile.priorities.length > 0 && (
              <div className="mb-8">
                <Label className="text-sm font-medium text-muted-foreground mb-2 block">
                  Your Priorities {activeFilter && <span className="text-primary">- Filtered by: {activeFilter}</span>}
                </Label>
                <div className="flex flex-wrap gap-2">
                  {userProfile.priorities.map((priority, index) => (
                    <Badge 
                      key={index} 
                      variant="secondary" 
                      className={`cursor-pointer transition-all hover:scale-105 ${
                        activeFilter === priority 
                          ? "bg-primary text-primary-foreground border-primary shadow-md" 
                          : "bg-primary/10 text-primary border-primary/20 hover:bg-primary/20"
                      }`}
                      onClick={() => handlePriorityFilter(priority)}
                    >
                      {priority}
                    </Badge>
                  ))}
                  {activeFilter && (
                    <Badge 
                      variant="outline" 
                      className="cursor-pointer text-muted-foreground hover:text-foreground border-dashed"
                      onClick={() => setActiveFilter(null)}
                    >
                      Clear Filter
                    </Badge>
                  )}
                </div>
              </div>
            )}

            {/* Favorites Section - Interactive Visual Display */}
            {recommendations.filter(rec => rec.is_favorite).length > 0 && (
              <div className="mb-12">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-gradient-to-br from-yellow-100 to-yellow-200 rounded-2xl">
                      <Star className="h-6 w-6 text-yellow-600 fill-current" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-foreground">My Favorites</h2>
                      <p className="text-muted-foreground">
                        {getFavoritesData().length} favorite place{getFavoritesData().length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  
                  {/* Favorites Controls */}
                  <div className="flex items-center gap-3">
                    {/* Category Filter */}
                    <Select value={favoritesFilter || 'all'} onValueChange={(value) => setFavoritesFilter(value === 'all' ? null : value)}>
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="All Categories" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {getFavoriteCategories().map(category => (
                          <SelectItem key={category} value={category}>{category}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    {/* Sort Controls */}
                    <Select value={favoritesSort} onValueChange={(value: 'date' | 'distance' | 'category') => setFavoritesSort(value)}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="date">Recent</SelectItem>
                        <SelectItem value="distance">Nearest</SelectItem>
                        <SelectItem value="category">Category</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    {/* Clear Filters */}
                    {favoritesFilter && (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setFavoritesFilter(null)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Favorites Grid */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {getFavoritesData().map((rec) => {
                    const badges = getBusinessBadges(rec.business_features || []);
                    const isFavoriting = favoritingRecommendations.has(rec.id);
                    
                    return (
                      <Card key={rec.id} className="group hover:shadow-elegant transition-all duration-300 border-0 shadow-soft bg-card rounded-2xl overflow-hidden hover:scale-[1.02]">
                        {/* Business Image */}
                        <div className="aspect-[4/3] overflow-hidden relative">
                          <img 
                            src={getBusinessImage(rec)}
                            alt={rec.business_name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <div className="absolute top-3 right-3 flex gap-2">
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => toggleFavorite(rec)}
                              disabled={isFavoriting}
                              className="bg-white/90 hover:bg-white text-yellow-500 shadow-lg rounded-full w-8 h-8 p-0"
                            >
                              <Star className="h-3 w-3 fill-current" />
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => deleteRecommendation(rec.id)}
                              disabled={deleting === rec.id}
                              className="bg-white/90 hover:bg-white text-destructive shadow-lg rounded-full w-8 h-8 p-0"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                          
                          {/* Category Tag */}
                          <div className="absolute bottom-3 left-3">
                            <Badge className="bg-white/90 text-foreground hover:bg-white text-xs font-medium">
                              {getCategoryIcon(rec.category)} {rec.category}
                            </Badge>
                          </div>
                        </div>

                        <CardContent className="p-4">
                          <div className="space-y-3">
                            {/* Business Name */}
                            <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                              {rec.business_name}
                            </h3>
                            
                            {/* Address */}
                            {rec.business_address && (
                              <a 
                                href={getGoogleMapsDirectionsUrl(rec.business_address, rec.business_name)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-start gap-2 text-sm text-primary hover:text-primary/80 transition-colors group cursor-pointer"
                              >
                                <MapPin className="h-3 w-3 mt-0.5 flex-shrink-0 group-hover:scale-110 transition-transform" />
                                <span className="underline-offset-2 group-hover:underline line-clamp-1 text-xs">
                                  {rec.business_address}
                                </span>
                              </a>
                            )}
                            
                            {/* Distance & Date */}
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              {rec.distance_miles && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {rec.distance_miles} mi
                                </span>
                              )}
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {new Date(rec.created_at).toLocaleDateString()}
                              </span>
                            </div>
                            
                            {/* Badges */}
                            {badges.length > 0 && (
                              <div className="flex gap-1">
                                {badges.slice(0, 1).map((badge, badgeIndex) => (
                                  <div key={badgeIndex} className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>
                                    <badge.icon className="h-3 w-3" />
                                    {badge.label}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Saved Recommendations */}
        {recommendations.length > 0 ? (
          <div className="space-y-16">
            {Object.entries(groupedRecommendations).map(([category, categoryRecs], categoryIndex) => (
              <div key={category} className="space-y-8">
                {categoryIndex > 0 && <div className="border-t border-border/30 pt-16" />}
                
                <div className="flex items-center gap-4 mb-6">
                  <div className="p-3 bg-primary/10 rounded-2xl">
                    <span className="text-2xl">{getCategoryIcon(category)}</span>
                  </div>
                  <div>
                    <h2 className="text-3xl font-bold text-foreground">
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </h2>
                    <p className="text-muted-foreground mt-1">
                      {categoryRecs.length} saved recommendation{categoryRecs.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>

                {/* Category-specific filters */}
                <div className="mb-8">
                  <div className="flex flex-wrap gap-2">
                    {getCategoryFilters(category).map((filter) => (
                      <Badge 
                        key={filter}
                        variant="outline"
                        className={`cursor-pointer transition-all hover:scale-105 ${
                          activeCategoryFilter[category] === filter
                            ? "bg-primary text-primary-foreground border-primary shadow-md" 
                            : "bg-background text-muted-foreground border-border hover:bg-primary/10 hover:text-primary hover:border-primary/50"
                        }`}
                        onClick={() => handleCategoryFilter(category, filter)}
                      >
                        {filter}
                      </Badge>
                    ))}
                    {activeCategoryFilter[category] && (
                      <Badge 
                        variant="outline" 
                        className="cursor-pointer text-muted-foreground hover:text-foreground border-dashed"
                        onClick={() => handleCategoryFilter(category, activeCategoryFilter[category]!)}
                      >
                        Clear
                      </Badge>
                    )}
                  </div>
                </div>
                
                <div className="grid gap-6 md:grid-cols-2">
                  {categoryRecs.map((rec) => {
                    const badges = getBusinessBadges(rec.business_features || []);
                    const isFavoriting = favoritingRecommendations.has(rec.id);
                    return (
                      <Card key={rec.id} className="group hover:shadow-elegant transition-all duration-300 border-0 shadow-soft bg-card rounded-2xl overflow-hidden">
                        {/* Business Image */}
                        <div className="aspect-video overflow-hidden">
                           <img 
                            src={getBusinessImage(rec)}
                            alt={rec.business_name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                        
                        <CardHeader className="pb-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                               {rec.business_website ? (
                                  <a 
                                    href={rec.business_website.startsWith('http') ? rec.business_website : `https://${rec.business_website}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xl font-semibold text-foreground hover:text-primary hover:font-bold transition-all hover:underline"
                                  >
                                    {rec.business_name}
                                  </a>
                                ) : (
                                  <CardTitle className="text-xl font-semibold text-foreground hover:text-primary hover:font-bold transition-all cursor-pointer">
                                    {rec.business_name}
                                  </CardTitle>
                                )}
                              <div className="flex items-center gap-2 mt-1">
                                {rec.distance_miles && (
                                  <>
                                    <MapPin className="h-3 w-3 text-muted-foreground" />
                                    <span className="text-xs text-muted-foreground font-medium">
                                      {rec.distance_miles} miles away
                                    </span>
                                    <span className="text-xs text-muted-foreground">•</span>
                                  </>
                                )}
                                <Calendar className="h-3 w-3 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground">
                                  Saved {new Date(rec.created_at).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleFavorite(rec)}
                                disabled={isFavoriting}
                                className={`ml-1 transition-colors ${
                                  rec.is_favorite 
                                    ? 'text-yellow-500 hover:text-yellow-600' 
                                    : 'text-muted-foreground hover:text-yellow-500'
                                }`}
                              >
                                <Star className={`h-4 w-4 ${rec.is_favorite ? 'fill-current' : ''}`} />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteRecommendation(rec.id)}
                                disabled={deleting === rec.id}
                                className="text-muted-foreground hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                        
                        <CardContent className="space-y-4">
                          {rec.business_address && (
                            <a 
                              href={getGoogleMapsDirectionsUrl(rec.business_address, rec.business_name)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-start gap-2 text-sm text-primary hover:text-primary/80 transition-colors group cursor-pointer"
                            >
                              <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0 group-hover:scale-110 transition-transform" />
                              <span className="underline-offset-2 hover:underline hover:text-blue-600 transition-colors">
                                {rec.business_address}
                              </span>
                            </a>
                          )}
                          
                          
                          {badges.length > 0 && (
                            <div className="flex gap-2">
                              {badges.map((badge, badgeIndex) => (
                                <div key={badgeIndex} className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>
                                  <badge.icon className="h-3 w-3" />
                                  {badge.label}
                                </div>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="p-4 bg-muted/50 rounded-full w-24 h-24 mx-auto mb-6 flex items-center justify-center">
              <Home className="h-12 w-12 text-muted-foreground" />
            </div>
            <h2 className="text-2xl font-semibold mb-3 text-foreground">No saved recommendations yet</h2>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Complete our quick quiz to get personalized recommendations for your neighborhood, then save your favorites here.
            </p>
            <div className="space-y-3">
              <Button 
                onClick={() => navigate("/onboarding")}
                size="lg"
                className="mr-4"
              >
                Take the Quiz
              </Button>
              {userProfile && (
                <Button 
                  onClick={() => navigate("/recommendations")}
                  variant="outline"
                  size="lg"
                >
                  Get Recommendations
                </Button>
              )}
            </div>
          </div>
        )}

        {/* CTA Section */}
        {recommendations.length > 0 && (
          <div className="mt-24 text-center">
            <div className="p-8 bg-gradient-to-br from-primary/5 to-primary/10 rounded-3xl border border-primary/20">
              <Users className="h-12 w-12 text-primary mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-foreground mb-3">
                Discover More Places
              </h3>
              <p className="text-muted-foreground mb-6 max-w-lg mx-auto">
                Get fresh recommendations based on your preferences or update your profile to find new places in your area.
              </p>
              <div className="space-y-3">
                <AddMoreCategoriesModal userProfile={userProfile} onNewRecommendations={fetchUserData} />
                <EditPreferencesModal userProfile={userProfile} onProfileUpdate={fetchUserData} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}