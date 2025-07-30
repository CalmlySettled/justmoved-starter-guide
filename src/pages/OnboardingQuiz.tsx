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

// Declare gtag function for Google Ads conversion tracking
declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
  }
}

const gtag = window.gtag;

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
  priorityPreferences: Record<string, string[]>;
  transportation: string;
  lifestyle: string;
  lifeStage: string;
  tasks: string[];
}

const initialData: QuizData = {
  address: "",
  household: [],
  priorities: [],
  priorityPreferences: {},
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

  const totalQuestions = 7;

  // Get background image for current question
  const getBackgroundImage = (questionNum: number) => {
    switch (questionNum) {
      case 1: // Address - neighborhood/cityscape
        return "/lovable-uploads/da2a2bcf-7c5a-4b95-bc28-3b8bd337cc1c.png";
      case 2: // Household - cozy home
        return "/lovable-uploads/03da8b85-f799-4bcc-9d63-c91a0b6663a3.png";
      case 3: // Priorities - vibrant community
        return "https://images.unsplash.com/photo-1523712999610-f77fbcfc3843?w=1200&h=800&fit=crop";
      case 4: // Customize - personalization
        return "https://images.unsplash.com/photo-1556155092-490a1ba16284?w=1200&h=800&fit=crop";
      case 5: // Transportation - urban movement
        return "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=1200&h=800&fit=crop";
      case 6: // Lifestyle - relaxed scene
        return "https://images.unsplash.com/photo-1500375592092-40eb2168fd21?w=1200&h=800&fit=crop";
      case 7: // Life stage - starry aspirational
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

  // Define sub-preferences for each main category
  const subPreferenceOptions: Record<string, string[]> = {
    "Grocery stores": ["Organic options", "Budget-friendly", "International foods", "24/7 availability", "Local produce"],
    "Medical care": ["Pediatrician", "OBGYN", "Family physician", "Urgent care", "Dental care", "Mental health"],
    "Pharmacy": ["24/7 availability", "Insurance accepted", "Drive-thru", "Compounding", "Vaccinations", "Health screenings"],
    "Fitness options": ["Gym/weightlifting", "Yoga/pilates", "Swimming", "Group classes", "Outdoor activities"],
    "DMV / Government services": ["DMV office", "Post office", "Library", "City hall", "Voting locations"],
    "Parks": ["Playgrounds", "Dog parks", "Sports fields", "Walking trails", "Picnic areas"],
    "Faith communities": ["Non-denominational", "Catholic", "Jewish", "Muslim", "Buddhist", "Hindu"],
    "Public transit / commute info": ["Bus routes", "Train stations", "Bike lanes", "Park & ride", "Commuter lots"],
    "Green space / trails": ["Hiking trails", "Bike paths", "Nature preserves", "Scenic walks", "Bird watching"],
    "Restaurants / coffee shops": ["Family-friendly", "Date night spots", "Quick casual", "Coffee shops", "Food trucks"],
    "Social events or community groups": ["Family activities", "Young professionals", "Hobby groups", "Sports leagues", "Volunteer opportunities"]
  };

  const handleSubPreferenceChange = (category: string, preference: string, checked: boolean) => {
    const currentPrefs = quizData.priorityPreferences[category] || [];
    let newPrefs;
    
    if (checked) {
      newPrefs = [...currentPrefs, preference];
    } else {
      newPrefs = currentPrefs.filter(p => p !== preference);
    }
    
    setQuizData({
      ...quizData,
      priorityPreferences: {
        ...quizData.priorityPreferences,
        [category]: newPrefs
      }
    });
  };

  const canProceed = () => {
    switch (currentQuestion) {
      case 1: return quizData.address.trim() !== "" && validAddressSelected;
      case 2: return quizData.household.length > 0;
      case 3: return quizData.priorities.length > 0;
      case 4: return true; // Optional customization step
      case 5: return quizData.transportation !== "";
      case 6: return quizData.lifestyle !== "";
      case 7: return quizData.lifeStage !== "";
      default: return false;
    }
  };

  const handleComplete = async () => {
    setLoading(true);
    
    try {
      console.log('Quiz completion: Starting - ALWAYS redirecting to signup');
      
      // ALWAYS redirect to signup after quiz completion - no exceptions
      // This is the most reliable way to ensure mobile users get prompted to sign up
      
      const coordinates = await getCoordinatesFromAddress(quizData.address);
      
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
      
      toast({
        title: "Quiz Complete!",
        description: "Please sign up to save your preferences and get personalized recommendations.",
      });
      
      console.log('Quiz completion: Navigating to /auth');
      navigate("/auth");
      
    } catch (error) {
      console.error('Mobile Debug: Error in handleComplete:', error);
      
      // Always fall back to unauthenticated flow on any error
      try {
        console.log('Mobile Debug: Falling back to unauthenticated flow due to error...');
        
        const coordinates = await getCoordinatesFromAddress(quizData.address);
        
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
        
        toast({
          title: "Quiz Complete!",
          description: "Please sign up to save your preferences and get personalized recommendations.",
        });
        
        navigate("/auth");
      } catch (fallbackError) {
        console.error('Mobile Debug: Even fallback failed:', fallbackError);
        toast({
          title: "Error",
          description: "Something went wrong. Please try again.",
          variant: "destructive"
        });
      }
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
                // Save quiz data to localStorage
                const coordinates = null; // Will be calculated during signup
                const quizDataForStorage = {
                  address: quizData.address,
                  priorities: quizData.priorities,
                  household: quizData.household.join(', '),
                  transportation: quizData.transportation,
                  budgetRange: quizData.lifestyle,
                  movingTimeline: quizData.lifeStage,
                  settlingTasks: quizData.tasks,
                  latitude: coordinates,
                  longitude: coordinates
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
              {currentQuestion === 2 && "Who do you live with?"}
              {currentQuestion === 3 && "What are the most important things you're looking for right now?"}
              {currentQuestion === 4 && "Let's personalize your selections"}
              {currentQuestion === 5 && "How do you typically get around?"}
              {currentQuestion === 6 && "Which best describes your vibe?"}
              {currentQuestion === 7 && "Which stage of life best fits you right now?"}
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
                onValidAddressSelected={setValidAddressSelected}
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
                    { option: "Partner/spouse", image: "/lovable-uploads/ea53ace5-f492-4dc9-8921-4fcfc81ef61d.png" },
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

            {/* Question 3: Daily Life Priorities */}
            {currentQuestion === 3 && (
              <div className="space-y-4">
                <div className="text-sm text-muted-foreground mb-4">
                  Selected: {quizData.priorities.length}/5
                </div>
                {[
                  "Grocery stores",
                  "Medical care",
                  "Pharmacy", 
                  "DMV / Government services",
                  "Public transit / commute info",
                  "Restaurants / coffee shops",
                  "Fitness options",
                  "Parks",
                  "Faith communities",
                  "Green space / trails",
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

            {/* Question 4: Customize Selections */}
            {currentQuestion === 4 && (
              <div className="space-y-6">
                {quizData.priorities.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">
                      No categories selected yet. Go back to select your priorities first.
                    </p>
                  </div>
                ) : (
                  <>
                    <p className="text-muted-foreground text-center mb-6">
                      Customize your selected categories to get more relevant recommendations. This step is optional - skip if you prefer general results.
                    </p>
                    {quizData.priorities.map((category) => (
                      <Card key={category} className="p-4 bg-background/50 border border-primary/20">
                        <h3 className="font-semibold text-lg mb-3 text-primary">{category}</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {subPreferenceOptions[category]?.map((preference) => (
                            <div key={preference} className="flex items-center space-x-2">
                              <Checkbox
                                id={`${category}-${preference}`}
                                checked={(quizData.priorityPreferences[category] || []).includes(preference)}
                                onCheckedChange={(checked) => handleSubPreferenceChange(category, preference, checked as boolean)}
                              />
                              <Label 
                                htmlFor={`${category}-${preference}`} 
                                className="text-sm font-medium cursor-pointer"
                              >
                                {preference}
                              </Label>
                            </div>
                          )) || (
                            <p className="text-muted-foreground text-sm">No specific options available for this category.</p>
                          )}
                        </div>
                        {(quizData.priorityPreferences[category]?.length || 0) > 0 && (
                          <div className="mt-3 text-xs text-muted-foreground">
                            {quizData.priorityPreferences[category]?.length} preferences selected
                          </div>
                        )}
                      </Card>
                    ))}
                  </>
                )}
              </div>
            )}

            {/* Question 5: Transportation Style */}
            {currentQuestion === 5 && (
              <RadioGroup value={quizData.transportation} onValueChange={(value) => setQuizData({...quizData, transportation: value})}>
                {["Car", "Public transit", "Bike / walk", "Rideshare only"].map((option) => (
                  <div key={option} className="flex items-center space-x-2">
                    <RadioGroupItem value={option} id={option} />
                    <Label htmlFor={option} className="text-base">{option}</Label>
                  </div>
                ))}
              </RadioGroup>
            )}

            {/* Question 6: Budget/Lifestyle Preference */}
            {currentQuestion === 6 && (
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

            {/* Question 7: Stage of Life */}
            {currentQuestion === 7 && (
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