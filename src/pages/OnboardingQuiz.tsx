import { useState } from "react";
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

interface QuizData {
  zipCode: string;
  household: string[];
  priorities: string[];
  transportation: string;
  lifestyle: string;
  lifeStage: string;
  tasks: string[];
}

const initialData: QuizData = {
  zipCode: "",
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
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  const totalQuestions = 7;

  const handleNext = () => {
    if (currentQuestion < totalQuestions) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      setIsComplete(true);
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 1) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const handleZipCodeChange = (value: string) => {
    setQuizData({ ...quizData, zipCode: value });
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
      case 1: return quizData.zipCode.trim() !== "";
      case 2: return quizData.household.length > 0;
      case 3: return quizData.priorities.length > 0;
      case 4: return quizData.transportation !== "";
      case 5: return quizData.lifestyle !== "";
      case 6: return quizData.lifeStage !== "";
      case 7: return quizData.tasks.length > 0;
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
            zip_code: quizData.zipCode,
            household_type: quizData.household.join(', '),
            priorities: quizData.priorities,
            transportation_style: quizData.transportation,
            budget_preference: quizData.lifestyle,
            life_stage: quizData.lifeStage,
            settling_tasks: quizData.tasks
          });

        if (error) {
          console.error('Error saving profile:', error);
          toast({
            title: "Warning",
            description: "We couldn't save your preferences, but you can still see your recommendations.",
            variant: "destructive"
          });
        }
      }

      // Prepare data for recommendations
      const recommendationData = {
        zipCode: quizData.zipCode,
        householdType: quizData.household.join(', '),
        priorities: quizData.priorities,
        transportationStyle: quizData.transportation,
        budgetPreference: quizData.lifestyle,
        lifeStage: quizData.lifeStage,
        settlingTasks: quizData.tasks
      };

      // Navigate to recommendations with data
      navigate('/recommendations', { state: { quizResponse: recommendationData } });
      
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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 shadow-soft">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-hero flex items-center justify-center shadow-soft">
              <Home className="h-6 w-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-foreground">JustMoved</span>
          </Link>
          
          <div className="text-sm text-muted-foreground">
            Question {currentQuestion} of {totalQuestions}
          </div>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="max-w-4xl mx-auto px-6 py-4">
        <div className="w-full bg-muted rounded-full h-2">
          <div 
            className="bg-gradient-hero h-2 rounded-full transition-all duration-300"
            style={{ width: `${(currentQuestion / totalQuestions) * 100}%` }}
          />
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-6 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">
              {currentQuestion === 1 && "What's your new ZIP code or neighborhood?"}
              {currentQuestion === 2 && "Who did you move with?"}
              {currentQuestion === 3 && "What are the most important things you're looking for right now?"}
              {currentQuestion === 4 && "How do you typically get around?"}
              {currentQuestion === 5 && "Which best describes your vibe?"}
              {currentQuestion === 6 && "Which stage of life best fits you right now?"}
              {currentQuestion === 7 && "Which of these tasks do you still need help with?"}
            </CardTitle>
            {currentQuestion === 3 && (
              <p className="text-muted-foreground">Choose up to 5 options</p>
            )}
            {currentQuestion === 7 && (
              <p className="text-muted-foreground">Choose up to 3 options</p>
            )}
          </CardHeader>
          <CardContent className="space-y-6">
            
            {/* Question 1: ZIP Code */}
            {currentQuestion === 1 && (
              <div className="space-y-4">
                <Label htmlFor="zipcode">ZIP Code or Neighborhood Name</Label>
                <Input
                  id="zipcode"
                  placeholder="e.g., 90210 or Brooklyn Heights"
                  value={quizData.zipCode}
                  onChange={(e) => handleZipCodeChange(e.target.value)}
                  className="text-lg"
                />
              </div>
            )}

            {/* Question 2: Household Type */}
            {currentQuestion === 2 && (
              <div className="space-y-4">
                {["Just me", "Partner/spouse", "Kids", "Pets", "Other (multi-gen family, roommates, etc.)"].map((option) => (
                  <div key={option} className="flex items-center space-x-2">
                    <Checkbox
                      id={option}
                      checked={quizData.household.includes(option)}
                      onCheckedChange={(checked) => handleHouseholdChange(option, checked as boolean)}
                    />
                    <Label htmlFor={option} className="text-base">{option}</Label>
                  </div>
                ))}
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
                  "Medical care / pediatricians", 
                  "Fitness options",
                  "Childcare / schools",
                  "Faith communities",
                  "Public transit / commute info",
                  "Green space / trails",
                  "Safety",
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

            {/* Question 7: Top 3 Settling-In Tasks */}
            {currentQuestion === 7 && (
              <div className="space-y-4">
                <div className="text-sm text-muted-foreground mb-4">
                  Selected: {quizData.tasks.length}/3
                </div>
                {[
                  "Changing address / DMV",
                  "Finding a doctor or pediatrician",
                  "Setting up internet/utilities", 
                  "Registering to vote",
                  "Finding schools or daycare",
                  "Joining local events or meetups",
                  "Finding a trusted handyman or cleaner"
                ].map((option) => (
                  <div key={option} className="flex items-center space-x-2">
                    <Checkbox
                      id={option}
                      checked={quizData.tasks.includes(option)}
                      onCheckedChange={(checked) => handleTasksChange(option, checked as boolean)}
                      disabled={!quizData.tasks.includes(option) && quizData.tasks.length >= 3}
                    />
                    <Label htmlFor={option} className="text-base">{option}</Label>
                  </div>
                ))}
              </div>
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