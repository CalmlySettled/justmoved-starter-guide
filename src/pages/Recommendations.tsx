import { toast } from "@/utils/notificationRemover";
import { useEffect, useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

import { useAuth } from "@/hooks/useAuth";
import { useBatchRequests } from "@/hooks/useBatchRequests";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Home, MapPin, Phone, Star, ArrowLeft, Heart, Clock, Award, Users, Bookmark, ExternalLink, Navigation, Filter, X, Brain, TrendingUp } from "lucide-react";

interface Business {
  name: string;
  address: string;
  description: string;
  phone: string;
  features: string[];
  rating?: number;
  hours?: string;
  website?: string;
  image?: string;
  image_url?: string;
}

interface Recommendations {
  [category: string]: Business[];
}

interface QuizResponse {
  zipCode: string;
  householdType: string;
  priorities: string[];
  transportationStyle: string;
  budgetPreference: string;
  lifeStage: string;
  settlingTasks: string[];
}

export default function Recommendations() {
  const location = useLocation();
  const navigate = useNavigate();
  
  const { user } = useAuth();
  const { batchInvoke } = useBatchRequests();
  const [recommendations, setRecommendations] = useState<Recommendations | null>(null);
  const [loading, setLoading] = useState(true);
  const [quizResponse, setQuizResponse] = useState<QuizResponse | null>(null);
  const [savingRecommendations, setSavingRecommendations] = useState<Set<string>>(new Set());
  const [activeFilters, setActiveFilters] = useState<{ [category: string]: string[] }>({});
  const [favoritingRecommendations, setFavoritingRecommendations] = useState<Set<string>>(new Set());

  useEffect(() => {
    const state = location.state as { quizResponse?: QuizResponse };
    if (!state?.quizResponse) {
      toast({
        title: "No quiz data found",
        description: "Please complete the quiz first to get recommendations.",
        variant: "destructive"
      });
      navigate("/onboarding");
      return;
    }

    setQuizResponse(state.quizResponse);
    generateRecommendations(state.quizResponse);
  }, [location.state, navigate, toast]);

  const generateRecommendations = async (quizData: QuizResponse) => {
    try {
      setLoading(true);
      
      // Ensure user is authenticated before generating recommendations
      if (!user) {
        toast({
          title: "Authentication required",
          description: "Please sign in to get personalized recommendations.",
          variant: "destructive"
        });
        navigate("/auth");
        return;
      }
      
      // ✅ COST PROTECTION: Always pass userId to enable caching
      const data = await batchInvoke('generate-recommendations', {
        body: { 
          quizResponse: quizData,
          userId: user.id  // CRITICAL: This enables server-side caching!
        }
      });

      setRecommendations(data.recommendations);
    } catch (error: any) {
      console.error('Error generating recommendations:', error);
      const errorMessage = error?.message || "We're having trouble generating your personalized recommendations. Please try again.";
      toast({
        title: "Error generating recommendations",
        description: errorMessage,
        variant: "destructive"
      });
      
      // If this was an authentication error, redirect to auth
      if (errorMessage.includes('authentication') || errorMessage.includes('unauthorized')) {
        navigate("/auth");
      }
    } finally {
      setLoading(false);
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

  const getBusinessTagline = (business: Business, category: string) => {
    // Generate taglines based on business features and category
    if (category.toLowerCase().includes('grocery')) {
      if (business.name.toLowerCase().includes('geissler')) return "Family-owned grocery chain with great produce";
      if (business.features.some(f => f.toLowerCase().includes('organic'))) return "Fresh organic produce and natural foods";
      if (business.features.some(f => f.toLowerCase().includes('affordable'))) return "Affordable groceries for everyday needs";
      return "Your neighborhood grocery destination";
    }
    if (category.toLowerCase().includes('fitness')) {
      return "Stay active and healthy in your community";
    }
    if (category.toLowerCase().includes('restaurant')) {
      return "Local dining favorite";
    }
    if (category.toLowerCase().includes('faith')) {
      return "Welcoming spiritual community";
    }
    if (category.toLowerCase().includes('green space')) {
      return "Perfect for outdoor activities and relaxation";
    }
    return "Highly recommended local spot";
  };

  const getBusinessBadges = (business: Business) => {
    const badges = [];
    
    // ⭐ "High Ratings" for businesses with rating ≥ 4.0
    if (business.rating && business.rating >= 4.0) {
      badges.push({ 
        label: "High Ratings", 
        icon: "⭐", 
        color: "bg-yellow-50 text-yellow-700 border border-yellow-200" 
      });
    }
    
    // 🏪 "Local Favorite" for non-franchise businesses
    const businessNameLower = business.name.toLowerCase();
    const franchiseIndicators = ['mcdonalds', 'subway', 'starbucks', 'walmart', 'target', 'cvs', 'walgreens', 'kroger', 'safeway', 'whole foods', 'trader joe', 'costco', 'planet fitness', 'la fitness'];
    const isLocalFavorite = !franchiseIndicators.some(franchise => businessNameLower.includes(franchise));
    
    if (isLocalFavorite) {
      badges.push({ 
        label: "Local", 
        icon: "🏪", 
        color: "bg-green-50 text-green-700 border border-green-200" 
      });
    }
    
    return badges.slice(0, 2); // Only show 2 most important badges
  };

  const getBusinessImage = (business: Business, category: string) => {
    // First priority: Brand logos for recognizable chains
    const brandLogos = {
      'safeway': '/lovable-uploads/542619d4-3d1e-40d0-af95-87134e5ef6f7.png',
      'whole foods': '/lovable-uploads/cec2b417-1f35-49f4-978b-2f52c1219d84.png',
      'trader joe': '/lovable-uploads/89feab14-0e28-4cd7-a754-faee6f9fcdc1.png',
      'walmart': '/lovable-uploads/c12c56bb-6db1-41e0-81c2-8c078a7a9f4f.png',
      'target': '/lovable-uploads/1ef25225-bb29-4bb5-8412-d243c3f03382.png',
      'costco': '/lovable-uploads/eb8b8540-f130-414b-84da-27c82f2c8431.png',
      'kroger': '/lovable-uploads/ed0b00a3-fd88-4104-b572-2dcd3ea54425.png',
      'stop & shop': '/lovable-uploads/4d41876b-9d9e-4a4d-abb8-5b4b924e2e23.png',
      'aldi': '/lovable-uploads/eb8b8540-f130-414b-84da-27c82f2c8431.png',
      'planet fitness': '/lovable-uploads/b393c4b5-8487-47b0-a991-d59fbc4c421c.png',
      'la fitness': '/lovable-uploads/501a0890-d137-41da-96d5-83f7c4514751.png',
      'gold\'s gym': '/lovable-uploads/8ae3c503-4c33-4e74-a098-c0bf7cf1e90f.png',
      '24 hour fitness': '/lovable-uploads/501a0890-d137-41da-96d5-83f7c4514751.png',
      'anytime fitness': '/lovable-uploads/501a0890-d137-41da-96d5-83f7c4514751.png'
    };
    
    // Check for brand logo match
    const businessNameLower = business.name.toLowerCase();
    for (const [brand, logoUrl] of Object.entries(brandLogos)) {
      if (businessNameLower.includes(brand)) {
        return logoUrl;
      }
    }
    
    // Second priority: Use image URL from API (Google Places or Yelp)
    if (business.image_url && business.image_url.length > 0) {
      return business.image_url;
    }
    
    // Third priority: Category-based fallback images
    const categoryFallbacks = {
      'grocery': '/lovable-uploads/5e3cefe3-ab65-41b6-9ee4-0c5b23a69fa1.png',
      'fitness': '/lovable-uploads/501a0890-d137-41da-96d5-83f7c4514751.png',
      'church': '/lovable-uploads/c4857259-5956-4aa3-8861-a261d3185571.png',
      'faith': '/lovable-uploads/c4857259-5956-4aa3-8861-a261d3185571.png',
      'restaurant': '/lovable-uploads/da2a2bcf-7c5a-4b95-bc28-3b8bd337cc1c.png',
      'medical': '/lovable-uploads/e271092c-0635-42eb-894e-482c1c580fee.png',
      'green space': '/lovable-uploads/86e7b131-4de7-4288-9579-ec892f903f5b.png',
      'default': '/lovable-uploads/da2a2bcf-7c5a-4b95-bc28-3b8bd337cc1c.png'
    };
    
    // Determine category key
    let categoryKey = 'default';
    const categoryLower = category.toLowerCase();
    
    if (categoryLower.includes('grocery') || categoryLower.includes('supermarket') || categoryLower.includes('market')) {
      categoryKey = 'grocery';
    } else if (categoryLower.includes('fitness') || categoryLower.includes('gym') || categoryLower.includes('exercise')) {
      categoryKey = 'fitness';
    } else if (categoryLower.includes('church') || categoryLower.includes('faith') || categoryLower.includes('religious')) {
      categoryKey = 'faith';
    } else if (categoryLower.includes('restaurant') || categoryLower.includes('food') || categoryLower.includes('dining')) {
      categoryKey = 'restaurant';
    } else if (categoryLower.includes('medical') || categoryLower.includes('health') || categoryLower.includes('doctor')) {
      categoryKey = 'medical';
    } else if (categoryLower.includes('park') || categoryLower.includes('green') || categoryLower.includes('recreation')) {
      categoryKey = 'green space';
    }
    
    return categoryFallbacks[categoryKey as keyof typeof categoryFallbacks];
  };

  const getGoogleMapsUrl = (address: string, businessName: string) => {
    const query = encodeURIComponent(`${businessName} ${address}`);
    return `https://www.google.com/maps/search/?api=1&query=${query}`;
  };

  const getCategoryFilters = (category: string) => {
    const categoryLower = category.toLowerCase();
    
    if (categoryLower.includes('grocery')) {
      return [
        'Organic Options',
        'Budget-Friendly', 
        'Open Late',
        'Locally Owned',
        'International Foods',
        'Prepared Meals / Deli',
        'Delivery Available',
        'Parking Available'
      ];
    }
    
    if (categoryLower.includes('fitness') || categoryLower.includes('gym')) {
      return [
        'Group Classes',
        'Personal Training',
        'Sauna',
        'Pool',
        '24-Hour Access',
        'Cardio Machines',
        'Strength Training',
        'Childcare Onsite',
        'Women-Only Spaces'
      ];
    }
    
    if (categoryLower.includes('faith') || categoryLower.includes('church')) {
      return [
        'Baptist',
        'Catholic',
        'Episcopal',
        'Non-Denominational',
        'Methodist',
        'Presbyterian',
        'Lutheran',
        'Pentecostal'
      ];
    }
    
    if (categoryLower.includes('restaurant') || categoryLower.includes('dining')) {
      return [
        'Family-Friendly',
        'Fine Dining',
        'Casual Dining',
        'Takeout Available',
        'Outdoor Seating',
        'Live Music',
        'Happy Hour',
        'Vegan Options'
      ];
    }
    
    if (categoryLower.includes('medical') || categoryLower.includes('health')) {
      return [
        'Urgent Care',
        'Walk-In',
        'Specialists', 
        'Emergency',
        'Family Practice',
        'Pediatrics',
        'Primary Care',
        'Same-Day Appointments'
      ];
    }
    
    // Default filters for other categories
    return [
      'Highly Rated',
      'Budget-Friendly',
      'Locally Owned',
      'Parking Available',
      'Wheelchair Accessible'
    ];
  };

  const toggleFilter = async (category: string, filter: string) => {
    setActiveFilters(prev => {
      const categoryFilters = prev[category] || [];
      const isActive = categoryFilters.includes(filter);
      
      const newFilters = {
        ...prev,
        [category]: isActive 
          ? categoryFilters.filter(f => f !== filter)
          : [...categoryFilters, filter]
      };
      
      // If adding a dynamic filter, fetch additional results
      if (!isActive && shouldUseDynamicFilter(category, filter)) {
        fetchDynamicFilterResults(category, filter);
      }
      
      return newFilters;
    });
  };

  const shouldUseDynamicFilter = (category: string, filter: string) => {
    const dynamicFilters = [
      'urgent care', 'walk-in', 'specialists', 'emergency', 'family practice', 'pediatrics',
      'organic options', 'budget-friendly', 'group classes', 'personal training', 
      '24-hour access', 'cardio machines', 'strength training'
    ];
    return dynamicFilters.includes(filter.toLowerCase());
  };

  const fetchDynamicFilterResults = async (category: string, filter: string) => {
    if (!quizResponse) return;
    
    try {
      setLoading(true);
      
      // Get coordinates securely from server-side geocoding  
      const geocodeData = await batchInvoke('geocode-address', {
        body: { address: quizResponse.zipCode }
      });
      const coordinates = geocodeData?.coordinates || { lat: 41.8394397, lng: -72.7516033 };
      
      const filterData = await batchInvoke('generate-recommendations', {
        body: { 
          quizResponse,
          dynamicFilter: {
            category,
            filter,
            coordinates
          }
        }
      });

      // Merge the filtered results with existing recommendations
      setRecommendations(prev => {
        if (!prev) return filterData.recommendations;
        
        const currentBusiness = prev[category] || [];
        const newBusinesses = filterData.recommendations[category] || [];
        
        // Combine and deduplicate by business name
        const combined = [...currentBusiness];
        newBusinesses.forEach(newBiz => {
          if (!combined.some(existing => existing.name === newBiz.name)) {
            combined.push(newBiz);
          }
        });
        
        return {
          ...prev,
          [category]: combined
        };
      });
      
    } catch (error) {
      console.error('Error fetching dynamic filter results:', error);
      toast({
        title: "Filter update failed",
        description: "Could not fetch additional options for this filter.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = (category: string) => {
    setActiveFilters(prev => ({
      ...prev,
      [category]: []
    }));
  };

  const filterBusinesses = (businesses: Business[], category: string) => {
    const categoryFilters = activeFilters[category] || [];
    if (categoryFilters.length === 0) return businesses;
    
    return businesses.filter(business => {
      return categoryFilters.every(filter => {
        // Check if the business features match the filter
        const filterLower = filter.toLowerCase();
        const businessFeatures = business.features.map(f => f.toLowerCase()).join(' ');
        const businessName = business.name.toLowerCase();
        
        // Match various ways a filter could be represented in business features
        if (filterLower.includes('organic')) return businessFeatures.includes('organic');
        if (filterLower.includes('budget') || filterLower.includes('affordable')) return businessFeatures.includes('budget') || businessFeatures.includes('affordable');
        if (filterLower.includes('late') || filterLower.includes('24')) return businessFeatures.includes('24') || businessFeatures.includes('late');
        if (filterLower.includes('local')) return businessFeatures.includes('local') || businessFeatures.includes('family');
        if (filterLower.includes('international')) return businessFeatures.includes('international') || businessFeatures.includes('ethnic');
        if (filterLower.includes('deli') || filterLower.includes('prepared')) return businessFeatures.includes('deli') || businessFeatures.includes('prepared');
        if (filterLower.includes('delivery')) return businessFeatures.includes('delivery');
        if (filterLower.includes('parking')) return businessFeatures.includes('parking');
        if (filterLower.includes('group') || filterLower.includes('classes')) return businessFeatures.includes('classes') || businessFeatures.includes('group');
        if (filterLower.includes('personal') || filterLower.includes('training')) return businessFeatures.includes('personal') || businessFeatures.includes('training');
        if (filterLower.includes('sauna')) return businessFeatures.includes('sauna');
        if (filterLower.includes('pool')) return businessFeatures.includes('pool');
        if (filterLower.includes('cardio')) return businessFeatures.includes('cardio');
        if (filterLower.includes('strength')) return businessFeatures.includes('strength') || businessFeatures.includes('weights');
        if (filterLower.includes('childcare')) return businessFeatures.includes('childcare') || businessFeatures.includes('kids');
        if (filterLower.includes('women')) return businessFeatures.includes('women') || businessFeatures.includes('female');
        
        // For faith communities, check denomination in name or features
        if (['baptist', 'catholic', 'episcopal', 'methodist', 'presbyterian', 'lutheran', 'pentecostal'].includes(filterLower)) {
          return businessName.includes(filterLower) || businessFeatures.includes(filterLower);
        }
        if (filterLower.includes('non-denominational')) {
          return businessName.includes('community') || businessFeatures.includes('non-denominational') || businessFeatures.includes('community');
        }
        
        // Default: check if filter appears anywhere in features or name
        return businessFeatures.includes(filterLower) || businessName.includes(filterLower);
      });
    });
  };

  const getTopPicks = () => {
    if (!recommendations) return [];
    const topPicks = [];
    Object.entries(recommendations).forEach(([category, businesses]) => {
      if (category !== '_rawResponse' && businesses.length > 0) {
        topPicks.push({ ...businesses[0], category });
      }
    });
    return topPicks.slice(0, 3); // Top 3 picks
  };

  const saveRecommendation = async (business: Business, category: string) => {
    if (!user) {
      toast({
        title: "Please log in",
        description: "You need to be logged in to save recommendations.",
        variant: "destructive"
      });
      navigate("/auth");
      return;
    }

    const key = `${category}-${business.name}`;
    setSavingRecommendations(prev => new Set(prev).add(key));

    try {
      const imageUrl = business.image_url && business.image_url.trim() !== '' ? business.image_url : null;
      console.log(`Saving recommendation for ${business.name}, image_url: ${business.image_url}, processed: ${imageUrl}`);
      
      const { error } = await supabase
        .from('user_recommendations')
        .insert({
          user_id: user.id,
          category: category,
          business_name: business.name,
          business_address: business.address,
          business_description: getBusinessTagline(business, category),
          business_phone: business.phone,
          business_website: business.website,
          business_image: imageUrl,
          business_features: business.features || [],
          is_favorite: false
        });

      if (error) {
        throw error;
      }

      toast({
        title: "Recommendation saved!",
        description: `${business.name} has been saved to your dashboard.`,
      });
    } catch (error: any) {
      console.error('Error saving recommendation:', error);
      toast({
        title: "Error saving recommendation",
        description: "We couldn't save this recommendation. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSavingRecommendations(prev => {
        const newSet = new Set(prev);
        newSet.delete(key);
        return newSet;
      });
    }
  };

  const toggleFavorite = async (business: Business, category: string) => {
    if (!user) {
      toast({
        title: "Please log in",
        description: "You need to be logged in to favorite recommendations.",
        variant: "destructive"
      });
      navigate("/auth");
      return;
    }

    const key = `${category}-${business.name}-${business.address}`;
    setFavoritingRecommendations(prev => new Set(prev).add(key));

    try {
      // First check if the business is already saved
      const { data: existingRecommendations, error: fetchError } = await supabase
        .from('user_recommendations')
        .select('id, is_favorite')
        .eq('user_id', user.id)
        .eq('business_name', business.name)
        .eq('business_address', business.address)
        .eq('category', category);

      if (fetchError) {
        throw fetchError;
      }

      if (existingRecommendations && existingRecommendations.length > 0) {
        console.log('Found existing records for business:', business.name);
        console.log('Current favorite statuses:', existingRecommendations.map(r => r.is_favorite));
        
        // Check if ANY record is currently favorited
        const anyFavorited = existingRecommendations.some(rec => rec.is_favorite);
        const newFavoriteStatus = !anyFavorited;
        
        console.log('Any favorited:', anyFavorited, 'New status will be:', newFavoriteStatus);
        
        // Update ALL matching records to have the same favorite status
        const { error: updateError } = await supabase
          .from('user_recommendations')
          .update({ is_favorite: newFavoriteStatus })
          .eq('user_id', user.id)
          .eq('business_name', business.name)
          .eq('business_address', business.address)
          .eq('category', category);

        if (updateError) {
          console.error('Error updating favorite status:', updateError);
          throw updateError;
        }

        console.log('Successfully updated favorite status to:', newFavoriteStatus);

        // Track interaction for AI learning
        if (newFavoriteStatus) {
          await trackUserInteraction(business, category, 'favorite');
        }

        toast({
          title: newFavoriteStatus ? "Added to favorites" : "Removed from favorites",
          description: `${business.name} has been ${newFavoriteStatus ? 'added to' : 'removed from'} your favorites.`,
        });
      } else {
        // Save as new recommendation with favorite status
        const imageUrl = business.image_url && business.image_url.trim() !== '' ? business.image_url : null;
        
        const { error: insertError } = await supabase
          .from('user_recommendations')
          .insert({
            user_id: user.id,
            category: category,
            business_name: business.name,
            business_address: business.address,
            business_description: getBusinessTagline(business, category),
            business_phone: business.phone,
            business_website: business.website,
            business_image: imageUrl,
            business_features: business.features || [],
            is_favorite: true
          });

        if (insertError) {
          throw insertError;
        }

        toast({
          title: "Added to favorites",
          description: `${business.name} has been saved and added to your favorites.`,
        });
      }
    } catch (error: any) {
      console.error('Error favoriting recommendation:', error);
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

  // Track user interactions for AI learning
  const trackUserInteraction = async (business: Business, category: string, interactionType: 'favorite' | 'call' | 'visit' | 'view') => {
    if (!user) return;

    try {
      // Update interaction count for this business
      const { error } = await supabase
        .rpc('increment_interaction', { 
          p_user_id: user.id,
          p_business_name: business.name,
          p_category: category
        });

      if (error) {
        console.error('Error tracking interaction:', error);
      } else {
        console.log(`✅ Tracked ${interactionType} interaction for ${business.name}`);
      }
    } catch (error) {
      console.error('Error in trackUserInteraction:', error);
    }
  };

  const getUserSummary = () => {
    if (!quizResponse) return "";
    const { lifeStage, zipCode, transportationStyle, budgetPreference } = quizResponse;
    return `You're ${lifeStage.toLowerCase().startsWith('a') ? 'an' : 'a'} ${lifeStage.toLowerCase()} in ${zipCode} with ${transportationStyle.toLowerCase()} and ${budgetPreference.toLowerCase()} — here's where to find ${quizResponse.priorities.slice(0, 3).join(', ').toLowerCase()}, and more.`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-subtle">
        <Header />
        <div className="pt-24 px-6 max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-4">Generating Your Personalized Recommendations</h1>
            <p className="text-muted-foreground">We're finding the best places in your neighborhood...</p>
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

  const topPicks = getTopPicks();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="pt-24 px-4 max-w-5xl mx-auto pb-16">
        {/* Welcome Section */}
        <div className="text-center mb-12">
          {!user ? (
            // Show save prompt for non-authenticated users
            <div className="bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20 rounded-xl p-8 mb-8">
              <h2 className="text-2xl font-bold text-foreground mb-4">
                Save Your Personalized Recommendations
              </h2>
              <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
                Create an account to save these recommendations, get updates on new places, 
                and access your personalized dashboard anytime.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link to="/auth">
                  <Button variant="hero" size="lg" className="px-8">
                    Save My Recommendations
                  </Button>
                </Link>
                <Button 
                  variant="outline" 
                  size="lg" 
                  onClick={() => navigate("/onboarding")}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Retake Quiz
                </Button>
              </div>
            </div>
          ) : (
            // Show dashboard link for authenticated users
            <div className="flex items-center justify-center mb-6 gap-4">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate("/onboarding")}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retake Quiz
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => navigate("/dashboard")}
              >
                <Bookmark className="h-4 w-4 mr-2" />
                View Dashboard
              </Button>
            </div>
          )}
          
          <h1 className="text-5xl font-bold text-foreground mb-6">
            Welcome to Bloomfield! Let's get you settled.
          </h1>
          
          {quizResponse && (
            <div className="max-w-3xl mx-auto">
              <p className="text-xl text-muted-foreground leading-relaxed">
                You're a couple with a car and a flexible budget — here's what we've found for your grocery, fitness, and lifestyle needs in 06002.
              </p>
              
            </div>
          )}
        </div>


        {/* Recommendations by Category */}
        {recommendations ? (
          <div className="space-y-16">
            {Object.entries(recommendations).map(([category, businesses], categoryIndex) => (
              category !== '_rawResponse' && (
                <div key={category} className="space-y-8">
                  {/* Section Divider */}
                  {categoryIndex > 0 && <div className="border-t border-border/30 pt-16" />}
                  
                  <div className="flex items-center gap-4 mb-8">
                    <div className="p-3 bg-primary/10 rounded-2xl">
                      <span className="text-2xl">{getCategoryIcon(category)}</span>
                    </div>
                    <div>
                      <h2 className="text-3xl font-bold text-foreground">
                        {category.charAt(0).toUpperCase() + category.slice(1)}
                      </h2>
                      <p className="text-muted-foreground mt-1">
                        Local recommendations in your area
                      </p>
                    </div>
                  </div>
                  
                  {/* Category Filters */}
                  <div className="mb-8">
                    <div className="flex items-center gap-3 mb-4">
                      <Filter className="h-5 w-5 text-muted-foreground" />
                      <h3 className="text-lg font-semibold text-foreground">Filter options</h3>
                      {(activeFilters[category] || []).length > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => clearFilters(category)}
                          className="text-muted-foreground hover:text-foreground ml-auto"
                        >
                          <X className="h-4 w-4 mr-1" />
                          Clear filters
                        </Button>
                      )}
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                      {getCategoryFilters(category).map((filter) => {
                        const isActive = (activeFilters[category] || []).includes(filter);
                        return (
                          <button
                            key={filter}
                            onClick={() => toggleFilter(category, filter)}
                            className={`
                              px-4 py-2 rounded-full text-sm font-medium border transition-all duration-200
                              ${isActive 
                                ? 'bg-primary text-primary-foreground border-primary shadow-md' 
                                : 'bg-background text-muted-foreground border-border hover:border-primary hover:text-primary hover:bg-primary/5'
                              }
                            `}
                          >
                            {filter}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  
                  {/* Business Cards Grid */}
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {(() => {
                      const filteredBusinesses = filterBusinesses(businesses, category);
                      if (filteredBusinesses.length === 0) {
                        return (
                          <div className="col-span-full text-center py-12">
                            <div className="p-4 bg-muted/30 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                              <Filter className="h-8 w-8 text-muted-foreground" />
                            </div>
                            <h3 className="text-xl font-semibold text-foreground mb-2">No matches found</h3>
                            <p className="text-muted-foreground mb-4">
                              Try adjusting your filters to see more recommendations.
                            </p>
                            <Button
                              variant="outline"
                              onClick={() => clearFilters(category)}
                              className="text-sm"
                            >
                              Clear all filters
                            </Button>
                          </div>
                        );
                      }
                      
                      return filteredBusinesses.map((business, index) => {
                        const badges = getBusinessBadges(business);
                         const saveKey = `${category}-${business.name}`;
                         const favoriteKey = `${category}-${business.name}-${business.address}`;
                         const isSaving = savingRecommendations.has(saveKey);
                         const isFavoriting = favoritingRecommendations.has(favoriteKey);
                         const businessImage = getBusinessImage(business, category);
                         const hours = business.hours || "Open daily 7am–9pm";
                        
                        return (
                          <Card key={index} className="group hover:shadow-xl transition-all duration-300 border-0 shadow-lg bg-white rounded-3xl overflow-hidden">
                            {/* Business Image */}
                            <div className="relative h-48 bg-muted overflow-hidden">
                              <img 
                                src={businessImage} 
                                alt={business.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.src = 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=300&fit=crop';
                                }}
                              />
                               <div className="absolute top-3 right-3 flex gap-2">
                                 <Button
                                   variant="secondary"
                                   size="sm"
                                   onClick={() => toggleFavorite(business, category)}
                                   disabled={isFavoriting}
                                   className="bg-white/90 hover:bg-white text-foreground shadow-lg rounded-full w-8 h-8 p-0"
                                 >
                                   <Star className="h-3 w-3" />
                                 </Button>
                                 <Button
                                   variant="secondary"
                                   size="sm"
                                   onClick={() => saveRecommendation(business, category)}
                                   disabled={isSaving}
                                   className="bg-white/90 hover:bg-white text-foreground shadow-lg rounded-full w-8 h-8 p-0"
                                 >
                                   <Bookmark className="h-3 w-3" />
                                 </Button>
                               </div>
                            </div>

                            <div className="p-6 space-y-4">
                               {/* Business Name */}
                               <div className="text-center">
                                 {business.website ? (
                                   <a 
                                     href={business.website.startsWith('http') ? business.website : `https://${business.website}`}
                                     target="_blank"
                                     rel="noopener noreferrer"
                                     className="text-xl font-bold text-slate-900 hover:text-primary transition-colors leading-tight mb-1 inline-block"
                                   >
                                     {business.name}
                                   </a>
                                 ) : (
                                   <h3 className="text-xl font-bold text-slate-900 leading-tight mb-1">
                                     {business.name}
                                   </h3>
                                 )}
                                 <p className="text-sm text-muted-foreground">
                                   {getBusinessTagline(business, category)}
                                 </p>
                               </div>

                              {/* Address */}
                              {business.address && (
                                <div className="text-center">
                                  <a 
                                    href={getGoogleMapsUrl(business.address, business.name)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 text-primary hover:text-primary/80 transition-colors text-sm font-medium"
                                  >
                                    <Navigation className="h-3 w-3" />
                                    {business.address}
                                  </a>
                                </div>
                              )}

                              {/* Hours */}
                              <div className="text-center">
                                <div className="inline-flex items-center gap-1.5 text-muted-foreground text-sm">
                                  <Clock className="h-3 w-3" />
                                  <span>{hours}</span>
                                </div>
                              </div>

                              {/* Tags/Badges */}
                              {badges.length > 0 && (
                                 <div className="flex justify-center gap-1.5 flex-wrap">
                                   {badges.slice(0, 2).map((badge, badgeIndex) => (
                                     <div key={badgeIndex} className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>
                                       <span className="text-xs">{badge.icon}</span>
                                       {badge.label}
                                     </div>
                                   ))}
                                 </div>
                              )}

                              {/* Action Buttons */}
                              <div className="flex gap-2 justify-center pt-2">
                                {business.phone && (
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    className="flex-1 text-xs"
                                    asChild
                                  >
                                    <a href={`tel:${business.phone}`}>
                                      <Phone className="h-3 w-3 mr-1" />
                                      Call
                                    </a>
                                  </Button>
                                )}
                                
                                {business.website && (
                                  <Button 
                                    variant="default" 
                                    size="sm"
                                    className="flex-1 text-xs"
                                    asChild
                                  >
                                    <a href={business.website} target="_blank" rel="noopener noreferrer">
                                      <ExternalLink className="h-3 w-3 mr-1" />
                                      Visit
                                    </a>
                                  </Button>
                                )}
                              </div>
                            </div>
                          </Card>
                        );
                      });
                    })()}
                  </div>
                </div>
              )
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="p-4 bg-muted/50 rounded-full w-24 h-24 mx-auto mb-6 flex items-center justify-center">
              <Home className="h-12 w-12 text-muted-foreground" />
            </div>
            <h2 className="text-2xl font-semibold mb-3 text-foreground">No recommendations generated</h2>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              We couldn't generate recommendations at this time. Please try again.
            </p>
            <Button 
              onClick={() => quizResponse && generateRecommendations(quizResponse)}
              variant="default"
              size="lg"
            >
              Try Again
            </Button>
          </div>
        )}

        {/* CTA Section */}
        <div className="mt-24 text-center">
          <div className="p-8 bg-gradient-to-br from-primary/5 to-primary/10 rounded-3xl border border-primary/20">
            <Users className="h-12 w-12 text-primary mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-foreground mb-3">
              Need help getting set up?
            </h3>
            <p className="text-muted-foreground mb-6 max-w-lg mx-auto">
              Get personalized assistance with moving tasks, local connections, and settling into your new neighborhood.
            </p>
            <Button size="lg" variant="default" className="px-8">
              Get Your Custom Starter Kit
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}