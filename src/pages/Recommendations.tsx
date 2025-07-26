import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Home, MapPin, Phone, Star, ArrowLeft, Heart, Clock, Award, Users, Bookmark, ExternalLink, Navigation, Filter, X } from "lucide-react";

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
  const { toast } = useToast();
  const { user } = useAuth();
  const [recommendations, setRecommendations] = useState<Recommendations | null>(null);
  const [loading, setLoading] = useState(true);
  const [quizResponse, setQuizResponse] = useState<QuizResponse | null>(null);
  const [savingRecommendations, setSavingRecommendations] = useState<Set<string>>(new Set());
  const [activeFilters, setActiveFilters] = useState<{ [category: string]: string[] }>({});

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
      
      const { data, error } = await supabase.functions.invoke('generate-recommendations', {
        body: { quizResponse: quizData }
      });

      if (error) {
        throw error;
      }

      setRecommendations(data.recommendations);
    } catch (error: any) {
      console.error('Error generating recommendations:', error);
      toast({
        title: "Error generating recommendations",
        description: "We're having trouble generating your personalized recommendations. Please try again.",
        variant: "destructive"
      });
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
    if (business.features.some(f => f.toLowerCase().includes('24') || f.toLowerCase().includes('hour'))) {
      badges.push({ label: "24 Hours", icon: Clock, color: "bg-blue-50 text-blue-700 border border-blue-200" });
    }
    if (business.features.some(f => f.toLowerCase().includes('local') || f.toLowerCase().includes('family'))) {
      badges.push({ label: "Local", icon: Heart, color: "bg-green-50 text-green-700 border border-green-200" });
    }
    if (business.features.some(f => f.toLowerCase().includes('organic'))) {
      badges.push({ label: "Organic", icon: Award, color: "bg-emerald-50 text-emerald-700 border border-emerald-200" });
    }
    if (business.features.some(f => f.toLowerCase().includes('affordable') || f.toLowerCase().includes('budget'))) {
      badges.push({ label: "Budget-Friendly", icon: Award, color: "bg-orange-50 text-orange-700 border border-orange-200" });
    }
    return badges.slice(0, 3); // Max 3 badges per business
  };

  const getBusinessImage = (business: Business, category: string) => {
    // First, try to use the image URL from Yelp API
    if (business.image_url && business.image_url.length > 0) {
      return business.image_url;
    }
    
    // Then fall back to uploaded business images for specific businesses
    
    // Grocery Stores
    if (business.name.toLowerCase().includes('geissler')) {
      return '/lovable-uploads/e9c9bd3b-56c9-4c4d-9908-acb6c4950b77.png';
    }
    if (business.name.toLowerCase().includes('stop') && business.name.toLowerCase().includes('shop')) {
      return '/lovable-uploads/f379c4b6-3d2f-4893-860e-70853f3b634c.png';
    }
    if (business.name.toLowerCase().includes('fresh farm')) {
      return '/lovable-uploads/63cb8a6f-dfac-4328-b8d3-b392fedc9993.png';
    }
    if (business.name.toLowerCase().includes('sav-mor')) {
      return '/lovable-uploads/c12c56bb-6db1-41e0-81c2-8c078a7a9f4f.png';
    }
    if (business.name.toLowerCase().includes('aldi')) {
      return '/lovable-uploads/eb8b8540-f130-414b-84da-27c82f2c8431.png';
    }
    
    // Gyms/Fitness
    if (business.name.toLowerCase().includes('total health')) {
      return '/lovable-uploads/501a0890-d137-41da-96d5-83f7c4514751.png';
    }
    if (business.name.toLowerCase().includes('planet fitness')) {
      return '/lovable-uploads/b393c4b5-8487-47b0-a991-d59fbc4c421c.png';
    }
    if (business.name.toLowerCase().includes('club fitness')) {
      return '/lovable-uploads/16cb62a7-bb30-432d-804b-9f20266bbce7.png';
    }
    if (business.name.toLowerCase().includes('gold\'s gym')) {
      return '/lovable-uploads/8ae3c503-4c33-4e74-a098-c0bf7cf1e90f.png';
    }
    if (business.name.toLowerCase().includes('fit body boot camp')) {
      return '/lovable-uploads/2beb6084-f2f4-4058-9014-43a42f522449.png';
    }
    
    // Churches/Faith Communities
    if (business.name.toLowerCase().includes('wintonbury')) {
      return '/lovable-uploads/c4857259-5956-4aa3-8861-a261d3185571.png';
    }
    if (business.name.toLowerCase().includes('sacred heart')) {
      return '/lovable-uploads/cc86ee7c-c45c-4416-b52f-c3f131ca741c.png';
    }
    if (business.name.toLowerCase().includes('first cathedral')) {
      return '/lovable-uploads/f8f75b8b-1f7f-457f-a75e-b4ca2d363cf6.png';
    }
    if (business.name.toLowerCase().includes('old st') && business.name.toLowerCase().includes('andrew')) {
      return '/lovable-uploads/62c94628-65d4-4af6-9058-5b2b566bd87b.png';
    }
    if (business.name.toLowerCase().includes('bloomfield congregational')) {
      return '/lovable-uploads/09dfac75-fdf4-4cbe-8dbb-a8d1e95e149c.png';
    }
    
    // Default placeholder images by category
    const placeholders = {
      'grocery': 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=300&fit=crop',
      'fitness': 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=300&fit=crop',
      'restaurant': 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400&h=300&fit=crop',
      'faith': 'https://images.unsplash.com/photo-1466442929976-97f336a657be?w=400&h=300&fit=crop',
      'green space': 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400&h=300&fit=crop',
      'medical': 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?w=400&h=300&fit=crop'
    };
    
    const categoryKey = Object.keys(placeholders).find(key => 
      category.toLowerCase().includes(key)
    ) || 'grocery';
    
    return placeholders[categoryKey as keyof typeof placeholders];
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
    
    // Default filters for other categories
    return [
      'Highly Rated',
      'Budget-Friendly',
      'Locally Owned',
      'Parking Available',
      'Wheelchair Accessible'
    ];
  };

  const toggleFilter = (category: string, filter: string) => {
    setActiveFilters(prev => {
      const categoryFilters = prev[category] || [];
      const isActive = categoryFilters.includes(filter);
      
      return {
        ...prev,
        [category]: isActive 
          ? categoryFilters.filter(f => f !== filter)
          : [...categoryFilters, filter]
      };
    });
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
          business_description: business.description,
          business_phone: business.phone,
          business_image: imageUrl,
          business_features: business.features || []
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
          <div className="flex items-center justify-center mb-6 gap-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate("/onboarding")}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retake Quiz
            </Button>
            {user && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => navigate("/dashboard")}
              >
                <Bookmark className="h-4 w-4 mr-2" />
                View Dashboard
              </Button>
            )}
          </div>
          
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
                        const isSaving = savingRecommendations.has(saveKey);
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
                              <div className="absolute top-3 right-3">
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
                                <h3 className="text-xl font-bold text-slate-900 leading-tight mb-1">
                                  {business.name}
                                </h3>
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
                                      <badge.icon className="h-3 w-3" />
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