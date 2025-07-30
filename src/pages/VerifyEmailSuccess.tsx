import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function VerifyEmailSuccess() {
  const navigate = useNavigate();
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    const checkSessionAndRedirect = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          setIsRedirecting(true);
          toast.success('Email verified successfully!');
          
          // Enhanced mobile quiz data transfer on verification success
          const storedQuizData = localStorage.getItem('onboardingQuizData') || sessionStorage.getItem('onboardingQuizData');
          
          if (storedQuizData) {
            console.log('VerifyEmailSuccess: Found quiz data, processing...');
            
            try {
              const quizData = JSON.parse(storedQuizData);
              
              if (quizData.address && quizData.priorities && quizData.priorities.length > 0) {
                // Transfer quiz data to profile with retry logic
                let attempts = 0;
                let success = false;
                
                while (attempts < 3 && !success) {
                  attempts++;
                  
                  try {
                    const { error: profileError } = await supabase
                      .from('profiles')
                      .upsert({
                        user_id: session.user.id,
                        address: quizData.address,
                        priorities: quizData.priorities,
                        priority_preferences: {},
                        household_type: quizData.household,
                        transportation_style: quizData.transportation,
                        budget_preference: quizData.budgetRange,
                        life_stage: quizData.movingTimeline,
                        settling_tasks: quizData.settlingTasks || [],
                        latitude: quizData.latitude,
                        longitude: quizData.longitude,
                        display_name: session.user.user_metadata?.display_name || 'User',
                        updated_at: new Date().toISOString()
                      }, {
                        onConflict: 'user_id'
                      });

                    if (!profileError) {
                      console.log('VerifyEmailSuccess: Profile saved successfully');
                      success = true;
                      
                      // Generate recommendations
                      await supabase.functions.invoke('generate-recommendations', {
                        body: { 
                          quizResponse: {
                            address: quizData.address,
                            householdType: quizData.household,
                            priorities: quizData.priorities,
                            priorityPreferences: {},
                            transportationStyle: quizData.transportation,
                            budgetPreference: quizData.budgetRange,
                            lifeStage: quizData.movingTimeline,
                            settlingTasks: quizData.settlingTasks || [],
                            latitude: quizData.latitude,
                            longitude: quizData.longitude
                          },
                          userId: session.user.id
                        }
                      });
                      
                      // Clear quiz data only after successful save
                      localStorage.removeItem('onboardingQuizData');
                      sessionStorage.removeItem('onboardingQuizData');
                      
                    } else {
                      console.error(`VerifyEmailSuccess: Profile save attempt ${attempts} failed:`, profileError);
                      if (attempts < 3) {
                        await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
                      }
                    }
                  } catch (error) {
                    console.error(`VerifyEmailSuccess: Attempt ${attempts} error:`, error);
                  }
                }
                
                if (!success) {
                  // Store in user metadata as backup
                  await supabase.auth.updateUser({
                    data: { quizData: quizData }
                  });
                  console.log('VerifyEmailSuccess: Quiz data stored in user metadata as backup');
                }
              }
            } catch (error) {
              console.error('VerifyEmailSuccess: Error processing quiz data:', error);
            }
          }
          
          // Check if user has profile data (indicating they've completed onboarding)
          const { data: profile } = await supabase
            .from('profiles')
            .select('priorities, address')
            .eq('user_id', session.user.id)
            .maybeSingle();

          setTimeout(() => {
            if (profile?.priorities && profile?.address) {
              navigate('/dashboard');
            } else {
              navigate('/onboarding');
            }
          }, 2000);
        }
      } catch (error) {
        console.error('Error checking session:', error);
      }
    };

    checkSessionAndRedirect();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <CardTitle className="text-2xl font-bold">Email Verified!</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">
            Your email has been successfully verified. Welcome to CalmlySettled!
          </p>
          
          {isRedirecting ? (
            <div className="flex items-center justify-center space-x-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm text-muted-foreground">Processing your data and redirecting...</span>
            </div>
          ) : (
            <Button 
              onClick={() => navigate('/dashboard')} 
              className="w-full"
            >
              Continue to Dashboard
            </Button>
          )}

          <p className="text-xs text-muted-foreground mt-4">
            CalmlySettled - Find Your Perfect Community
          </p>
        </CardContent>
      </Card>
    </div>
  );
}