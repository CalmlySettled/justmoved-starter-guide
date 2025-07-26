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
  Trash2
} from "lucide-react";
import { Label } from "@/components/ui/label";

interface SavedRecommendation {
  id: string;
  category: string;
  business_name: string;
  business_address?: string;
  business_description?: string;
  business_phone?: string;
  business_features: string[];
  distance_miles?: number;
  created_at: string;
}

interface UserProfile {
  address?: string;
  household_type?: string;
  priorities: string[];
  transportation_style?: string;
  budget_preference?: string;
  life_stage?: string;
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
      setLoading(true);
      
      // Fetch user profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
      } else {
        setUserProfile(profile);
      }

      // Fetch saved recommendations
      const { data: savedRecs, error: recsError } = await supabase
        .from('user_recommendations')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (recsError) {
        console.error('Error fetching recommendations:', recsError);
        toast({
          title: "Error loading recommendations",
          description: "We couldn't load your saved recommendations.",
          variant: "destructive"
        });
      } else {
        setRecommendations(savedRecs || []);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
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
  const getBusinessImage = (businessName: string, category: string) => {
    const name = businessName.toLowerCase();
    
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
    groups[category].push(rec);
    return groups;
  }, {} as { [key: string]: SavedRecommendation[] });

  const handlePriorityFilter = (priority: string) => {
    if (activeFilter === priority) {
      setActiveFilter(null); // Clear filter if clicking same priority
    } else {
      setActiveFilter(priority);
    }
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
            <Button 
              onClick={() => navigate("/onboarding")}
              variant="outline"
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Update Preferences
            </Button>
            <Button 
              onClick={() => navigate("/recommendations")}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Get New Recommendations
            </Button>
          </div>
        </div>

        {/* User Profile & Quick Stats */}
        {userProfile && (
          <div className="mb-12">
            {/* Quiz Results/Preferences */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Your Preferences
                </CardTitle>
                <CardDescription>Based on your quiz responses</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {userProfile.life_stage && (
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Life Stage</Label>
                      <p className="text-foreground">{userProfile.life_stage}</p>
                    </div>
                  )}
                  {userProfile.household_type && (
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Household</Label>
                      <p className="text-foreground">{userProfile.household_type}</p>
                    </div>
                  )}
                  {userProfile.transportation_style && (
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Transportation</Label>
                      <p className="text-foreground">{userProfile.transportation_style}</p>
                    </div>
                  )}
                  {userProfile.budget_preference && (
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Budget Style</Label>
                      <p className="text-foreground">{userProfile.budget_preference}</p>
                    </div>
                  )}
                  {userProfile.address && (
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Address</Label>
                      <p className="text-foreground">{userProfile.address}</p>
                    </div>
                  )}
                </div>
                
                {userProfile.priorities && userProfile.priorities.length > 0 && (
                  <div>
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
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="text-center">
                <CardContent className="pt-6">
                  <div className="text-3xl font-bold text-primary mb-2">
                    {recommendations.length}
                  </div>
                  <p className="text-muted-foreground">Saved Places</p>
                </CardContent>
              </Card>
              
              <Card className="text-center">
                <CardContent className="pt-6">
                  <div className="text-3xl font-bold text-primary mb-2">
                    {Object.keys(groupedRecommendations).length}
                  </div>
                  <p className="text-muted-foreground">Categories</p>
                </CardContent>
              </Card>
              
              <Card className="text-center">
                <CardContent className="pt-6">
                  <div className="text-3xl font-bold text-primary mb-2">
                    {userProfile?.priorities?.length || 0}
                  </div>
                  <p className="text-muted-foreground">Priorities Set</p>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Saved Recommendations */}
        {recommendations.length > 0 ? (
          <div className="space-y-16">
            {Object.entries(groupedRecommendations).map(([category, categoryRecs], categoryIndex) => (
              <div key={category} className="space-y-8">
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
                      {categoryRecs.length} saved recommendation{categoryRecs.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                
                <div className="grid gap-6 md:grid-cols-2">
                  {categoryRecs.map((rec) => {
                    const badges = getBusinessBadges(rec.business_features || []);
                    return (
                      <Card key={rec.id} className="group hover:shadow-elegant transition-all duration-300 border-0 shadow-soft bg-card rounded-2xl overflow-hidden">
                        {/* Business Image */}
                        <div className="aspect-video overflow-hidden">
                          <img 
                            src={getBusinessImage(rec.business_name, rec.category)}
                            alt={rec.business_name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                        
                        <CardHeader className="pb-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <CardTitle className="text-xl font-semibold text-foreground group-hover:text-primary transition-colors">
                                {rec.business_name}
                              </CardTitle>
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
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteRecommendation(rec.id)}
                              disabled={deleting === rec.id}
                              className="ml-3 text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardHeader>
                        
                        <CardContent className="space-y-4">
                          {rec.business_address && (
                            <div className="flex items-start gap-2 text-sm text-muted-foreground">
                              <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                              <span>{rec.business_address}</span>
                            </div>
                          )}
                          
                          {rec.business_description && (
                            <p className="text-sm text-muted-foreground leading-relaxed">
                              {rec.business_description}
                            </p>
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
                <Button 
                  size="lg" 
                  onClick={() => navigate("/recommendations")}
                  className="px-8 mr-4"
                >
                  Get New Recommendations
                </Button>
                <Button 
                  size="lg" 
                  variant="outline"
                  onClick={() => navigate("/onboarding")}
                  className="px-8"
                >
                  Update Preferences
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}