import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Home, Mail } from "lucide-react";
import { sanitizeInput, displayNameSchema, emailSchema, passwordSchema, logSecurityEvent } from "@/lib/security";

export default function Auth() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [showResendButton, setShowResendButton] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is already logged in
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate("/dashboard");
      }
    };
    checkUser();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change event:', event, 'Session:', !!session);
        
        if (session) {
          // Check if there's completed quiz data in localStorage (user took quiz before signup)
          const storedQuizData = localStorage.getItem('onboardingQuizData');
          console.log('Auth state change - checking for stored quiz data:', storedQuizData);
          
          if (storedQuizData) {
            try {
              const quizData = JSON.parse(storedQuizData);
              console.log('Parsed quiz data:', quizData);
              
              if (quizData.address && quizData.priorities && quizData.priorities.length > 0) {
                console.log('Valid quiz data found, saving to profile...');
                
                // Save quiz data to Supabase using upsert and correct column names
                const { error } = await supabase
                  .from('profiles')
                  .upsert({
                    user_id: session.user.id,
                    address: quizData.address,
                    priorities: quizData.priorities,
                    priority_preferences: quizData.priorityPreferences || {},
                    household_type: quizData.household,
                    transportation_style: quizData.transportation,
                    budget_preference: quizData.budgetRange,
                    life_stage: quizData.movingTimeline,
                    settling_tasks: quizData.settlingTasks || [],
                    latitude: quizData.latitude,
                    longitude: quizData.longitude
                  }, {
                    onConflict: 'user_id'
                  });
                
                if (error) {
                  console.error('Error saving quiz data to profile:', error);
                } else {
                  console.log('Quiz data saved successfully, generating recommendations...');
                  
                  // Generate recommendations immediately after profile is saved
                  try {
                    const { error: recError } = await supabase.functions.invoke('generate-recommendations', {
                      body: { 
                        quizResponse: {
                          address: quizData.address,
                          householdType: quizData.household,
                          priorities: quizData.priorities,
                          priorityPreferences: quizData.priorityPreferences || {},
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
                    
                    if (recError) {
                      console.error('Error generating recommendations:', recError);
                    } else {
                      console.log('Recommendations generated successfully');
                    }
                  } catch (recError) {
                    console.error('Error calling generate-recommendations function:', recError);
                  }
                  
                  localStorage.removeItem('onboardingQuizData');
                  navigate("/dashboard");
                  return; // Exit early - don't check profile again
                }
              }
            } catch (error) {
              console.error('Error parsing stored quiz data:', error);
            }
          }
          
          // Check if user has completed onboarding in Supabase
          console.log('Checking if user has profile data...');
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('address, priorities')
            .eq('user_id', session.user.id)
            .single();
          
          console.log('Profile data:', profile, 'Error:', profileError);
          
          // If they have profile data, go to dashboard, otherwise onboarding
          if (profile?.address && profile?.priorities?.length > 0) {
            console.log('User has profile data, navigating to dashboard');
            navigate("/dashboard");
          } else {
            console.log('User has no profile data, navigating to onboarding');
            navigate("/onboarding");
          }
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignUp) {
        // Validate and sanitize inputs
        if (!email || !password || !displayName) {
          toast({
            title: "Error",
            description: "Please fill in all fields",
            variant: "destructive",
          });
          return;
        }

        // Security validation
        try {
          emailSchema.parse(email);
          passwordSchema.parse(password);
          displayNameSchema.parse(displayName);
        } catch (validationError: any) {
          await logSecurityEvent('Invalid input attempt', {
            email: email.substring(0, 5) + '***',
            error: validationError.message
          });
          
          toast({
            title: "Invalid input",
            description: validationError.errors?.[0]?.message || "Please check your input",
            variant: "destructive",
          });
          return;
        }

        const sanitizedDisplayName = sanitizeInput(displayName);

        // Check if user has quiz data to determine redirect URL
        const hasQuizData = localStorage.getItem('onboardingQuizData');
        const redirectUrl = hasQuizData 
          ? `${window.location.origin}/dashboard`
          : `${window.location.origin}/`;
        
        const { data, error } = await supabase.auth.signUp({
          email: email.toLowerCase().trim(),
          password,
          options: {
            emailRedirectTo: redirectUrl,
            data: {
              display_name: sanitizedDisplayName
            }
          }
        });

        if (error) {
          if (error.message.includes("already registered")) {
            toast({
              title: "Account already exists",
              description: "An account with this email already exists. Try signing in instead.",
              variant: "destructive"
            });
          } else {
            await logSecurityEvent('Sign up failed', { error: error.message });
            toast({
              title: "Sign up failed",
              description: error.message,
              variant: "destructive"
            });
          }
        } else if (data.user && !data.session) {
          // User was created but needs email verification
          // Supabase will automatically trigger our custom webhook email
          toast({
            title: "Account created!",
            description: "Please check your email (including spam folder) for a verification link to complete your registration."
          });
          setShowResendButton(true);
        } else {
          // User was created and auto-confirmed
          toast({
            title: "Account created!",
            description: "Welcome! You're now signed in."
          });
        }
      } else {
        // Sign in validation
        try {
          emailSchema.parse(email);
        } catch (validationError: any) {
          toast({
            title: "Invalid email format",
            description: "Please enter a valid email address",
            variant: "destructive",
          });
          return;
        }

        const { error } = await supabase.auth.signInWithPassword({
          email: email.toLowerCase().trim(),
          password
        });

        if (error) {
          await logSecurityEvent('Sign in failed', { 
            email: email.substring(0, 5) + '***',
            error: error.message 
          });

          if (error.message.includes("Invalid login credentials")) {
            toast({
              title: "Invalid credentials",
              description: "Please check your email and password and try again.",
              variant: "destructive"
            });
          } else {
            toast({
              title: "Sign in failed",
              description: error.message,
              variant: "destructive"
            });
          }
        }
      }
    } catch (error) {
      await logSecurityEvent('Auth error', { error: String(error) });
      toast({
        title: "An error occurred",
        description: "Please try again later.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!email) {
      toast({
        title: "Email required",
        description: "Please enter your email address first.",
        variant: "destructive"
      });
      return;
    }

    setResendLoading(true);
    try {
      // Use Supabase's resend method - this will trigger our webhook to send custom email
      const hasQuizData = localStorage.getItem('onboardingQuizData');
      const redirectUrl = hasQuizData 
        ? `${window.location.origin}/dashboard`
        : `${window.location.origin}/`;
      
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
        options: {
          emailRedirectTo: redirectUrl
        }
      });

      if (error) {
        toast({
          title: "Failed to resend",
          description: error.message,
          variant: "destructive"
        });
      } else {
        toast({
          title: "Verification email sent!",
          description: "Please check your email (including spam folder) for the verification link."
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to resend verification email. Please try again.",
        variant: "destructive"
      });
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center space-x-2 mb-4">
            <div className="w-12 h-12 rounded-lg bg-gradient-hero flex items-center justify-center shadow-soft">
              <Home className="h-7 w-7 text-white" />
            </div>
            <span className="text-3xl font-bold text-foreground">CalmlySettled</span>
          </div>
          <p className="text-muted-foreground">Welcome to your neighborhood guide</p>
        </div>

        <Card className="shadow-elegant border-border/50">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">
              {isSignUp ? "Create Account" : "Welcome Back"}
            </CardTitle>
            <CardDescription>
              {isSignUp 
                ? "Sign up to get personalized neighborhood recommendations" 
                : "Sign in to access your personalized recommendations"
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAuth} className="space-y-4">
              {isSignUp && (
                <div className="space-y-2">
                  <Label htmlFor="displayName">Name</Label>
                  <Input
                    id="displayName"
                    type="text"
                    placeholder="Your name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    required={isSignUp}
                  />
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              
              <Button 
                type="submit" 
                className="w-full" 
                disabled={loading}
              >
                {loading ? "Loading..." : (isSignUp ? "Create Account" : "Sign In")}
              </Button>
            </form>
            
            {showResendButton && isSignUp && (
              <div className="mt-4">
                <Button 
                  variant="outline" 
                  onClick={handleResendVerification}
                  disabled={resendLoading}
                  className="w-full"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  {resendLoading ? "Sending..." : "Resend Verification Email"}
                </Button>
              </div>
            )}
            
            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setShowResendButton(false);
                }}
                className="text-sm text-muted-foreground hover:text-foreground transition-smooth"
              >
                {isSignUp 
                  ? "Already have an account? Sign in" 
                  : "Don't have an account? Sign up"
                }
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}