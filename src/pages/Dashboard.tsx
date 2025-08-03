import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Star, ArrowRight, Heart, Compass, Users, Zap, TrendingUp } from "lucide-react";
import { Header } from "@/components/Header";
import { useToast } from "@/hooks/use-toast";

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
  const { user, loading: authLoading } = useAuth();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [userCity, setUserCity] = useState<string>("");
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [favorites, setFavorites] = useState<any[]>([]);
  const [hasCompletedQuiz, setHasCompletedQuiz] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchUserProfile();
      loadFavorites();
    }
  }, [user]);

  const loadFavorites = () => {
    const savedFavorites = JSON.parse(localStorage.getItem('favorites') || '[]');
    setFavorites(savedFavorites);
  };

  const fetchUserProfile = async () => {
    if (!user) {
      setLoadingProfile(false);
      return;
    }

    try {
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching profile:', error);
      } else {
        if (profileData) {
          // Extract city from address or use a default
          const city = profileData.address ? profileData.address.split(',')[0] : "";
          setUserCity(city);
          // Check if user has completed quiz by looking for quiz data
          setHasCompletedQuiz(!!(profileData.priorities && profileData.priorities.length > 0));
        }
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoadingProfile(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Please sign in to view your dashboard</h1>
            <Button onClick={() => navigate("/auth")}>Sign In</Button>
          </div>
        </main>
      </div>
    );
  }

  const recentFavorites = favorites.slice(0, 6);
  const getUserName = () => {
    if (user?.user_metadata?.full_name) return user.user_metadata.full_name;
    if (user?.email) return user.email.split('@')[0];
    return 'User';
  };

  return (
    <div className="min-h-screen">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            Welcome back, {getUserName()}! 👋
          </h1>
          <p className="text-muted-foreground">
            {hasCompletedQuiz 
              ? "Here's what's happening in your area" 
              : "Discover what's around you and save your favorites"
            }
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Favorites Section */}
          {favorites.length > 0 && (
            <Card className="col-span-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="h-5 w-5 text-red-500" />
                  Your Favorites ({favorites.length})
                </CardTitle>
                <CardDescription>
                  Places you've saved for later
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {recentFavorites.map((favorite, index) => (
                    <div key={index} className="p-3 border rounded-lg space-y-2">
                      <h4 className="font-medium text-sm">{favorite.business_name}</h4>
                      <p className="text-xs text-muted-foreground">{favorite.business_address}</p>
                      <Badge variant="secondary" className="text-xs">
                        {favorite.category}
                      </Badge>
                    </div>
                  ))}
                </div>
                {favorites.length > 6 && (
                  <Button 
                    variant="outline" 
                    className="w-full mt-4"
                    onClick={() => navigate("/favorites")}
                  >
                    View All Favorites
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {/* Quiz Completion Status */}
          {!hasCompletedQuiz && (
            <Card className="col-span-full lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-primary" />
                  Get Personalized Recommendations
                </CardTitle>
                <CardDescription>
                  Take our quick quiz to unlock tailored suggestions for your lifestyle
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <Users className="h-8 w-8 mx-auto text-primary mb-2" />
                      <p className="text-xs text-muted-foreground">Lifestyle matching</p>
                    </div>
                    <div className="text-center">
                      <MapPin className="h-8 w-8 mx-auto text-primary mb-2" />
                      <p className="text-xs text-muted-foreground">Location-based</p>
                    </div>
                    <div className="text-center">
                      <Star className="h-8 w-8 mx-auto text-primary mb-2" />
                      <p className="text-xs text-muted-foreground">Quality curated</p>
                    </div>
                  </div>
                  <Button 
                    className="w-full" 
                    onClick={() => navigate("/onboarding")}
                  >
                    Take the Quiz (2 minutes)
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick Actions */}
          <Card className={hasCompletedQuiz ? "col-span-full lg:col-span-2" : ""}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Compass className="h-5 w-5" />
                Quick Actions
              </CardTitle>
              <CardDescription>
                Explore and discover new places
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {userCity && (
                  <div className="flex items-center gap-2 text-sm mb-4">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>Currently in {userCity}</span>
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Button 
                    variant="outline" 
                    className="h-auto p-4 flex flex-col items-start gap-2"
                    onClick={() => navigate("/explore")}
                  >
                    <Compass className="h-5 w-5" />
                    <div className="text-left">
                      <div className="font-medium">Explore</div>
                      <div className="text-xs text-muted-foreground">Browse local businesses</div>
                    </div>
                  </Button>
                  <Button 
                    variant="outline" 
                    className="h-auto p-4 flex flex-col items-start gap-2"
                    onClick={() => navigate("/popular")}
                  >
                    <TrendingUp className="h-5 w-5" />
                    <div className="text-left">
                      <div className="font-medium">Popular</div>
                      <div className="text-xs text-muted-foreground">See what's trending</div>
                    </div>
                  </Button>
                </div>
                {hasCompletedQuiz && (
                  <Button 
                    className="w-full" 
                    onClick={() => navigate("/recommendations")}
                  >
                    Get Personalized Recommendations
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Browse Suggestions for Empty State */}
          {favorites.length === 0 && (
            <Card className="col-span-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-primary" />
                  Start Exploring
                </CardTitle>
                <CardDescription>
                  Discover businesses and save your favorites
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <Compass className="h-8 w-8 mx-auto text-primary mb-2" />
                      <h4 className="font-medium mb-1">Browse Essentials</h4>
                      <p className="text-xs text-muted-foreground">Find nearby grocery stores, pharmacies, and more</p>
                    </div>
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <TrendingUp className="h-8 w-8 mx-auto text-primary mb-2" />
                      <h4 className="font-medium mb-1">Check What's Popular</h4>
                      <p className="text-xs text-muted-foreground">See trending places locals love</p>
                    </div>
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <Heart className="h-8 w-8 mx-auto text-primary mb-2" />
                      <h4 className="font-medium mb-1">Save Favorites</h4>
                      <p className="text-xs text-muted-foreground">Build your personal collection</p>
                    </div>
                  </div>
                  <div className="flex gap-3 justify-center">
                    <Button onClick={() => navigate("/explore")}>
                      Start Exploring
                    </Button>
                    <Button variant="outline" onClick={() => navigate("/popular")}>
                      See Popular Places
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}