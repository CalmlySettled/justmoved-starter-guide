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
import { Home, MapPin, Phone, Star, ArrowLeft, Heart, Clock, Award, Users, Bookmark } from "lucide-react";

interface Business {
  name: string;
  address: string;
  description: string;
  phone: string;
  features: string[];
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
      if (business.features.some(f => f.toLowerCase().includes('organic'))) return "Best for organic produce";
      if (business.features.some(f => f.toLowerCase().includes('affordable'))) return "Most affordable";
      return "Your neighborhood staple";
    }
    if (category.toLowerCase().includes('fitness')) {
      return "Stay active in your area";
    }
    if (category.toLowerCase().includes('restaurant')) {
      return "Local favorite";
    }
    return "Highly recommended";
  };

  const getBusinessBadges = (business: Business) => {
    const badges = [];
    if (business.features.some(f => f.toLowerCase().includes('24') || f.toLowerCase().includes('hour'))) {
      badges.push({ label: "24 Hours", icon: Clock, color: "bg-blue-100 text-blue-800" });
    }
    if (business.features.some(f => f.toLowerCase().includes('local') || f.toLowerCase().includes('family'))) {
      badges.push({ label: "Local", icon: Heart, color: "bg-green-100 text-green-800" });
    }
    if (business.features.some(f => f.toLowerCase().includes('rating') || f.toLowerCase().includes('review'))) {
      badges.push({ label: "High Ratings", icon: Award, color: "bg-yellow-100 text-yellow-800" });
    }
    return badges.slice(0, 2); // Max 2 badges per business
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
      const { error } = await supabase
        .from('user_recommendations')
        .insert({
          user_id: user.id,
          category: category,
          business_name: business.name,
          business_address: business.address,
          business_description: business.description,
          business_phone: business.phone,
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
          
          <h1 className="text-4xl font-bold text-foreground mb-4">
            Your New City, Simplified
          </h1>
          
          {quizResponse && (
            <div className="max-w-2xl mx-auto">
              <p className="text-lg text-muted-foreground leading-relaxed">
                {getUserSummary()}
              </p>
            </div>
          )}
        </div>

        {/* Top Picks Section */}
        {topPicks.length > 0 && (
          <div className="mb-16">
            <div className="flex items-center gap-3 mb-8">
              <Star className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-bold text-foreground">Your Top Picks</h2>
            </div>
            
            <div className="grid gap-6 md:grid-cols-3">
              {topPicks.map((business, index) => {
                const badges = getBusinessBadges(business);
                return (
                  <Card key={index} className="group hover:shadow-elegant transition-all duration-300 border-0 shadow-soft bg-card rounded-2xl overflow-hidden">
                    <CardHeader className="pb-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-xl font-semibold text-foreground group-hover:text-primary transition-colors">
                            {business.name}
                          </CardTitle>
                          <p className="text-sm text-primary font-medium mt-1">
                            {getBusinessTagline(business, business.category)}
                          </p>
                        </div>
                        <div className="ml-3 p-2 bg-primary/10 rounded-full">
                          <span className="text-lg">{getCategoryIcon(business.category)}</span>
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="space-y-4">
                      {business.address && (
                        <div className="flex items-start gap-2 text-sm text-muted-foreground">
                          <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                          <span>{business.address}</span>
                        </div>
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
        )}

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
                        {category.charAt(0).toUpperCase() + category.slice(1)} Near You
                      </h2>
                      <p className="text-muted-foreground mt-1">
                        {businesses.length} recommendations in your area
                      </p>
                    </div>
                  </div>
                  
                  <div className="grid gap-6 md:grid-cols-2">
                    {businesses.map((business, index) => {
                      const badges = getBusinessBadges(business);
                      const saveKey = `${category}-${business.name}`;
                      const isSaving = savingRecommendations.has(saveKey);
                      return (
                        <Card key={index} className="group hover:shadow-elegant transition-all duration-300 border-0 shadow-soft bg-card rounded-2xl overflow-hidden">
                          <CardHeader className="pb-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <CardTitle className="text-xl font-semibold text-foreground group-hover:text-primary transition-colors">
                                  {business.name}
                                </CardTitle>
                                <p className="text-sm text-primary font-medium mt-1">
                                  {getBusinessTagline(business, category)}
                                </p>
                              </div>
                              <div className="flex items-center gap-2 ml-3">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => saveRecommendation(business, category)}
                                  disabled={isSaving}
                                  className="text-muted-foreground hover:text-primary"
                                >
                                  <Bookmark className="h-4 w-4" />
                                </Button>
                                <Star className="h-5 w-5 text-yellow-500 flex-shrink-0" />
                              </div>
                            </div>
                          </CardHeader>
                          
                          <CardContent className="space-y-4">
                            {business.address && (
                              <div className="flex items-start gap-2 text-sm text-muted-foreground">
                                <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                <span>{business.address}</span>
                              </div>
                            )}
                            
                            <p className="text-sm text-muted-foreground leading-relaxed">
                              {business.description}
                            </p>
                            
                            <div className="flex items-center justify-between">
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
                              
                              {business.phone && business.phone !== "Contact information available" && (
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Phone className="h-3 w-3" />
                                  <span>{business.phone}</span>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
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