import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { FavoritesDropdown } from "@/components/FavoritesDropdown";
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
  relevance_score?: number;
  is_displayed?: boolean;
  filter_metadata?: any;
}

interface UserProfile {
  address?: string;
  household_type?: string;
  priorities: string[];
  priority_preferences?: Record<string, string[]>;
  transportation_style?: string;
  budget_preference?: string;
  life_stage?: string;
  settling_tasks?: string[];
}

export default function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [recommendations, setRecommendations] = useState<SavedRecommendation[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [generatingRecommendations, setGeneratingRecommendations] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<{[category: string]: string | null}>({});
  const [favoritingRecommendations, setFavoritingRecommendations] = useState<Set<string>>(new Set());
  const [filteredRecommendations, setFilteredRecommendations] = useState<{[category: string]: SavedRecommendation[]}>({});
  const [filterLoading, setFilterLoading] = useState<{[category: string]: boolean}>({});
  const [additionalResults, setAdditionalResults] = useState<{[category: string]: number}>({});
  const [favoriteBusinessNames, setFavoriteBusinessNames] = useState<Set<string>>(new Set());
  const lastFetchTime = useRef<number>(0);

  // Memoized refresh function
  const refreshData = useCallback(async (forceRefresh = false) => {
    if (!user) return;
    
    const now = Date.now();
    const timeSinceLastFetch = now - lastFetchTime.current;
    
    // Only refresh if forced or it's been more than 5 seconds since last fetch
    if (!forceRefresh && timeSinceLastFetch < 5000) {
      console.log('Skipping refresh - too recent');
      return;
    }
    
    console.log('Refreshing Dashboard data...');
    setRefreshing(true);
    lastFetchTime.current = now;
    
    try {
      await fetchUserData();
      if (forceRefresh) {
        toast({
          title: "Data refreshed",
          description: "Your recommendations have been updated with the latest information.",
        });
      }
    } finally {
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    console.log('Dashboard useEffect - User state:', user);
    console.log('Dashboard useEffect - Loading state:', loading);
    
    // Only redirect if we're done loading and there's no user
    if (!loading && !user) {
      console.log('No user found after loading complete, redirecting to auth');
      navigate("/auth");
      return;
    }
    
    const loadFavorites = () => {
      try {
        const storedFavorites = localStorage.getItem('favorites');
        if (storedFavorites) {
          const favorites: any[] = JSON.parse(storedFavorites);
          const favoriteNames = new Set(favorites.map(fav => fav.business_name));
          setFavoriteBusinessNames(favoriteNames);
        } else {
          setFavoriteBusinessNames(new Set());
        }
      } catch (error) {
        console.error('Error loading favorites:', error);
      }
    };

    const handleFavoritesUpdate = () => {
      console.log('🔥 DASHBOARD - Received favorites update event');
      loadFavorites();
    };
    
    // Add timeout protection for mobile
    const timeoutId = setTimeout(() => {
      console.log('Mobile Debug: fetchUserData timeout, setting loading to false');
      setLoading(false);
    }, 10000); // 10 second timeout
    
    fetchUserData().finally(() => {
      clearTimeout(timeoutId);
    });
    loadFavorites();
    
    // Listen for favorites updates from dropdown
    window.addEventListener('favoritesUpdated', handleFavoritesUpdate);
    
    return () => {
      window.removeEventListener('favoritesUpdated', handleFavoritesUpdate);
    };
  }, [user, navigate]);

  // Refresh data when returning to this page
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && user) {
        console.log('Page became visible, refreshing data...');
        refreshData();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [refreshData, user]);

  // Set up real-time updates for recommendations
  useEffect(() => {
    if (!user) return;

    console.log('Setting up real-time subscription for user recommendations...');
    
    const channel = supabase
      .channel('dashboard-recommendations')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_recommendations',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Real-time update received:', payload);
          
          if (payload.eventType === 'INSERT') {
            setRecommendations(prev => {
              const exists = prev.some(r => r.id === payload.new.id);
              if (!exists) {
                return [payload.new as SavedRecommendation, ...prev];
              }
              return prev;
            });
          } else if (payload.eventType === 'UPDATE') {
            setRecommendations(prev => 
              prev.map(r => 
                r.id === payload.new.id ? { ...r, ...payload.new } : r
              )
            );
          } else if (payload.eventType === 'DELETE') {
            setRecommendations(prev => 
              prev.filter(r => r.id !== payload.old.id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      console.log('Cleaning up real-time subscription...');
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchUserData = async () => {
    if (!user) {
      console.log('Mobile Debug: No user found in fetchUserData');
      setLoading(false);
      return;
    }

    console.log('Mobile Debug: Fetching fresh user data and recommendations for user:', user.id);

    try {
      // Fetch user profile
      console.log('Mobile Debug: Querying profiles table...');
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      console.log('Mobile Debug: Profile query result:', { profileData, profileError });

      if (profileError && profileError.code !== 'PGRST116') {
        console.error('Mobile Debug: Profile error (not 404):', profileError);
        throw profileError;
      }

      setUserProfile({
        ...profileData,
        priority_preferences: (profileData?.priority_preferences as Record<string, string[]>) || {}
      });

      // Fetch all recommendations including favorites
      const { data: recData, error: recError } = await supabase
        .from('user_recommendations')
        .select('*')
        .eq('user_id', user.id)
        .order('relevance_score', { ascending: false })
        .order('created_at', { ascending: false });

      console.log('Dashboard - Fetched recommendations:', recData);
      console.log('Dashboard - Total recommendations count:', recData?.length);
      console.log('Dashboard - Favorites count:', recData?.filter(r => r.is_favorite).length);
      console.log('Dashboard - Sample favorites:', recData?.filter(r => r.is_favorite).map(r => ({
        name: r.business_name,
        category: r.category,
        is_favorite: r.is_favorite
      })));

      if (recError) {
        throw recError;
      }

      // If no recommendations exist for this user, we need to generate them
      if (!recData || recData.length === 0) {
        console.log('No recommendations found for user, checking for profile data to generate new ones');
        
        // If user has no profile either, they need to take the quiz
        if (!profileData || !profileData.priorities || profileData.priorities.length === 0) {
          console.log('No profile or priorities found, user needs to take quiz');
          setRecommendations([]);
          setLoading(false);
          return;
        }
        
        // Generate recommendations using profile data
        console.log('Generating recommendations from profile data:', profileData.priorities);
        setGeneratingRecommendations(true);
        
        try {
          const quizResponse = {
            address: profileData.address || '',
            householdType: profileData.household_type || 'Individual',
            priorities: profileData.priorities,
            priorityPreferences: profileData.priority_preferences || {},
            transportationStyle: profileData.transportation_style || 'Car',
            budgetPreference: profileData.budget_preference || 'A mix of both',
            lifeStage: profileData.life_stage || 'Working professional',
            settlingTasks: profileData.settling_tasks || [],
            latitude: profileData.latitude,
            longitude: profileData.longitude
          };

          const { data: newRecsData, error: generateError } = await supabase.functions.invoke('generate-recommendations', {
            body: { 
              quizResponse,
              userId: user.id
            }
          });

          if (generateError) {
            console.error('Error generating recommendations:', generateError);
            toast({
              title: "Error generating recommendations",
              description: "Please try again or retake the quiz",
              variant: "destructive",
            });
          } else {
            console.log('Successfully generated new recommendations');
            // Fetch the newly generated recommendations
            const { data: freshRecData } = await supabase
              .from('user_recommendations')
              .select('*')
              .eq('user_id', user.id)
              .eq('is_displayed', true)
              .order('relevance_score', { ascending: false });
            
            setRecommendations(freshRecData || []);
          }
        } catch (error) {
          console.error('Error in recommendation generation:', error);
        } finally {
          setGeneratingRecommendations(false);
        }
        
        setLoading(false);
        return;
      }

      // Clean up unwanted recommendations - only keep categories in user's priorities
      if (profileData?.priorities && recData) {
        const userPriorities = profileData.priorities;
        const unwantedRecommendations = recData.filter(rec => 
          !userPriorities.includes(rec.category)
        );

        // Check for missing categories that need new recommendations
        const existingCategories = [...new Set(recData.map(rec => rec.category))];
        const missingCategories = userPriorities.filter(priority => 
          !existingCategories.includes(priority)
        );

        console.log('User priorities:', userPriorities);
        console.log('Existing categories:', existingCategories);
        console.log('Missing categories:', missingCategories);
        console.log('Unwanted recommendations:', unwantedRecommendations.length);

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
            console.log('Successfully cleaned up unwanted recommendations');
          }
        }

        // Generate recommendations for missing categories
        if (missingCategories.length > 0 && profileData) {
          console.log(`Generating recommendations for ${missingCategories.length} missing categories:`, missingCategories);
          setGeneratingRecommendations(true);
          
          try {
            // Construct proper quizResponse object with user profile data
            const quizResponse = {
              address: profileData.address || '',
              household_type: profileData.household_type || 'individual',
              priorities: missingCategories,
              transportation_style: profileData.transportation_style || 'car',
              budget_preference: profileData.budget_preference || 'mid_range',
              life_stage: profileData.life_stage || 'working_professional',
              settling_tasks: profileData.settling_tasks || []
            };

            const { data: newRecsData, error: generateError } = await supabase.functions.invoke('generate-recommendations', {
              body: { 
                quizResponse,
                userId: user?.id // Pass the user ID so the edge function can save to database
              }
            });

            if (generateError) {
              console.error('Error generating new recommendations:', generateError);
              toast({
                title: "Error",
                description: "Failed to generate new recommendations. Please try again.",
                variant: "destructive"
              });
            } else {
              console.log('Successfully generated new recommendations');
              // Add a delay to allow the edge function to save recommendations
              await new Promise(resolve => setTimeout(resolve, 2000));
              // Refetch the data to show the new recommendations
              await fetchUserData();
            }
          } catch (error) {
            console.error('Error calling generate-recommendations function:', error);
            toast({
              title: "Error",
              description: "Failed to generate new recommendations. Please try again.",
              variant: "destructive"
            });
          } finally {
            setGeneratingRecommendations(false);
          }
        }

        // Refetch all recommendations after cleanup and generation
        const { data: updatedRecData, error: updatedRecError } = await supabase
          .from('user_recommendations')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (!updatedRecError) {
          setRecommendations(updatedRecData || []);
          if (unwantedRecommendations.length > 0 || missingCategories.length > 0) {
            toast({
              title: "Preferences Updated",
              description: `Updated recommendations for your ${userPriorities.length} selected categories.`,
            });
          }
          return;
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

  const regenerateRecommendations = async () => {
    if (!user || !userProfile) return;
    
    setGeneratingRecommendations(true);
    try {
      console.log('Starting recommendation regeneration for user:', user.id);
      console.log('User profile:', userProfile);
      
      // Validate required fields
      if (!userProfile.address) {
        toast({
          title: "Missing Address",
          description: "Please add your address in your profile before generating recommendations.",
          variant: "destructive"
        });
        return;
      }

      if (!userProfile.priorities || userProfile.priorities.length === 0) {
        toast({
          title: "Missing Priorities",
          description: "Please set your priorities in your profile before generating recommendations.",
          variant: "destructive"
        });
        return;
      }

      // Clear existing recommendations
      console.log('Clearing existing recommendations...');
      const { error: deleteError } = await supabase
        .from('user_recommendations')
        .delete()
        .eq('user_id', user.id);

      if (deleteError) {
        console.error('Error clearing recommendations:', deleteError);
        throw deleteError;
      }

      // Generate new recommendations based on current profile
      const quizResponse = {
        address: userProfile.address,
        priorities: userProfile.priorities,
        household: userProfile.household_type,
        transportation: userProfile.transportation_style,
        budgetRange: userProfile.budget_preference,
        movingTimeline: userProfile.life_stage
      };

      console.log('Calling generate-recommendations with:', quizResponse);

      const { data, error: generateError } = await supabase.functions.invoke('generate-recommendations', {
        body: { 
          quizResponse,
          userId: user.id
        }
      });

      console.log('Edge function response:', { data, error: generateError });

      if (generateError) {
        console.error('Edge function error:', generateError);
        throw generateError;
      }

      // Fetch the newly generated recommendations
      console.log('Fetching fresh recommendations...');
      const { data: freshRecData, error: fetchError } = await supabase
        .from('user_recommendations')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_displayed', true)
        .order('relevance_score', { ascending: false });
      
      console.log('Fresh recommendations fetched:', freshRecData);

      if (fetchError) {
        console.error('Error fetching recommendations:', fetchError);
        throw fetchError;
      }

      setRecommendations(freshRecData || []);
      
      toast({
        title: "Recommendations Updated",
        description: `Generated ${freshRecData?.length || 0} new recommendations for your current location.`,
      });
    } catch (error) {
      console.error('Error regenerating recommendations:', error);
      toast({
        title: "Error",
        description: "Failed to regenerate recommendations. Please try again.",
        variant: "destructive"
      });
    } finally {
      setGeneratingRecommendations(false);
    }
  };

  const toggleFavorite = (rec: SavedRecommendation) => {
    try {
      const storedFavorites = localStorage.getItem('favorites');
      const favorites: any[] = storedFavorites ? JSON.parse(storedFavorites) : [];
      
      const businessKey = rec.business_name;
      const existingIndex = favorites.findIndex(fav => fav.business_name === businessKey);
      
      if (existingIndex >= 0) {
        // Remove from favorites
        favorites.splice(existingIndex, 1);
        toast({
          title: "Removed from favorites",
          description: `${rec.business_name} has been removed from your favorites.`,
        });
      } else {
        // Add to favorites
        const favoriteData = {
          business_name: rec.business_name,
          business_address: rec.business_address,
          business_description: rec.business_description,
          business_phone: rec.business_phone,
          business_website: rec.business_website,
          business_image: rec.business_image,
          business_features: rec.business_features || [],
          category: rec.category,
          distance_miles: rec.distance_miles,
          favorited_at: new Date().toISOString()
        };
        
        favorites.push(favoriteData);
        toast({
          title: "Added to favorites",
          description: `${rec.business_name} has been added to your favorites.`,
        });
        
        // Additional toast with navigation hint
        setTimeout(() => {
          toast({
            title: "Find all your favorites in the dropdown above!",
            description: "Click 'My Favorites' to see all your saved places",
            duration: 4000
          });
        }, 1000);
      }
      
      localStorage.setItem('favorites', JSON.stringify(favorites));
      
      // Trigger manual event for same-window updates
      window.dispatchEvent(new CustomEvent('favoritesUpdated'));
    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast({
        title: "Error updating favorite",
        description: "We couldn't update your favorite. Please try again.",
        variant: "destructive"
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

  // Remove confusing badges - just show essential business info in cards

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

  const priorityFilteredRecommendations = activeFilter 
    ? recommendations.filter(rec => priorityMatchesCategory(activeFilter, rec.category))
    : recommendations;

  const groupedRecommendations = priorityFilteredRecommendations.reduce((groups, rec) => {
    const category = rec.category;
    if (!groups[category]) {
      groups[category] = [];
    }
    
    // Use filtered recommendations if available, otherwise use original displayed recommendations
    if (filteredRecommendations[category]) {
      // Don't add to groups here, we'll use filteredRecommendations directly
      return groups;
    } else if (!activeCategoryFilter[category]) {
      // Only add recommendations that are marked as displayed (original 6)
      groups[category].push(rec);
    }
    
    return groups;
  }, {} as { [key: string]: SavedRecommendation[] });

  // Merge filtered recommendations into grouped recommendations
  Object.keys(filteredRecommendations).forEach(category => {
    groupedRecommendations[category] = filteredRecommendations[category];
  });

  // Sort each category's recommendations by distance (closest first)
  Object.keys(groupedRecommendations).forEach(category => {
    groupedRecommendations[category].sort((a, b) => {
      const distanceA = a.distance_miles || 999;
      const distanceB = b.distance_miles || 999;
      return distanceA - distanceB;
    });
  });

  const handleCategoryFilter = async (category: string, filter: string) => {
    const isClearing = activeCategoryFilter[category] === filter;
    
    setActiveCategoryFilter(prev => ({
      ...prev,
      [category]: isClearing ? null : filter
    }));
    
    if (isClearing) {
      // Clear filter - show original recommendations
      setFilteredRecommendations(prev => {
        const updated = { ...prev };
        delete updated[category];
        return updated;
      });
      setAdditionalResults(prev => {
        const updated = { ...prev };
        delete updated[category];
        return updated;
      });
      return;
    }
    
    // Apply filter using the edge function
    if (!user) return;
    
    setFilterLoading(prev => ({ ...prev, [category]: true }));
    
    try {
      const { data, error } = await supabase.functions.invoke('filter-recommendations', {
        body: {
          userId: user.id,
          category,
          filters: [filter],
          sortBy: 'relevance'
        }
      });
      
      if (error) {
        throw error;
      }
      
      setFilteredRecommendations(prev => ({
        ...prev,
        [category]: data.recommendations || []
      }));
      
      setAdditionalResults(prev => ({
        ...prev,
        [category]: data.additionalResults || 0
      }));
      
      if (data.additionalResults > 0) {
        toast({
          title: "Filter Applied",
          description: `Found ${data.totalCount} ${filter.toLowerCase()} options, showing ${data.additionalResults} additional results.`,
        });
      }
      
    } catch (error) {
      console.error('Error filtering recommendations:', error);
      toast({
        title: "Filter Error",
        description: "Could not apply filter. Please try again.",
        variant: "destructive"
      });
    } finally {
      setFilterLoading(prev => ({ ...prev, [category]: false }));
    }
  };

  const handlePriorityFilter = (priority: string) => {
    if (activeFilter === priority) {
      setActiveFilter(null); // Clear filter if clicking same priority
    } else {
      setActiveFilter(priority);
    }
  };


  const getUserSummary = () => {
    if (!userProfile) return "Welcome to your new neighborhood! Here's what we recommend for you.";
    
    const { address } = userProfile;
    if (address) {
      // Extract city from address (assuming format like "Street, City, State Zip")
      const addressParts = address.split(',');
      if (addressParts.length >= 2) {
        const city = addressParts[1].trim();
        return `Welcome to ${city}! Here's what we recommend for you.`;
      }
    }
    
    return "Welcome to your new neighborhood! Here's what we recommend for you.";
  };

  console.log('Dashboard render - User:', user);
  console.log('Dashboard render - Loading:', loading);
  console.log('Dashboard render - Recommendations:', recommendations.length);
  
  if (loading) {
    console.log('Showing loading state');
    return (
      <div className="min-h-screen bg-gradient-page">
        <Header />
        <div className="pt-24 px-6 max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-4">Loading Your Dashboard</h1>
            <p className="text-muted-foreground">Retrieving your saved recommendations...</p>
          </div>
          
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="h-64 bg-gradient-card shadow-card border-0">
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
    <div className="min-h-screen bg-gradient-page">
      <Header />
      <div className="pt-24 px-4 sm:px-6 max-w-5xl mx-auto pb-16">
        {/* Favorites Dropdown Navigation */}
        <div className="mb-6 flex justify-end">
          <FavoritesDropdown />
        </div>
        
        {/* Header Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-foreground mb-4">
            Your Neighborhood Dashboard
          </h1>
          
          <div className="max-w-2xl mx-auto mb-8">
            <p className="text-lg text-muted-foreground leading-relaxed">
              {getUserSummary()}
              {generatingRecommendations && (
                <span className="block mt-2 text-primary animate-pulse">
                  Generating new recommendations...
                </span>
              )}
            </p>
          </div>

          <div className="flex flex-wrap gap-4 justify-center">
            <EditPreferencesModal userProfile={userProfile} onProfileUpdate={fetchUserData} />
            <Button 
              onClick={() => refreshData(true)}
              disabled={loading || refreshing}
              variant="ghost"
              size="icon"
              className="h-8 w-8 opacity-60 hover:opacity-100"
              title="Refresh recommendations"
            >
              <RefreshCw className={`h-4 w-4 ${(loading || refreshing) ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>


        {/* Saved Recommendations */}
        {recommendations.length > 0 ? (
          <div className="space-y-12">
            {(() => {
              // Sort categories to show user's original priorities first, then new ones
              const userPriorities = userProfile?.priorities || [];
              const categoryEntries = Object.entries(groupedRecommendations);
              
              // Separate categories into original priorities and new ones
              const originalCategories = categoryEntries.filter(([category]) => 
                userPriorities.includes(category)
              );
              const newCategories = categoryEntries.filter(([category]) => 
                !userPriorities.includes(category)
              );
              
              // Sort original categories by their order in user priorities
              originalCategories.sort(([a], [b]) => {
                const indexA = userPriorities.indexOf(a);
                const indexB = userPriorities.indexOf(b);
                return indexA - indexB;
              });
              
              // Combine: original priorities first, then new categories
              const sortedCategories = [...originalCategories, ...newCategories];
              
              return sortedCategories.map(([category, categoryRecs], categoryIndex) => (
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
                      Your recommendations
                      {additionalResults[category] > 0 && (
                        <span className="text-primary font-medium">
                          {" "}(+{additionalResults[category]} from expanded search)
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Filters removed for cleaner UX */}
                
                <div className="grid gap-6 md:grid-cols-2">
                  {categoryRecs.map((rec) => {
                    const isFavoriting = favoritingRecommendations.has(rec.id);
                    return (
                      <Card key={rec.id} className="group hover:shadow-card-hover transition-all duration-300 border-0 shadow-card bg-gradient-card rounded-2xl overflow-hidden">
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
                                  favoriteBusinessNames.has(rec.business_name)
                                    ? 'text-yellow-500 hover:text-yellow-600' 
                                    : 'text-muted-foreground hover:text-yellow-500'
                                }`}
                              >
                                <Star className={`h-4 w-4 ${favoriteBusinessNames.has(rec.business_name) ? 'fill-current' : ''}`} />
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
                          
                          {/* No badges - clean display */}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
              ));
            })()}
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