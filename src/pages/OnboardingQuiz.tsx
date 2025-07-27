import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Home, ArrowLeft, ArrowRight, CheckCircle } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { AddressAutocomplete } from "@/components/AddressAutocomplete";

interface QuizData {
  address: string;
  household: string[];
  priorities: string[];
  transportation: string;
  lifestyle: string;
  lifeStage: string;
  tasks: string[];
}

const initialData: QuizData = {
  address: "",
  household: [],
  priorities: [],
  transportation: "",
  lifestyle: "",
  lifeStage: "",
  tasks: []
};

export default function OnboardingQuiz() {
  const [currentQuestion, setCurrentQuestion] = useState(1);
  const [quizData, setQuizData] = useState<QuizData>(initialData);
  const [isComplete, setIsComplete] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  // Check if user just signed up by seeing if they have no existing profile data
  useEffect(() => {
    const checkUserStatus = async () => {
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('address, priorities')
          .eq('user_id', user.id)
          .maybeSingle();
        
        // If user has no address or priorities, they're likely new
        setIsNewUser(!profile?.address && (!profile?.priorities || profile.priorities.length === 0));
      }
    };
    
    checkUserStatus();
  }, [user]);

  const totalQuestions = 6;

  // Get background image for current question
  const getBackgroundImage = (questionNum: number) => {
    switch (questionNum) {
      case 1: // Address - neighborhood/cityscape
        return "/lovable-uploads/da2a2bcf-7c5a-4b95-bc28-3b8bd337cc1c.png";
      case 2: // Household - cozy home
        return "https://images.unsplash.com/photo-1502005229762-cf1b2da7c5d6?w=1200&h=800&fit=crop";
      case 3: // Priorities - vibrant community
        return "https://images.unsplash.com/photo-1523712999610-f77fbcfc3843?w=1200&h=800&fit=crop";
      case 4: // Transportation - urban movement
        return "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=1200&h=800&fit=crop";
      case 5: // Lifestyle - relaxed scene
        return "https://images.unsplash.com/photo-1500375592092-40eb2168fd21?w=1200&h=800&fit=crop";
      case 6: // Life stage - starry aspirational
        return "https://images.unsplash.com/photo-1470813740244-df37b8c1edcb?w=1200&h=800&fit=crop";
      default:
        return "https://images.unsplash.com/photo-1523712999610-f77fbcfc3843?w=1200&h=800&fit=crop";
    }
  };

  const handleNext = () => {
    if (isTransitioning) return;
    
    setIsTransitioning(true);
    setTimeout(() => {
      if (currentQuestion < totalQuestions) {
        setCurrentQuestion(currentQuestion + 1);
      } else {
        setIsComplete(true);
      }
      setIsTransitioning(false);
    }, 150);
  };

  const handlePrevious = () => {
    if (isTransitioning) return;
    
    setIsTransitioning(true);
    setTimeout(() => {
      if (currentQuestion > 1) {
        setCurrentQuestion(currentQuestion - 1);
      }
      setIsTransitioning(false);
    }, 150);
  };

  const handleAddressChange = (value: string) => {
    setQuizData({ ...quizData, address: value });
  };

  const handleHouseholdChange = (value: string, checked: boolean) => {
    if (checked) {
      setQuizData({ ...quizData, household: [...quizData.household, value] });
    } else {
      setQuizData({ ...quizData, household: quizData.household.filter(item => item !== value) });
    }
  };

  const handlePrioritiesChange = (value: string, checked: boolean) => {
    if (checked && quizData.priorities.length < 5) {
      setQuizData({ ...quizData, priorities: [...quizData.priorities, value] });
    } else if (!checked) {
      setQuizData({ ...quizData, priorities: quizData.priorities.filter(item => item !== value) });
    }
  };

  const handleTasksChange = (value: string, checked: boolean) => {
    if (checked && quizData.tasks.length < 3) {
      setQuizData({ ...quizData, tasks: [...quizData.tasks, value] });
    } else if (!checked) {
      setQuizData({ ...quizData, tasks: quizData.tasks.filter(item => item !== value) });
    }
  };

  const canProceed = () => {
    switch (currentQuestion) {
      case 1: return quizData.address.trim() !== "";
      case 2: return quizData.household.length > 0;
      case 3: return quizData.priorities.length > 0;
      case 4: return quizData.transportation !== "";
      case 5: return quizData.lifestyle !== "";
      case 6: return quizData.lifeStage !== "";
      default: return false;
    }
  };

  const handleComplete = async () => {
    setLoading(true);
    
    try {
      // Save quiz data to user's profile if logged in
      if (user) {
        const { error } = await supabase
          .from('profiles')
          .upsert({
            user_id: user.id,
            address: quizData.address,
            household_type: quizData.household.join(', '),
            priorities: quizData.priorities,
            transportation_style: quizData.transportation,
            budget_preference: quizData.lifestyle,
            life_stage: quizData.lifeStage,
            settling_tasks: quizData.tasks
          }, {
            onConflict: 'user_id'
          });

        if (error) {
          console.error('Error saving profile:', error);
          toast({
            title: "Warning",
            description: "We couldn't save your preferences, but you can still see your recommendations.",
            variant: "destructive"
          });
        }

        // Generate and save recommendations automatically
        try {
          const { data: recommendations, error: recError } = await supabase.functions.invoke('generate-recommendations', {
            body: {
              quizResponse: {
                address: quizData.address,
                householdType: quizData.household.join(', '),
                priorities: quizData.priorities,
                transportationStyle: quizData.transportation,
                budgetPreference: quizData.lifestyle,
                lifeStage: quizData.lifeStage,
                settlingTasks: quizData.tasks
              }
            }
          });

          if (recError) {
            console.error('Error generating recommendations:', recError);
          } else if (recommendations?.recommendations) {
            // First, delete existing recommendations for this user
            const { error: deleteError } = await supabase
              .from('user_recommendations')
              .delete()
              .eq('user_id', user.id);

            if (deleteError) {
              console.error('Error deleting previous recommendations:', deleteError);
            }

            // Save new recommendations to user_recommendations table
            const recommendationsToSave: any[] = [];
            
            Object.entries(recommendations.recommendations).forEach(([category, businesses]: [string, any[]]) => {
              businesses.forEach((business: any) => {
                recommendationsToSave.push({
                  user_id: user.id,
                  category: category,
                  business_name: business.name,
                  business_address: business.address,
                  business_description: business.description,
                  business_phone: business.phone,
                  business_website: business.website || null,
                  business_image: business.image_url && business.image_url.trim() !== '' ? business.image_url : null,
                  business_features: business.features || [],
                  distance_miles: business.distance_miles,
                  business_latitude: business.latitude,
                  business_longitude: business.longitude
                });
              });
            });

            const { error: saveError } = await supabase
              .from('user_recommendations')
              .insert(recommendationsToSave);

            if (saveError) {
              console.error('Error saving recommendations:', saveError);
            } else {
              toast({
                title: "Success!",
                description: "Your preferences and recommendations have been saved to your dashboard.",
              });
            }
          }
        } catch (recError) {
          console.error('Error with recommendations:', recError);
        }
      }

      // If user just completed onboarding, go to recommendations
      // If they're updating their profile, go to dashboard
      if (isNewUser) {
        navigate("/recommendations", { state: quizData });
      } else {
        navigate("/dashboard");
      }
      
    } catch (error) {
      console.error('Error completing quiz:', error);
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (isComplete) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-2xl mx-auto">
          <CardContent className="text-center py-12">
            <CheckCircle className="h-16 w-16 text-primary mx-auto mb-6" />
            <h1 className="text-3xl font-bold text-foreground mb-4">
              Welcome to Your New City!
            </h1>
            <p className="text-muted-foreground mb-8">
              Thanks for completing the quiz! We're building your personalized local guide based on your preferences.
            </p>
            <Button 
              onClick={handleComplete} 
              variant="hero" 
              size="lg"
              disabled={loading}
            >
              {loading ? "Generating Recommendations..." : "View Your Personalized Guide"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div 
      className={`min-h-screen relative transition-all duration-500 ${
        currentQuestion === 2 ? 'bg-background' : ''
      }`}
      style={currentQuestion === 2 ? {} : {
        backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.4)), url(${getBackgroundImage(currentQuestion)})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      {/* Animated overlay for smoother transitions */}
      {currentQuestion !== 2 && <div className="absolute inset-0 bg-gradient-to-br from-background/20 to-background/10 backdrop-blur-[1px]" />}
      
      {/* Header */}
      <header className="relative z-10 border-b border-white/20 backdrop-blur-md bg-white/10 shadow-lg">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-hero flex items-center justify-center shadow-lg">
              <Home className="h-6 w-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-white">CalmlySettled</span>
          </Link>
          
          <div className="text-sm text-white/80 bg-white/20 px-3 py-1 rounded-full backdrop-blur-sm">
            Question {currentQuestion} of {totalQuestions}
          </div>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="relative z-10 max-w-4xl mx-auto px-6 py-4">
        <div className="w-full bg-white/20 rounded-full h-3 backdrop-blur-sm">
          <div 
            className="bg-gradient-hero h-3 rounded-full transition-all duration-500 shadow-glow animate-pulse"
            style={{ width: `${(currentQuestion / totalQuestions) * 100}%` }}
          />
        </div>
      </div>

      {/* Main Content */}
      <main className="relative z-10 max-w-3xl mx-auto px-6 py-8">
        <Card className={`backdrop-blur-md bg-white/95 shadow-2xl border-0 transition-all duration-300 ${
          isTransitioning ? 'animate-fade-out scale-95' : 'animate-fade-in scale-100'
        }`}>
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center">
              {currentQuestion === 1 && "What's your new address or neighborhood?"}
              {currentQuestion === 2 && "Who did you move with?"}
              {currentQuestion === 3 && "What are the most important things you're looking for right now?"}
              {currentQuestion === 4 && "How do you typically get around?"}
              {currentQuestion === 5 && "Which best describes your vibe?"}
              {currentQuestion === 6 && "Which stage of life best fits you right now?"}
            </CardTitle>
            {currentQuestion === 2 && (
              <p className="text-muted-foreground text-center">Choose all that apply</p>
            )}
            {currentQuestion === 3 && (
              <p className="text-muted-foreground">Choose up to 5 options</p>
            )}
          </CardHeader>
          <CardContent className="space-y-6">
            
            {/* Question 1: Address */}
            {currentQuestion === 1 && (
              <AddressAutocomplete
                value={quizData.address}
                onChange={handleAddressChange}
                placeholder="e.g., 123 Main St, Bloomfield, CT 06002"
                label="Full Address or Neighborhood"
              />
            )}

            {/* Question 2: Household Type */}
            {currentQuestion === 2 && (
              <div className="space-y-8">
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-6 min-h-[400px]">
                  {[
                    { option: "Just me", image: "/lovable-uploads/1ef25225-bb29-4bb5-8412-d243c3f03382.png" },
                    { option: "Partner/spouse", image: "/lovable-uploads/4d41876b-9d9e-4a4d-abb8-5b4b924e2e23.png" },
                    { option: "Kids", image: "/lovable-uploads/ed0b00a3-fd88-4104-b572-2dcd3ea54425.png" },
                    { option: "Pets", image: "/lovable-uploads/86e7b131-4de7-4288-9579-ec892f903f5b.png" },
                    { option: "Other (multi-gen family, roommates, etc.)", image: "/lovable-uploads/89feab14-0e28-4cd7-a754-faee6f9fcdc1.png" }
                  ].map(({ option, image }) => (
                    <div 
                      key={option} 
                      className={`relative rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:scale-105 min-h-[180px] ${
                        quizData.household.includes(option) 
                          ? 'ring-4 ring-primary shadow-glow' 
                          : 'hover:ring-2 hover:ring-primary/50'
                      }`}
                      onClick={() => handleHouseholdChange(option, !quizData.household.includes(option))}
                    >
                      <div 
                        className="absolute inset-0 bg-cover bg-center"
                        style={{ backgroundImage: `url(${image})` }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/10" />
                      <div className="absolute bottom-0 left-0 right-0 p-4">
                        <p className="text-white font-bold text-base leading-tight">
                          {option}
                        </p>
                      </div>
                      {quizData.household.includes(option) && (
                        <div className="absolute top-3 right-3 w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                          <CheckCircle className="h-5 w-5 text-white" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Question 3: Daily Life Priorities */}
            {currentQuestion === 3 && (
              <div className="space-y-4">
                <div className="text-sm text-muted-foreground mb-4">
                  Selected: {quizData.priorities.length}/5
                </div>
                {[
                  "Grocery stores",
                  "Medical care / Pharmacy", 
                  "Fitness options",
                  "DMV / Government services",
                  "Parks",
                  "Faith communities",
                  "Public transit / commute info",
                  "Green space / trails",
                  "Restaurants / coffee shops",
                  "Social events or community groups"
                ].map((option) => (
                  <div key={option} className="flex items-center space-x-2">
                    <Checkbox
                      id={option}
                      checked={quizData.priorities.includes(option)}
                      onCheckedChange={(checked) => handlePrioritiesChange(option, checked as boolean)}
                      disabled={!quizData.priorities.includes(option) && quizData.priorities.length >= 5}
                    />
                    <Label htmlFor={option} className="text-base">{option}</Label>
                  </div>
                ))}
              </div>
            )}

            {/* Question 4: Transportation Style */}
            {currentQuestion === 4 && (
              <RadioGroup value={quizData.transportation} onValueChange={(value) => setQuizData({...quizData, transportation: value})}>
                {["Car", "Public transit", "Bike / walk", "Rideshare only"].map((option) => (
                  <div key={option} className="flex items-center space-x-2">
                    <RadioGroupItem value={option} id={option} />
                    <Label htmlFor={option} className="text-base">{option}</Label>
                  </div>
                ))}
              </RadioGroup>
            )}

            {/* Question 5: Budget/Lifestyle Preference */}
            {currentQuestion === 5 && (
              <RadioGroup value={quizData.lifestyle} onValueChange={(value) => setQuizData({...quizData, lifestyle: value})}>
                {[
                  "I want affordable & practical options",
                  "I'm looking for unique, local gems", 
                  "A mix of both"
                ].map((option) => (
                  <div key={option} className="flex items-center space-x-2">
                    <RadioGroupItem value={option} id={option} />
                    <Label htmlFor={option} className="text-base">{option}</Label>
                  </div>
                ))}
              </RadioGroup>
            )}

            {/* Question 6: Stage of Life */}
            {currentQuestion === 6 && (
              <RadioGroup value={quizData.lifeStage} onValueChange={(value) => setQuizData({...quizData, lifeStage: value})}>
                {[
                  "Young professional",
                  "Couple / newly married",
                  "Family with young kids",
                  "Family with teens", 
                  "Empty nester / retired",
                  "Student"
                ].map((option) => (
                  <div key={option} className="flex items-center space-x-2">
                    <RadioGroupItem value={option} id={option} />
                    <Label htmlFor={option} className="text-base">{option}</Label>
                  </div>
                ))}
              </RadioGroup>
            )}


            {/* Navigation Buttons */}
            <div className="flex justify-between pt-8">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={currentQuestion === 1}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Previous
              </Button>
              
              <Button
                onClick={handleNext}
                disabled={!canProceed()}
                variant={currentQuestion === totalQuestions ? "hero" : "default"}
              >
                {currentQuestion === totalQuestions ? "Complete Quiz" : "Next"}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}