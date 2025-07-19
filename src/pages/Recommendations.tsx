import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Home, MapPin, Phone, Star, ArrowLeft } from "lucide-react";

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
  const [recommendations, setRecommendations] = useState<Recommendations | null>(null);
  const [loading, setLoading] = useState(true);
  const [quizResponse, setQuizResponse] = useState<QuizResponse | null>(null);

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

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <Header />
      <div className="pt-24 px-6 max-w-6xl mx-auto pb-12">
        <div className="flex items-center mb-8">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate("/onboarding")}
            className="mr-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retake Quiz
          </Button>
          <div>
            <h1 className="text-3xl font-bold mb-2">Your Personalized Neighborhood Guide</h1>
            {quizResponse && (
              <p className="text-muted-foreground">
                Recommendations for {quizResponse.zipCode} • {quizResponse.budgetPreference} • {quizResponse.transportationStyle}
              </p>
            )}
          </div>
        </div>

        {quizResponse && (
          <div className="mb-8 p-4 bg-card rounded-lg border">
            <h2 className="font-semibold mb-2">Your Priorities:</h2>
            <div className="flex flex-wrap gap-2">
              {quizResponse.priorities.map((priority, index) => (
                <Badge key={index} variant="secondary" className="text-sm">
                  {getCategoryIcon(priority)} {priority}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {recommendations ? (
          <div className="grid gap-8">
            {Object.entries(recommendations).map(([category, businesses]) => (
              category !== '_rawResponse' && (
                <div key={category} className="space-y-4">
                  <h2 className="text-2xl font-semibold flex items-center gap-2">
                    <span className="text-2xl">{getCategoryIcon(category)}</span>
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </h2>
                  
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {businesses.map((business, index) => (
                      <Card key={index} className="shadow-soft hover:shadow-elegant transition-shadow">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-lg flex items-start justify-between">
                            <span className="flex-1">{business.name}</span>
                            <Star className="h-4 w-4 text-yellow-500 flex-shrink-0 ml-2" />
                          </CardTitle>
                          {business.address && (
                            <CardDescription className="flex items-start gap-1">
                              <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                              <span className="text-sm">{business.address}</span>
                            </CardDescription>
                          )}
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <p className="text-sm text-muted-foreground">{business.description}</p>
                          
                          {business.phone && business.phone !== "Contact information available" && (
                            <div className="flex items-center gap-1 text-sm">
                              <Phone className="h-3 w-3" />
                              <span>{business.phone}</span>
                            </div>
                          )}
                          
                          {business.features && business.features.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {business.features.slice(0, 3).map((feature, featureIndex) => (
                                <Badge key={featureIndex} variant="outline" className="text-xs">
                                  {feature}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Home className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">No recommendations generated</h2>
            <p className="text-muted-foreground mb-4">
              We couldn't generate recommendations at this time. Please try again.
            </p>
            <Button onClick={() => quizResponse && generateRecommendations(quizResponse)}>
              Try Again
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}