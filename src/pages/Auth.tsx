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

// Enhanced quiz data transfer function with mobile-specific handling
const transferQuizDataToProfile = async (session: any) => {
  const storedQuizData = localStorage.getItem('onboardingQuizData');
  const sessionStorageData = sessionStorage.getItem('onboardingQuizData');
  const quizDataSource = storedQuizData || sessionStorageData;
  
  console.log('Mobile Debug: Checking for quiz data in storage:', !!quizDataSource);
  
  if (!quizDataSource) return false;

  try {
    const quizData = JSON.parse(quizDataSource);
    console.log('Mobile Debug: Parsed quiz data:', quizData);
    
    if (quizData.address && quizData.priorities && quizData.priorities.length > 0) {
      console.log('Mobile Debug: Valid quiz data found, saving to profile...');
      
      // Mobile-specific: Enhanced delay with retry logic
      const userAgent = navigator.userAgent || navigator.vendor;
      const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
      
      if (isMobile) {
        console.log('Mobile Debug: Adding enhanced auth delay for mobile device');
        await new Promise(resolve => setTimeout(resolve, 2000)); // Increased delay
      }
      
      // Store in multiple locations for recovery
      if (!sessionStorageData) {
        sessionStorage.setItem('onboardingQuizData', quizDataSource);
      }
      
      // Enhanced retry logic for profile creation
      let attempts = 0;
      const maxAttempts = 3;
      let profileSuccess = false;
      
      while (attempts < maxAttempts && !profileSuccess) {
        attempts++;
        console.log(`Mobile Debug: Profile save attempt ${attempts}/${maxAttempts}`);
        
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
                      budget_preference: quizData.budgetRange || quizData.lifestyle, // Handle both field names
                      life_stage: quizData.movingTimeline || quizData.lifeStage, // Handle both field names
                      settling_tasks: quizData.settlingTasks || [],
                      latitude: quizData.latitude,
                      longitude: quizData.longitude,
                      display_name: session.user.user_metadata?.display_name || 'User',
                      updated_at: new Date().toISOString()
            }, {
              onConflict: 'user_id'
            });

          if (!profileError) {
            console.log('Mobile Debug: Profile saved successfully');
            profileSuccess = true;
          } else {
            console.error(`Mobile Debug: Profile save attempt ${attempts} failed:`, profileError);
            if (attempts < maxAttempts) {
              await new Promise(resolve => setTimeout(resolve, 1000 * attempts)); // Progressive delay
            }
          }
        } catch (error) {
          console.error(`Mobile Debug: Profile save attempt ${attempts} error:`, error);
          if (attempts === maxAttempts) {
            // Final fallback: store in user metadata
            await supabase.auth.updateUser({
              data: { quizData: quizData }
            });
            console.log('Mobile Debug: Quiz data stored in user metadata as final backup');
          }
        }
      }
      
      // Generate recommendations with enhanced error handling
      try {
        console.log('Mobile Debug: Generating recommendations...');
        const { error: recError } = await supabase.functions.invoke('generate-recommendations', {
          body: { 
            quizResponse: {
              address: quizData.address,
              householdType: quizData.household,
                        priorities: quizData.priorities,
                        priorityPreferences: {},
                        transportationStyle: quizData.transportation,
                        budgetPreference: quizData.budgetRange || quizData.lifestyle, // Handle both field names
                        lifeStage: quizData.movingTimeline || quizData.lifeStage, // Handle both field names
                        settlingTasks: quizData.settlingTasks || [],
                        latitude: quizData.latitude,
                        longitude: quizData.longitude
            },
            userId: session.user.id
          }
        });
        
        if (recError) {
          console.error('Mobile Debug: Error generating recommendations:', recError);
        } else {
          console.log('Mobile Debug: Recommendations generated successfully');
        }
      } catch (recError) {
        console.error('Mobile Debug: Error calling generate-recommendations function:', recError);
      }
      
      // Only clear storage after successful profile save
      if (profileSuccess) {
        localStorage.removeItem('onboardingQuizData');
        sessionStorage.removeItem('onboardingQuizData');
        console.log('Mobile Debug: Quiz data cleared from storage');
      } else {
        console.log('Mobile Debug: Keeping quiz data in storage due to failed saves');
      }
      
      return profileSuccess;
    }
  } catch (error) {
    console.error('Mobile Debug: Error parsing stored quiz data:', error);
  }
  
  return false;
};

// Enhanced profile check function
const checkUserProfileExists = async (userId: string) => {
  try {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('address, priorities')
      .eq('user_id', userId)
      .maybeSingle();
    
    console.log('Mobile Debug: Profile check result:', profile, 'Error:', profileError);
    
    return profile?.address && profile?.priorities && profile?.priorities.length > 0;
  } catch (error) {
    console.error('Mobile Debug: Error checking profile:', error);
    return false;
  }
};

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
          console.log('Mobile Debug: Auth state change - session found');
          
          // Enhanced mobile quiz data transfer with multiple recovery points
          await transferQuizDataToProfile(session);
          
          // Check if user has completed onboarding in Supabase
          const hasProfileData = await checkUserProfileExists(session.user.id);
          
          if (hasProfileData) {
            console.log('Mobile Debug: User has profile data, navigating to dashboard');
            navigate("/dashboard");
          } else {
            console.log('Mobile Debug: User has no profile data, navigating to onboarding');
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
          ? `${window.location.origin}/verify-email`
          : `${window.location.origin}/verify-email`;
        
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
        ? `${window.location.origin}/verify-email`
        : `${window.location.origin}/verify-email`;
      
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