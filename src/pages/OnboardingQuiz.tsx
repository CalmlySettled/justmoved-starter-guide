import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Home, ArrowLeft, ArrowRight, CheckCircle, Clock, Star } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { AddressAutocomplete } from "@/components/AddressAutocomplete";


// Helper function to get coordinates from address
async function getCoordinatesFromAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const encodedAddress = encodeURIComponent(address);
    const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}&limit=1`, {
      headers: {
        'User-Agent': 'CalmlySettled/1.0'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data && data.length > 0) {
        return {
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon)
        };
      }
    }
  } catch (error) {
    console.error('Error getting coordinates from address:', error);
  }
  return null;
}

interface QuizData {
  address: string;
  household: string[];
  priorities: string[];
  specificCategories: string[];
  transportation: string;
  lifestyle: string;
  lifeStage: string;
  tasks: string[];
  isQuickStart?: boolean;
}

const initialData: QuizData = {
  address: "",
  household: [],
  priorities: [],
  specificCategories: [],
  transportation: "",
  lifestyle: "",
  lifeStage: "",
  tasks: [],
  isQuickStart: false
};

export default function OnboardingQuiz() {
  const [currentQuestion, setCurrentQuestion] = useState(0); // Start with mode selection
  const [quizData, setQuizData] = useState<QuizData>(initialData);
  const [isComplete, setIsComplete] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [validAddressSelected, setValidAddressSelected] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();

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

  const totalQuestions = quizData.isQuickStart ? 3 : 6; // 3 for quick start, 6 for complete // Updated for grouped categories

  // Get background image for current question (updated for 7 questions)
  const getBackgroundImage = (questionNum: number) => {
    switch (questionNum) {
      case 1: // Address - neighborhood/cityscape
        return "/lovable-uploads/da2a2bcf-7c5a-4b95-bc28-3b8bd337cc1c.png";
      case 2: // Household - cozy home
        return "/lovable-uploads/03da8b85-f799-4bcc-9d63-c91a0b6663a3.png";
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

  const handleNext = async () => {
    if (isTransitioning) return;
    
    if (currentQuestion === totalQuestions) {
      // Call handleComplete when on last question
      await handleComplete();
      return;
    }
    
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentQuestion(currentQuestion + 1);
      setIsTransitioning(false);
    }, 50);
  };

  const handlePrevious = () => {
    if (isTransitioning) return;
    
    setIsTransitioning(true);
    setTimeout(() => {
      if (currentQuestion > 1) {
        setCurrentQuestion(currentQuestion - 1);
      }
      setIsTransitioning(false);
    }, 50);
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
    if (checked && quizData.priorities.length < 8) {
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


  const handleSpecificCategoriesChange = (value: string, checked: boolean) => {
    if (checked && quizData.specificCategories.length < 8) {
      setQuizData({ ...quizData, specificCategories: [...quizData.specificCategories, value] });
    } else if (!checked) {
      setQuizData({ ...quizData, specificCategories: quizData.specificCategories.filter(item => item !== value) });
    }
  };

  const canProceed = () => {
    switch (currentQuestion) {
      case 0: return true; // Mode selection
      case 1: return quizData.address.trim() !== "" && validAddressSelected;
      case 2: 
        if (quizData.isQuickStart) {
          return quizData.priorities.length >= 2; // Require at least 2 priorities for quick start
        }
        return quizData.household.length > 0;
      case 3: 
        if (quizData.isQuickStart) {
          return true; // Quick start is complete
        }
        return quizData.priorities.length > 0;
      case 4: return quizData.transportation !== "";
      case 5: return quizData.lifestyle !== "";
      case 6: return quizData.lifeStage !== "";
      default: return false;
    }
  };

  const handleComplete = async () => {
    setLoading(true);
    
    try {
      console.log('🟡 Quiz completion: Starting');
      console.log('🟡 User authenticated:', !!user);
      console.log('🟡 Quiz data being saved:', quizData);
      
      console.log('🟡 Getting coordinates for address:', quizData.address);
      const coordinates = await getCoordinatesFromAddress(quizData.address);
      console.log('🟡 Coordinates result:', coordinates);
      
      if (user) {
        // User is already authenticated - save directly to their profile
        console.log('🟢 Authenticated user completing quiz - saving to profile');
        console.log('🟢 User ID:', user.id);
        
         try {
           console.log('🟡 MOBILE QUIZ DEBUG - Building profile data...');
           
            // Mobile-specific: Ensure all data is properly serialized
            // Use smart defaults for quick start users
            const profileData = {
              user_id: user.id,
              address: String(quizData.address || ''),
              household_type: Array.isArray(quizData.household) ? quizData.household.join(', ') : 
                             quizData.isQuickStart ? 'Not specified' : String(quizData.household || ''),
              priorities: Array.isArray(quizData.priorities) ? quizData.priorities : [],
              priority_preferences: {},
              transportation_style: String(quizData.transportation || (quizData.isQuickStart ? 'Flexible' : '')),
              budget_preference: String(quizData.lifestyle || (quizData.isQuickStart ? 'Moderate' : '')),
              life_stage: String(quizData.lifeStage || (quizData.isQuickStart ? 'Getting settled' : '')),
              settling_tasks: Array.isArray(quizData.tasks) ? quizData.tasks : [],
              latitude: coordinates?.lat || null,
              longitude: coordinates?.lng || null,
              updated_at: new Date().toISOString(),
            };
           
           console.log('🟡 MOBILE QUIZ DEBUG - Profile data prepared:', profileData);
           console.log('🟡 MOBILE QUIZ DEBUG - Address length:', profileData.address.length);
           console.log('🟡 MOBILE QUIZ DEBUG - Priorities count:', profileData.priorities.length);
           
           // Mobile-specific: Add retry logic for flaky mobile connections
           let profileResult = null;
           let profileError = null;
           
           for (let attempt = 1; attempt <= 3; attempt++) {
             console.log(`🟡 MOBILE QUIZ DEBUG - Profile save attempt ${attempt}/3`);
             
             const { data, error } = await supabase
               .from('profiles')
               .upsert(profileData, {
                 onConflict: 'user_id'
               })
               .select();
               
             profileResult = data;
             profileError = error;
             
             if (!error) {
               console.log('🟢 MOBILE QUIZ DEBUG - Profile save successful on attempt', attempt);
               break;
             }
             
             console.error(`🔴 MOBILE QUIZ DEBUG - Profile save attempt ${attempt} failed:`, error);
             
             if (attempt < 3) {
               console.log('🟡 MOBILE QUIZ DEBUG - Waiting 1 second before retry...');
               await new Promise(resolve => setTimeout(resolve, 1000));
             }
           }

           console.log('🟢 MOBILE QUIZ DEBUG - Final profile save result:', { data: profileResult, error: profileError });

           if (profileError) {
             console.error('🔴 MOBILE QUIZ DEBUG - All profile save attempts failed:', profileError);
             
             // Mobile fallback: Save to localStorage as backup
             console.log('🟡 MOBILE QUIZ DEBUG - Saving to localStorage as fallback...');
             localStorage.setItem('pendingProfileData', JSON.stringify(profileData));
             
             throw profileError;
           }

           console.log('🟢 MOBILE QUIZ DEBUG - Profile saved successfully:', profileResult);

          // Generate recommendations immediately with smart defaults
          const quizResponse = {
            address: quizData.address,
            householdType: quizData.household.length > 0 ? quizData.household.join(', ') : 'Not specified',
            priorities: quizData.priorities,
            transportationStyle: quizData.transportation || 'Flexible',
            budgetPreference: quizData.lifestyle || 'Moderate',
            lifeStage: quizData.lifeStage || 'Getting settled',
            settlingTasks: quizData.tasks,
            latitude: coordinates?.lat || null,
            longitude: coordinates?.lng || null
          };

           console.log('🟢 Generating recommendations for authenticated user');
           console.log('🟢 Quiz response data:', quizResponse);
           
           const { data: recsData, error: generateError } = await supabase.functions.invoke('generate-recommendations', {
             body: { 
               quizResponse,
               userId: user.id
             }
           });

           console.log('🟢 Generate recommendations result:', { data: recsData, error: generateError });

           if (generateError) {
             console.error('🔴 Error generating recommendations:', generateError);
             // Don't throw - still redirect to dashboard with toast
             toast({
               title: "Profile saved!",
               description: "There was an issue generating recommendations. Please try refreshing your dashboard.",
               variant: "destructive"
             });
           } else {
             console.log('🟢 Recommendations generated successfully:', recsData);
             toast({
               title: "Profile complete!",
               description: "Your personalized recommendations are ready on your dashboard.",
             });
           }

          // Redirect to dashboard
          navigate("/dashboard");
          
        } catch (error) {
          console.error('Error saving authenticated user profile:', error);
          toast({
            title: "Error saving profile",
            description: "Please try again or contact support if the issue persists.",
            variant: "destructive"
          });
        }
        
      } else {
        // User not authenticated - save to localStorage and show completion screen
        console.log('Unauthenticated user completing quiz - saving to localStorage and showing completion screen');
        
        const quizDataForStorage = {
          address: quizData.address,
          priorities: quizData.priorities,
          household: quizData.household.join(', '),
          transportation: quizData.transportation,
          budgetRange: quizData.lifestyle,
          movingTimeline: quizData.lifeStage,
          settlingTasks: quizData.tasks,
          latitude: coordinates?.lat || null,
          longitude: coordinates?.lng || null
        };
        
        localStorage.setItem('onboardingQuizData', JSON.stringify(quizDataForStorage));
        
        // Set completion state to show the welcome screen with signup button
        setIsComplete(true);
      }
      
    } catch (error) {
      console.error('Error in handleComplete:', error);
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
              onClick={() => {
                // Save quiz data to localStorage with smart defaults
                const coordinates = null; // Will be calculated during signup
                const quizDataForStorage = {
                  address: quizData.address,
                  priorities: quizData.priorities,
                  household: quizData.household.length > 0 ? quizData.household.join(', ') : 'Not specified',
                  transportation: quizData.transportation || 'Flexible',
                  budgetRange: quizData.lifestyle || 'Moderate',
                  movingTimeline: quizData.lifeStage || 'Getting settled',
                  settlingTasks: quizData.tasks,
                  latitude: coordinates,
                  longitude: coordinates,
                  isQuickStart: quizData.isQuickStart
                };
                localStorage.setItem('onboardingQuizData', JSON.stringify(quizDataForStorage));
                
                // ALWAYS redirect to signup
                navigate("/auth");
              }}
              variant="hero" 
              size="lg"
            >
              View Your Personalized Guide
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div 
      className={`min-h-screen relative transition-all duration-200 ${
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
          
          {currentQuestion > 0 && (
            <div className="text-sm text-white/80 bg-white/20 px-3 py-1 rounded-full backdrop-blur-sm">
              {quizData.isQuickStart ? 'Quick Start ' : ''}Question {currentQuestion} of {totalQuestions}
            </div>
          )}
        </div>
      </header>

      {/* Progress Bar */}
      {currentQuestion > 0 && (
        <div className="relative z-10 max-w-4xl mx-auto px-6 py-4">
          <div className="w-full bg-white/20 rounded-full h-3 backdrop-blur-sm">
            <div 
              className="bg-gradient-hero h-3 rounded-full transition-all duration-200 shadow-glow"
              style={{ width: `${(currentQuestion / totalQuestions) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="relative z-10 max-w-3xl mx-auto px-6 py-8">
        <Card className={`backdrop-blur-md bg-white/95 shadow-2xl border-0 transition-all duration-150 ${
          isTransitioning ? 'opacity-75' : 'opacity-100'
        }`}>
          <CardHeader className="pb-6">
            <CardTitle className="text-xl sm:text-2xl font-bold text-center leading-tight">
              {currentQuestion === 0 && "How would you like to get started?"}
              {currentQuestion === 1 && "What's your new address or neighborhood?"}
              {currentQuestion === 2 && (quizData.isQuickStart ? "What are you looking for most?" : "Who did you move with?")}
              {currentQuestion === 3 && (quizData.isQuickStart ? "Perfect! Let's create your guide." : "What are the most important things you're looking for right now?")}
              {currentQuestion === 4 && "How do you typically get around?"}
              {currentQuestion === 5 && "Which best describes your vibe?"}
              {currentQuestion === 6 && "Which stage of life best fits you right now?"}
            </CardTitle>
            {currentQuestion === 0 && (
              <p className="text-muted-foreground text-center">Choose your preferred onboarding experience</p>
            )}
            {currentQuestion === 2 && !quizData.isQuickStart && (
              <p className="text-muted-foreground text-center">Choose all that apply</p>
            )}
            {currentQuestion === 2 && quizData.isQuickStart && (
              <p className="text-muted-foreground text-center">Select at least 2 priorities</p>
            )}
            {currentQuestion === 3 && !quizData.isQuickStart && (
              <p className="text-muted-foreground">Choose up to 8 options</p>
            )}
          </CardHeader>
          <CardContent className="space-y-6">
            
            {/* Question 0: Mode Selection */}
            {currentQuestion === 0 && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card 
                    className={`cursor-pointer transition-all duration-200 hover:shadow-lg p-6 ${
                      quizData.isQuickStart === true ? 'ring-2 ring-primary' : 'hover:ring-1 hover:ring-primary/50'
                    }`}
                    onClick={() => setQuizData({ ...quizData, isQuickStart: true })}
                  >
                    <div className="text-center space-y-4">
                      <div className="w-16 h-16 mx-auto bg-gradient-hero rounded-full flex items-center justify-center">
                        <Clock className="h-8 w-8 text-white" />
                      </div>
                      <h3 className="text-lg font-semibold">Quick Start</h3>
                      <p className="text-sm text-muted-foreground">
                        Get started in 30 seconds with just your address and main priorities. 
                        You can enhance your profile later.
                      </p>
                      <div className="text-xs text-primary font-medium">~30 seconds</div>
                    </div>
                  </Card>
                  
                  <Card 
                    className={`cursor-pointer transition-all duration-200 hover:shadow-lg p-6 ${
                      quizData.isQuickStart === false ? 'ring-2 ring-primary' : 'hover:ring-1 hover:ring-primary/50'
                    }`}
                    onClick={() => setQuizData({ ...quizData, isQuickStart: false })}
                  >
                    <div className="text-center space-y-4">
                      <div className="w-16 h-16 mx-auto bg-gradient-subtle rounded-full flex items-center justify-center">
                        <Star className="h-8 w-8 text-primary" />
                      </div>
                      <h3 className="text-lg font-semibold">Complete Setup</h3>
                      <p className="text-sm text-muted-foreground">
                        Take the full quiz for the most personalized recommendations 
                        based on your lifestyle and preferences.
                      </p>
                      <div className="text-xs text-primary font-medium">~2 minutes</div>
                    </div>
                  </Card>
                </div>
              </div>
            )}
            
            {/* Question 1: Address */}
            {currentQuestion === 1 && (
              <AddressAutocomplete
                value={quizData.address}
                onChange={handleAddressChange}
                onValidAddressSelected={setValidAddressSelected}
                placeholder="e.g., 123 Main St, Bloomfield, CT 06002"
                label="Full Address or Neighborhood"
              />
            )}

            {/* Question 2: Quick Start Priorities OR Household Type */}
            {currentQuestion === 2 && quizData.isQuickStart && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    "Grocery stores", "Coffee shops", "Restaurants", "Healthcare",
                    "Fitness centers", "Schools", "Shopping", "Entertainment"
                  ].map((option) => (
                    <div 
                      key={option} 
                      className={`flex items-center space-x-3 p-4 rounded-lg border cursor-pointer transition-all duration-200 ${
                        quizData.priorities.includes(option) 
                          ? 'bg-primary/10 border-primary' 
                          : 'hover:bg-muted/50 border-border'
                      }`}
                      onClick={() => handlePrioritiesChange(option, !quizData.priorities.includes(option))}
                    >
                      <Checkbox
                        checked={quizData.priorities.includes(option)}
                        className="min-h-[20px] min-w-[20px]"
                      />
                      <Label className="text-sm cursor-pointer flex-1">{option}</Label>
                    </div>
                  ))}
                </div>
                <div className="text-xs text-muted-foreground text-center">
                  Selected: {quizData.priorities.length} (minimum 2 required)
                </div>
              </div>
            )}
            
            {/* Question 2: Household Type (Complete Setup) */}
            {currentQuestion === 2 && !quizData.isQuickStart && (
              <div className="space-y-8">
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-6 min-h-[400px]">
                  {[
                    { option: "Just me", image: "/lovable-uploads/1ef25225-bb29-4bb5-8412-d243c3f03382.png" },
                    { option: "Partner/spouse", image: "/lovable-uploads/cf033ff7-435b-435f-b69a-878df85eb3d7.png" },
                    { option: "Kids", image: "/lovable-uploads/ed0b00a3-fd88-4104-b572-2dcd3ea54425.png" },
                    { option: "Pets", image: "/lovable-uploads/1e2a30f1-b0ae-4d5d-9f37-81a784f9ae05.png" },
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

            {/* Question 3: Quick Start Completion OR Specific Categories */}
            {currentQuestion === 3 && quizData.isQuickStart && (
              <div className="text-center space-y-6">
                <div className="w-20 h-20 mx-auto bg-gradient-hero rounded-full flex items-center justify-center mb-6">
                  <CheckCircle className="h-10 w-10 text-white" />
                </div>
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold">You're all set!</h3>
                  <p className="text-muted-foreground">
                    We'll create your personalized guide based on your location and priorities. 
                    You can always refine your preferences later from your dashboard.
                  </p>
                  <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                    <p className="text-sm font-medium">Your selections:</p>
                    <p className="text-sm text-muted-foreground">📍 {quizData.address}</p>
                    <p className="text-sm text-muted-foreground">✨ {quizData.priorities.join(', ')}</p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Question 3: Specific Categories (Complete Setup) */}
            {currentQuestion === 3 && !quizData.isQuickStart && (
              <div className="space-y-8">
                <div className="text-sm text-muted-foreground mb-4">
                  Selected: {quizData.priorities.length}/8
                </div>
                
                {/* Food & Dining Group */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-foreground border-b border-border pb-2">🍽️ Food & Dining</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 ml-4">
                    {[
                      "Grocery stores", 
                      "Coffee shops", 
                      "Restaurants",
                      "Bakeries"
                    ].map((option) => (
                      <div key={option} className="flex items-center space-x-3">
                        <Checkbox
                          id={option}
                          checked={quizData.priorities.includes(option)}
                          onCheckedChange={(checked) => handlePrioritiesChange(option, checked as boolean)}
                          disabled={!quizData.priorities.includes(option) && quizData.priorities.length >= 8}
                          className="min-h-[20px] min-w-[20px]"
                        />
                        <Label htmlFor={option} className="text-sm cursor-pointer flex-1">{option}</Label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Health & Wellness Group */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-foreground border-b border-border pb-2">⚕️ Health & Wellness</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 ml-4">
                    {[
                      "Medical care", 
                      "Pharmacies",
                      "Fitness options", 
                      "Veterinary care", 
                      "Mental health services"
                    ].map((option) => (
                      <div key={option} className="flex items-center space-x-3">
                        <Checkbox
                          id={option}
                          checked={quizData.priorities.includes(option)}
                          onCheckedChange={(checked) => handlePrioritiesChange(option, checked as boolean)}
                          disabled={!quizData.priorities.includes(option) && quizData.priorities.length >= 8}
                          className="min-h-[20px] min-w-[20px]"
                        />
                        <Label htmlFor={option} className="text-sm cursor-pointer flex-1">{option}</Label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Services & Essentials Group */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-foreground border-b border-border pb-2">🏛️ Services & Essentials</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 ml-4">
                    {[
                      "DMV / Government services", 
                      "Public transit / commute info", 
                      "Hardware stores", 
                      "Banking / Financial"
                    ].map((option) => (
                      <div key={option} className="flex items-center space-x-3">
                        <Checkbox
                          id={option}
                          checked={quizData.priorities.includes(option)}
                          onCheckedChange={(checked) => handlePrioritiesChange(option, checked as boolean)}
                          disabled={!quizData.priorities.includes(option) && quizData.priorities.length >= 8}
                          className="min-h-[20px] min-w-[20px]"
                        />
                        <Label htmlFor={option} className="text-sm cursor-pointer flex-1">{option}</Label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recreation & Community Group */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-foreground border-b border-border pb-2">🎯 Recreation & Community</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 ml-4">
                    {[
                      "Parks / Trails", 
                      "Faith communities", 
                      "Social events / community groups", 
                      "Libraries / Education"
                    ].map((option) => (
                      <div key={option} className="flex items-center space-x-3">
                        <Checkbox
                          id={option}
                          checked={quizData.priorities.includes(option)}
                          onCheckedChange={(checked) => handlePrioritiesChange(option, checked as boolean)}
                          disabled={!quizData.priorities.includes(option) && quizData.priorities.length >= 8}
                          className="min-h-[20px] min-w-[20px]"
                        />
                        <Label htmlFor={option} className="text-sm cursor-pointer flex-1">{option}</Label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Question 4: Transportation Style */}
            {currentQuestion === 4 && (
              <RadioGroup value={quizData.transportation} onValueChange={(value) => setQuizData({...quizData, transportation: value})}>
                {["Car", "Public transit", "Bike / walk", "Rideshare only"].map((option) => (
                  <div key={option} className="flex items-center space-x-3 py-1.5">
                    <RadioGroupItem value={option} id={option} className="min-h-[24px] min-w-[24px]" />
                    <Label htmlFor={option} className="text-base cursor-pointer flex-1">{option}</Label>
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
                   <div key={option} className="flex items-center space-x-3 py-1.5">
                     <RadioGroupItem value={option} id={option} className="min-h-[24px] min-w-[24px]" />
                     <Label htmlFor={option} className="text-base cursor-pointer flex-1">{option}</Label>
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
                   <div key={option} className="flex items-center space-x-3 py-1.5">
                     <RadioGroupItem value={option} id={option} className="min-h-[24px] min-w-[24px]" />
                     <Label htmlFor={option} className="text-base cursor-pointer flex-1">{option}</Label>
                   </div>
                ))}
              </RadioGroup>
            )}



            {/* Navigation Buttons */}
            <div className="flex justify-between pt-8 gap-4">
              <Button
                variant="outline"
                size="mobile"
                onClick={handlePrevious}
                disabled={currentQuestion === 0}
                className="min-w-[120px]"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Previous
              </Button>
              
              <Button
                onClick={handleNext}
                disabled={!canProceed()}
                variant={currentQuestion === totalQuestions ? "hero" : "default"}
                size="mobile"
                className="min-w-[120px]"
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