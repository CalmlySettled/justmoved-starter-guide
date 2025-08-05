import { toast } from "@/utils/notificationRemover";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Home, Mail, Eye, EyeOff } from "lucide-react";
import { sanitizeInput, displayNameSchema, emailSchema, passwordSchema, logSecurityEvent } from "@/lib/security";
import { Separator } from "@/components/ui/separator";


export default function Auth() {
  const [isSignUp, setIsSignUp] = useState(false); // Default to sign in, not sign up
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [isResetPassword, setIsResetPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showResendButton, setShowResendButton] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resetTokens, setResetTokens] = useState<{accessToken: string, refreshToken: string} | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);
  
  const navigate = useNavigate();

  // Helper function to clear quiz data from localStorage
  const clearQuizData = () => {
    console.log('🟡 AUTH - Clearing quiz data from localStorage');
    localStorage.removeItem('onboardingQuizData');
    localStorage.removeItem('onboardingQuizDataBackup');
    localStorage.removeItem('quizCompleted');
    localStorage.removeItem('pendingQuizProcessing');
    localStorage.removeItem('quizDataSource');
  };

  // Helper function to process quiz data after authentication
  const processQuizDataAfterAuth = async (userId: string, quizData: any) => {
    console.log('🟡 AUTH - Processing quiz data after auth for user:', userId);
    
    try {
      // Get coordinates for address if not already available
      let coordinates = { lat: quizData.latitude, lng: quizData.longitude };
      
      if (!coordinates.lat && quizData.address) {
        console.log('🟡 AUTH - Getting coordinates for address:', quizData.address);
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(quizData.address)}&limit=1`, {
          headers: { 'User-Agent': 'CalmlySettled/1.0' }
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data && data.length > 0) {
            coordinates = {
              lat: parseFloat(data[0].lat),
              lng: parseFloat(data[0].lon)
            };
          }
        }
      }

      // Save profile data
      const profileData = {
        user_id: userId,
        address: String(quizData.address || ''),
        household_type: String(quizData.household || 'Not specified'),
        priorities: Array.isArray(quizData.priorities) ? quizData.priorities : [],
        priority_preferences: {},
        transportation_style: String(quizData.transportation || 'Flexible'),
        budget_preference: String(quizData.budgetRange || 'Moderate'),
        life_stage: String(quizData.movingTimeline || 'Getting settled'),
        settling_tasks: Array.isArray(quizData.settlingTasks) ? quizData.settlingTasks : [],
        latitude: coordinates?.lat || null,
        longitude: coordinates?.lng || null,
        updated_at: new Date().toISOString(),
      };

      console.log('🟡 AUTH - Saving profile data:', profileData);
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert(profileData, { onConflict: 'user_id' });

      if (profileError) {
        console.error('🔴 AUTH - Profile save error:', profileError);
        throw profileError;
      }

      // Generate recommendations
      const quizResponse = {
        address: quizData.address,
        householdType: quizData.household,
        priorities: quizData.priorities,
        transportationStyle: quizData.transportation || 'Flexible',
        budgetPreference: quizData.budgetRange || 'Moderate',
        lifeStage: quizData.movingTimeline || 'Getting settled',
        settlingTasks: quizData.settlingTasks || [],
        latitude: coordinates?.lat || null,
        longitude: coordinates?.lng || null
      };

      console.log('🟡 AUTH - Generating recommendations:', quizResponse);
      const { error: generateError } = await supabase.functions.invoke('generate-recommendations', {
        body: { quizResponse, userId }
      });

      if (generateError) {
        console.error('🔴 AUTH - Recommendations generation error:', generateError);
      } else {
        console.log('🟢 AUTH - Recommendations generated successfully');
        
        // Clear quiz data after successful processing
        clearQuizData();
        
        toast({
          title: "Welcome! Your recommendations are ready",
          description: "We've generated personalized recommendations based on your quiz responses.",
        });
      }
    } catch (error) {
      console.error('🔴 AUTH - Error processing quiz data:', error);
      
      toast({
        title: "Profile Processing",
        description: "Your profile was saved but there was an issue generating recommendations. Please refresh your dashboard.",
        variant: "destructive"
      });
    }
  };

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
          console.log('🟡 AUTH - Session detected, checking for quiz data...');
          
          // Check if there's completed quiz data in localStorage (user took quiz before signup)
          const storedQuizData = localStorage.getItem('onboardingQuizData');
          const quizCompleted = localStorage.getItem('quizCompleted');
          const backupQuizData = localStorage.getItem('onboardingQuizDataBackup');
          
          console.log('🟡 AUTH - Quiz data check:', { 
            hasStoredQuizData: !!storedQuizData, 
            quizCompleted,
            hasBackupData: !!backupQuizData
          });
          
          // Try to recover quiz data if available (primary or backup)
          const quizDataToProcess = storedQuizData || backupQuizData;
          
          if (quizDataToProcess && quizCompleted) {
            try {
              const quizData = JSON.parse(quizDataToProcess);
              console.log('🟡 AUTH - Parsed quiz data:', quizData);
              
              // Validate quiz data has required fields
              const isValidQuizData = quizData.address && 
                                   quizData.priorities && 
                                   Array.isArray(quizData.priorities) && 
                                   quizData.priorities.length > 0;
              
              if (isValidQuizData) {
                console.log('🟢 AUTH - Valid quiz data found, processing after auth...');
                
                // Set processing flags for dashboard to handle
                localStorage.setItem('pendingQuizProcessing', 'true');
                localStorage.setItem('quizDataSource', storedQuizData ? 'primary' : 'backup');
                
                // Process quiz data immediately to avoid race conditions
                setTimeout(async () => {
                  await processQuizDataAfterAuth(session.user.id, quizData);
                }, 1000);
                
                navigate("/dashboard");
                return;
              } else {
                console.log('🔴 AUTH - Invalid quiz data structure, clearing localStorage');
                clearQuizData();
              }
            } catch (error) {
              console.error('🔴 AUTH - Error parsing quiz data:', error);
              clearQuizData();
            }
          }
          
          // Check if user has completed onboarding in Supabase
          console.log('Mobile Debug: Checking if user has profile data...');
          try {
            const { data: profile, error: profileError } = await supabase
              .from('profiles')
              .select('address, priorities')
              .eq('user_id', session.user.id)
              .maybeSingle();
            
            console.log('Mobile Debug: Profile data:', profile, 'Error:', profileError);
            
            // If they have profile data, go to dashboard, otherwise onboarding
            if (profile?.address && profile?.priorities && profile?.priorities.length > 0) {
              console.log('Mobile Debug: User has profile data, navigating to dashboard');
              navigate("/dashboard");
            } else {
              console.log('Mobile Debug: User has no profile data, navigating to onboarding');
              navigate("/onboarding");
            }
          } catch (error) {
            console.error('Mobile Debug: Error checking profile:', error);
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

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast({
        title: "Email required",
        description: "Please enter your email address.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive"
        });
      } else {
        toast({
          title: "Reset email sent!",
          description: "Check your email for a password reset link.",
        });
        setIsForgotPassword(false);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send reset email. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!resetTokens) {
      toast({
        title: "Error",
        description: "Reset session expired. Please request a new password reset link.",
        variant: "destructive"
      });
      return;
    }
    
    if (!password || !confirmPassword) {
      toast({
        title: "Missing fields",
        description: "Please fill in both password fields.",
        variant: "destructive"
      });
      return;
    }
    
    if (password !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure both passwords are the same.",
        variant: "destructive"
      });
      return;
    }
    
    // Validate password strength
    try {
      passwordSchema.parse(password);
    } catch (validationError: any) {
      toast({
        title: "Invalid password",
        description: validationError.errors?.[0]?.message || "Please choose a stronger password",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // First, set the session with the stored tokens
      console.log('Setting session with stored tokens for password reset');
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: resetTokens.accessToken,
        refresh_token: resetTokens.refreshToken
      });

      if (sessionError) {
        console.error('Failed to set session:', sessionError);
        toast({
          title: "Error",
          description: "Reset session expired. Please request a new password reset link.",
          variant: "destructive"
        });
        return;
      }

      // Now update the password
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive"
        });
      } else {
        toast({
          title: "Password updated!",
          description: "Your password has been successfully changed. You're now signed in."
        });
        
        // Clear the reset tokens and state
        setResetTokens(null);
        setIsResetPassword(false);
        
        // Navigate to dashboard
        navigate("/dashboard");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update password. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      // Check if user has quiz data to preserve it through OAuth flow
      const hasQuizData = localStorage.getItem('onboardingQuizData') || localStorage.getItem('quizCompleted');
      
      console.log('🟡 AUTH - Google OAuth initiated, has quiz data:', !!hasQuizData);
      
      // Always redirect to dashboard - quiz processing will happen there
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard`
        }
      });

      if (error) {
        await logSecurityEvent('Google OAuth failed', { error: error.message });
        toast({
          title: "Sign in failed",
          description: error.message,
          variant: "destructive"
        });
      }
    } catch (error) {
      await logSecurityEvent('Google OAuth error', { error: String(error) });
      toast({
        title: "An error occurred",
        description: "Please try again later.",
        variant: "destructive"
      });
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <button 
            onClick={() => navigate("/")}
            className="inline-flex items-center space-x-2 mb-4 hover:opacity-80 transition-smooth cursor-pointer"
          >
            <div className="w-12 h-12 rounded-lg bg-gradient-hero flex items-center justify-center shadow-soft">
              <Home className="h-7 w-7 text-white" />
            </div>
            <span className="text-3xl font-bold text-foreground">CalmlySettled</span>
          </button>
          <p className="text-muted-foreground">Welcome to your neighborhood guide</p>
        </div>

        <Card className="shadow-elegant border-border/50">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">
              {isResetPassword ? "Set New Password" : (isForgotPassword ? "Reset Password" : (isSignUp ? "Create Account" : "Welcome Back"))}
            </CardTitle>
            <CardDescription>
              {isResetPassword 
                ? "Enter your new password below"
                : (isForgotPassword 
                  ? "Enter your email to receive a password reset link"
                  : (isSignUp 
                    ? "Sign up to get personalized neighborhood recommendations" 
                    : "Sign in to access your personalized recommendations"
                  )
                )
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!isForgotPassword && !isResetPassword && (
              <>
                {/* Google OAuth Button */}
                <div className="space-y-4">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full flex items-center justify-center space-x-2 h-11"
                    onClick={handleGoogleSignIn}
                    disabled={googleLoading}
                  >
                    {googleLoading ? (
                      <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                    )}
                    <span>Continue with Google</span>
                  </Button>
                  
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <Separator className="w-full" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">Or</span>
                    </div>
                  </div>
                </div>
              </>
            )}
            
            {/* Email/Password Forms */}
            {isResetPassword ? (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">New Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={8}
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      minLength={8}
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                </div>
                
                <Button 
                  type="submit" 
                  size="mobile"
                  className="w-full" 
                  disabled={loading}
                >
                  {loading ? "Updating..." : "Update Password"}
                </Button>
              </form>
            ) : isForgotPassword ? (
              <form onSubmit={handleForgotPassword} className="space-y-4">
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
                
                <Button 
                  type="submit" 
                  size="mobile"
                  className="w-full" 
                  disabled={loading}
                >
                  {loading ? "Sending..." : "Send Reset Email"}
                </Button>
                
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => setIsForgotPassword(false)}
                    className="text-sm text-muted-foreground hover:text-foreground transition-smooth"
                  >
                    Back to sign in
                  </button>
                </div>
              </form>
            ) : (
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
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                </div>
                
                {!isSignUp && (
                  <div className="text-right">
                    <button
                      type="button"
                      onClick={() => setIsForgotPassword(true)}
                      className="text-sm text-muted-foreground hover:text-foreground transition-smooth"
                    >
                      Forgot password?
                    </button>
                  </div>
                )}
                
                <Button 
                  type="submit" 
                  size="mobile"
                  className="w-full" 
                  disabled={loading}
                >
                  {loading ? "Loading..." : (isSignUp ? "Create Account" : "Sign In")}
                </Button>
              </form>
            )}
            
            {showResendButton && isSignUp && !isForgotPassword && (
              <div className="mt-4">
                <Button 
                  variant="outline" 
                  size="mobile"
                  onClick={handleResendVerification}
                  disabled={resendLoading}
                  className="w-full"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  {resendLoading ? "Sending..." : "Resend Verification Email"}
                </Button>
              </div>
            )}
            
            {!isForgotPassword && !isResetPassword && (
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
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}