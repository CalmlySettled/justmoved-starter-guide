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
import { Home, MapPin, Phone, Star, ArrowLeft, Heart, Clock, Award, Users, Bookmark, ExternalLink, Navigation } from "lucide-react";

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
    // Use uploaded Geissler's image for Geissler's specifically
    if (business.name.toLowerCase().includes('geissler')) {
      return '/lovable-uploads/e9c9bd3b-56c9-4c4d-9908-acb6c4950b77.png';
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
                  
                  <div className="grid gap-8 md:grid-cols-1 lg:grid-cols-2">
                    {businesses.map((business, index) => {
                      const badges = getBusinessBadges(business);
                      const saveKey = `${category}-${business.name}`;
                      const isSaving = savingRecommendations.has(saveKey);
                      const businessImage = getBusinessImage(business, category);
                      const rating = business.rating || (4.2 + Math.random() * 0.6); // Generate rating between 4.2-4.8
                      const reviewCount = Math.floor(Math.random() * 300) + 50; // Random review count
                      const hours = business.hours || "Daily 7am–9pm";
                      
                      return (
                        <Card key={index} className="group hover:shadow-xl transition-all duration-300 border-0 shadow-lg bg-card rounded-3xl overflow-hidden max-w-lg mx-auto">
                          {/* Business Image */}
                          <div className="relative h-48 bg-muted overflow-hidden">
                            <img 
                              src={businessImage} 
                              alt={business.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              onError={(e) => {
                                e.currentTarget.src = 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=300&fit=crop';
                              }}
                            />
                            <div className="absolute top-4 right-4">
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => saveRecommendation(business, category)}
                                disabled={isSaving}
                                className="bg-white/90 hover:bg-white text-foreground shadow-lg"
                              >
                                <Bookmark className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>

                          <CardContent className="p-6 space-y-4">
                            {/* Business Name & Tagline */}
                            <div>
                              <h3 className="text-xl font-bold text-foreground mb-1 group-hover:text-primary transition-colors">
                                {business.name}
                              </h3>
                              <p className="text-sm text-muted-foreground">
                                {getBusinessTagline(business, category)}
                              </p>
                            </div>

                            {/* Address with Maps Link */}
                            <div className="flex items-start gap-2">
                              <MapPin className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                              <a 
                                href={getGoogleMapsUrl(business.address, business.name)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-foreground hover:text-primary transition-colors hover:underline"
                              >
                                {business.address}
                              </a>
                            </div>

                            {/* Quick Facts */}
                            <div className="space-y-3 py-3 border-t border-border/30">
                              {/* Hours */}
                              <div className="flex items-center gap-2 text-sm">
                                <Clock className="h-4 w-4 text-muted-foreground" />
                                <span className="text-muted-foreground">{hours}</span>
                              </div>
                              
                              {/* Rating */}
                              <div className="flex items-center gap-2 text-sm">
                                <div className="flex items-center gap-1">
                                  <Star className="h-4 w-4 text-yellow-500 fill-current" />
                                  <span className="font-medium">{rating.toFixed(1)}</span>
                                  <span className="text-muted-foreground">({reviewCount} reviews)</span>
                                </div>
                              </div>
                            </div>

                            {/* Tags/Badges */}
                            {badges.length > 0 && (
                              <div className="flex flex-wrap gap-2">
                                {badges.map((badge, badgeIndex) => (
                                  <div key={badgeIndex} className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${badge.color}`}>
                                    <badge.icon className="h-3 w-3" />
                                    {badge.label}
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Contact & Action Buttons */}
                            <div className="flex flex-wrap gap-2 pt-3 border-t border-border/30">
                              <Button
                                variant="outline"
                                size="sm"
                                asChild
                                className="flex-1"
                              >
                                <a 
                                  href={getGoogleMapsUrl(business.address, business.name)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center justify-center gap-2"
                                >
                                  <Navigation className="h-4 w-4" />
                                  Directions
                                </a>
                              </Button>
                              
                              {business.phone && business.phone !== "Contact information available" && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  asChild
                                  className="flex-1"
                                >
                                  <a href={`tel:${business.phone}`} className="flex items-center justify-center gap-2">
                                    <Phone className="h-4 w-4" />
                                    Call
                                  </a>
                                </Button>
                              )}
                              
                              {business.website && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  asChild
                                  className="flex-1"
                                >
                                  <a 
                                    href={business.website}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-center gap-2"
                                  >
                                    <ExternalLink className="h-4 w-4" />
                                    Website
                                  </a>
                                </Button>
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